"""
Auto-prueba (smoke test) del modulo de Machine Learning.

Verifica que TODO el flujo funcione al 100%:
  1. Genera el dataset
  2. Entrena el modelo y revisa que las metricas sean validas
  3. Predice un SKU y valida la estructura del resultado + los graficos
  4. Genera el reporte de inventario (deben existir los 3 estados posibles)
  5. Genera el analisis financiero (ingresos > costos > 0)

Devuelve codigo de salida 0 si todo pasa, 1 si algo falla.

Uso:
    python selftest.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from src import config, generate_dataset, train_model, predict, reports, financial_analysis

OK, FALLO = "[ OK ]", "[FALLA]"
errores = []


def check(cond: bool, msg: str):
    print(f"  {OK if cond else FALLO}  {msg}")
    if not cond:
        errores.append(msg)


def main():
    print("== 1. Dataset ==")
    generate_dataset.main()
    check(config.ARCHIVO_PRODUCTOS.exists(), "product.csv generado")
    check(config.ARCHIVO_FACT.exists(), "fact_sales_inventory.csv generado")

    print("\n== 2. Entrenamiento ==")
    df = train_model.cargar_datos()
    modelo, met = train_model.entrenar(df)
    modelo.save_model(config.ARCHIVO_MODELO)
    Path(config.ARCHIVO_METRICAS).write_text(
        json.dumps(met, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )
    check(config.ARCHIVO_MODELO.exists(), "modelo guardado")
    check(met["metric_mae"] > 0 and not math.isnan(met["metric_mae"]), f"MAE valido ({met['metric_mae']})")
    check(0 < met["metric_mape"] < 60, f"MAPE razonable ({met['metric_mape']}%)")

    print("\n== 3. Prediccion por SKU ==")
    diag = predict.analizar_producto("SKU-0006")
    campos = ["estado", "stock_actual", "demanda_diaria_prom", "punto_reorden",
              "cantidad_recomendada_pedir", "grafico_demanda", "grafico_stock"]
    check(all(k in diag for k in campos), "resultado contiene todos los campos clave")
    check(diag["estado"] in ("SOBRE STOCK", "DEFICIT", "OPTIMO"), f"estado valido ({diag['estado']})")
    check(Path(diag["grafico_demanda"]).exists(), "grafico de demanda creado")
    check(Path(diag["grafico_stock"]).exists(), "grafico de stock creado")
    # La curva de stock debe ARRANCAR en el stock actual de hoy (coherencia grafico/ficha)
    serie = json.loads(Path(diag["series_json"]).read_text(encoding="utf-8"))
    check(serie["stock_proyectado"][0]["valor"] == diag["stock_actual"],
          "la proyeccion de stock arranca en el stock actual")
    # La demanda proyectada (total) debe concordar con el promedio diario x horizonte
    esperado = diag["demanda_diaria_prom"] * config.HORIZONTE_PRONOSTICO
    check(abs(diag["demanda_total_horizonte"] - esperado) <= 1.0,
          "demanda total concuerda con (promedio diario x horizonte)")

    print("\n== 4. Reporte de inventario ==")
    rep = reports.generar()
    check(Path(rep["reporte_csv"]).exists(), "CSV de prediccion creado")
    n_prod = len(generate_dataset.PLANTILLAS)
    check(len(rep["tabla"]) == n_prod, f"{n_prod} productos en el reporte ({len(rep['tabla'])})")
    check(int(df["stock_final"].max()) <= config.STOCK_MAXIMO,
          f"stock nunca supera {config.STOCK_MAXIMO} (max={int(df['stock_final'].max())})")
    check(rep["n_sobre_stock"] >= 1, f"detecta sobre stock ({rep['n_sobre_stock']})")
    check(rep["n_deficit"] >= 1, f"detecta deficit ({rep['n_deficit']})")
    check(all(Path(g).exists() for g in rep["graficos"]), "graficos resumen creados")

    print("\n== 5. Analisis financiero ==")
    fin = financial_analysis.analizar()
    check(fin["ingreso_total"] > fin["costo_total"] > 0, "ingresos > costos > 0")
    check(0 < fin["margen_pct"] < 100, f"margen valido ({fin['margen_pct']}%)")
    check(Path(fin["reporte_csv"]).exists(), "CSV financiero creado")
    check(all(Path(g).exists() for g in fin["graficos"]), "graficos financieros creados")

    print("\n" + "=" * 50)
    if errores:
        print(f"RESULTADO: {len(errores)} prueba(s) fallaron.")
        for e in errores:
            print(f"  - {e}")
        sys.exit(1)
    print("RESULTADO: TODAS LAS PRUEBAS PASARON (100%).")
    sys.exit(0)


if __name__ == "__main__":
    main()
