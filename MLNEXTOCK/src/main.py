"""
Orquestador del modulo de Machine Learning NEXTOCK.

Comandos:
    python -m src.main pipeline           Ejecuta todo: dataset -> entrenar -> reportes -> finanzas
    python -m src.main dataset            Genera el dataset sintetico de prueba
    python -m src.main entrenar           Entrena el modelo XGBoost
    python -m src.main predecir SKU-0007  Pronostico + graficos de un producto
    python -m src.main reporte            Reporte de prediccion de inventario (todos)
    python -m src.main finanzas           Analisis financiero de todas las ventas
"""
from __future__ import annotations

import sys

from . import generate_dataset, train_model, reports, financial_analysis, predict


def pipeline():
    print("\n########## 1/4  DATASET ##########")
    generate_dataset.main()
    print("\n########## 2/4  ENTRENAMIENTO ##########")
    train_model.main()
    print("\n########## 3/4  REPORTE DE INVENTARIO ##########")
    reports.main()
    print("\n########## 4/4  ANALISIS FINANCIERO ##########")
    financial_analysis.main()
    print("\nPipeline completo. Revisa las carpetas outputs/graficos y outputs/reportes.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1].lower()
    if cmd == "pipeline":
        pipeline()
    elif cmd == "dataset":
        generate_dataset.main()
    elif cmd == "entrenar":
        train_model.main()
    elif cmd == "reporte":
        reports.main()
    elif cmd == "finanzas":
        financial_analysis.main()
    elif cmd == "predecir":
        if len(sys.argv) < 3:
            print("Indica el SKU. Ej: python -m src.main predecir SKU-0007")
            return
        predict._imprimir(predict.analizar_producto(sys.argv[2]))
    else:
        print(f"Comando desconocido: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
