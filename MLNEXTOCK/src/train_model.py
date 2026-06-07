"""
Entrenamiento del modelo XGBoost para el pronostico de demanda (HU-01).

Lee FACT_SALES_INVENTORY, separa entrenamiento/prueba respetando el orden
temporal, entrena un XGBRegressor y guarda:
  - el modelo entrenado (models/xgboost_demanda.json)
  - las metricas MAE / RMSE / MAPE (models/model_training.json) -> espejo de MODEL_TRAINING

Uso:
    python -m src.train_model
"""
from __future__ import annotations

import json
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

from . import config


def cargar_datos(store=None) -> pd.DataFrame:
    fact = config.rutas(store)["fact"]
    if not fact.exists():
        raise FileNotFoundError(
            f"No existe {fact}. Ejecuta primero: python -m src.generate_dataset"
        )
    df = pd.read_csv(fact, parse_dates=["record_date"])
    return df.sort_values(["record_date", "product_id"]).reset_index(drop=True)


def entrenar_tienda(store=None) -> dict:
    """Entrena y guarda el modelo de una tienda (o el global si store=None)."""
    r = config.rutas(store)
    df = cargar_datos(store)
    modelo, metricas = entrenar(df)
    modelo.save_model(r["modelo"])
    with open(r["metricas"], "w", encoding="utf-8") as fh:
        json.dump(metricas, fh, indent=2, ensure_ascii=False, default=str)
    return metricas


def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """MAPE robusto: ignora los casos con demanda real = 0."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = y_true > 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def entrenar(df: pd.DataFrame) -> tuple[XGBRegressor, dict]:
    X = df[config.COLUMNAS_FEATURES]
    y = df[config.COLUMNA_OBJETIVO]

    # Split temporal: 80% pasado para entrenar, 20% reciente para validar
    corte = int(len(df) * 0.80)
    X_tr, X_te = X.iloc[:corte], X.iloc[corte:]
    y_tr, y_te = y.iloc[:corte], y.iloc[corte:]

    modelo = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=3,
        objective="reg:squarederror",
        random_state=config.SEMILLA,
        n_jobs=-1,
    )
    modelo.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

    pred = np.clip(modelo.predict(X_te), 0, None)
    mae = mean_absolute_error(y_te, pred)
    rmse = float(np.sqrt(mean_squared_error(y_te, pred)))
    mape = _mape(y_te, pred)

    metricas = {
        "training_date": datetime.now().isoformat(timespec="seconds"),
        "algorithm_name": "XGBoost",
        "algorithm_version": "XGBRegressor",
        "target_variable": config.COLUMNA_OBJETIVO,
        "train_start_date": str(df["record_date"].min().date()),
        "train_end_date": str(df["record_date"].max().date()),
        "n_train": int(len(X_tr)),
        "n_test": int(len(X_te)),
        "metric_mae": round(mae, 4),
        "metric_rmse": round(rmse, 4),
        "metric_mape": round(mape, 4),
        "status": "COMPLETED",
        "parameters": modelo.get_params(),
        "feature_importance": dict(
            sorted(
                zip(config.COLUMNAS_FEATURES, [float(v) for v in modelo.feature_importances_]),
                key=lambda x: x[1],
                reverse=True,
            )
        ),
    }
    return modelo, metricas


def main():
    print("Entrenando modelo XGBoost de pronostico de demanda...")
    df = cargar_datos()
    modelo, metricas = entrenar(df)

    modelo.save_model(config.ARCHIVO_MODELO)
    with open(config.ARCHIVO_METRICAS, "w", encoding="utf-8") as fh:
        json.dump(metricas, fh, indent=2, ensure_ascii=False, default=str)

    print(f"  Modelo guardado en   : {config.ARCHIVO_MODELO}")
    print(f"  Metricas guardadas en: {config.ARCHIVO_METRICAS}")
    print("\n  --- Desempenio (conjunto de validacion) ---")
    print(f"  MAE  (error medio absoluto)  : {metricas['metric_mae']:.2f} unidades")
    print(f"  RMSE (error cuadratico medio): {metricas['metric_rmse']:.2f} unidades")
    print(f"  MAPE (error porcentual)      : {metricas['metric_mape']:.2f} %")
    print("\n  Variables mas influyentes:")
    for k, v in list(metricas["feature_importance"].items())[:5]:
        print(f"    - {k:<22}: {v:.3f}")
    print("Listo.")


if __name__ == "__main__":
    main()
