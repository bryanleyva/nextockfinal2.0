r"""
Microservicio HTTP (FastAPI) que expone el Machine Learning (XGBoost) ya
construido, para que el backend NestJS lo consuma.

NO cambia la logica del ML: solo envuelve las funciones existentes de
predict.py, reports.py, financial_analysis.py y train_model.py.

Arrancar:
    .\.venv\Scripts\python.exe -m uvicorn src.api:app --port 8000
o:
    .\.venv\Scripts\python.exe -m src.api
"""
from __future__ import annotations

import gc
import json
import math
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config, predict, reports, financial_analysis, train_model

app = FastAPI(title="NEXTOCK ML API", version="2.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)


def _py(obj):
    """Convierte tipos de numpy/pandas a tipos nativos JSON-serializables."""
    if isinstance(obj, dict):
        return {k: _py(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_py(v) for v in obj]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        v = float(obj)
        return None if not math.isfinite(v) else v   # NaN/inf -> null (JSON valido)
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, pd.Timestamp):
        return obj.strftime("%Y-%m-%d")
    if isinstance(obj, float) and pd.isna(obj):
        return None
    return obj


@app.get("/")
def raiz():
    return {"servicio": "NEXTOCK ML API", "estado": "ok"}


@app.get("/ml/predecir/{sku}")
def predecir(sku: str, store: str | None = None):
    """HU-01 / HU-09 / HU-11: pronostico + diagnostico de un producto."""
    try:
        diag = predict.analizar_producto(sku, store)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    diag.pop("pronostico", None)  # DataFrame interno, no se envia
    return _py(diag)


@app.get("/ml/series/{sku}")
def series(sku: str, store: str | None = None):
    """Series (historico + pronostico + stock) para graficos interactivos."""
    try:
        diag = predict.analizar_producto(sku, store)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    ruta = diag["series_json"]
    with open(ruta, "r", encoding="utf-8") as fh:
        return json.load(fh)


@app.get("/ml/reporte")
def reporte(store: str | None = None):
    """HU-09 / HU-11: reporte de prediccion de inventario (todos los productos)."""
    try:
        # Sin PNGs: la web dibuja graficos interactivos, y asi el reporte cabe
        # en la memoria del hosting gratuito.
        res = reports.generar(store, con_graficos=False)
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    salida = _py({
        "productos": res["tabla"].to_dict(orient="records"),
        "n_optimo": res["n_optimo"],
        "n_sobre_stock": res["n_sobre_stock"],
        "n_deficit": res["n_deficit"],
        "reporte_csv": res["reporte_csv"],
        "reporte_txt": res["reporte_txt"],
        "graficos": res["graficos"],
    })
    gc.collect()  # libera memoria tras el reporte
    return salida


@app.get("/ml/finanzas")
def finanzas(store: str | None = None):
    """HU-10: analisis financiero de todas las ventas."""
    try:
        return _py(financial_analysis.analizar(store))
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/ml/ranking")
def ranking(n: int = 10, store: str | None = None):
    """HU-18: ranking de productos mas vendidos (historico)."""
    r = config.rutas(store)
    if not r["productos"].exists() or not r["fact"].exists():
        raise HTTPException(status_code=409, detail="No hay datos para esta bodega.")
    prod = pd.read_csv(r["productos"])
    fact = pd.read_csv(r["fact"])
    vendidos = fact.groupby("product_id")["units_sold"].sum()
    prod = prod.set_index("product_id")
    prod["vendidos"] = vendidos
    top = prod.sort_values("vendidos", ascending=False).head(n).reset_index()
    return _py({
        "ranking": [
            {
                "sku": r.source_product_id,
                "nombre": r.product_name,
                "categoria": r.category,
                "unidades_vendidas": round(float(r.vendidos), 2),
            }
            for r in top.itertuples()
        ]
    })


@app.get("/ml/entrenar")
def entrenar(store: str | None = None):
    """HU-03 / HU-17: reentrenar el modelo XGBoost tras actualizar los datos."""
    try:
        met = train_model.entrenar_tienda(store)
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _py({
        "mensaje": "Modelo reentrenado",
        "mae": met["metric_mae"],
        "rmse": met["metric_rmse"],
        "mape": met["metric_mape"],
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api:app", host="0.0.0.0", port=8000, reload=False)
