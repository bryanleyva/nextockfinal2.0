"""
Empaqueta el dataset de prueba para descarga/distribucion.

Genera (a partir de los CSV en data/):
  - data/nextock_dataset_prueba.xlsx   (2 hojas: PRODUCT y FACT_SALES_INVENTORY)
  - data/nextock_dataset_prueba.zip    (los 2 CSV juntos)

Uso:
    python make_test_data.py
"""
from __future__ import annotations

import zipfile
import pandas as pd

from src import config


def main():
    prod = pd.read_csv(config.ARCHIVO_PRODUCTOS)
    fact = pd.read_csv(config.ARCHIVO_FACT)

    xlsx = config.DIR_DATOS / "nextock_dataset_prueba.xlsx"
    with pd.ExcelWriter(xlsx, engine="openpyxl") as xw:
        prod.to_excel(xw, sheet_name="PRODUCT", index=False)
        fact.to_excel(xw, sheet_name="FACT_SALES_INVENTORY", index=False)

    zpath = config.DIR_DATOS / "nextock_dataset_prueba.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(config.ARCHIVO_PRODUCTOS, "product.csv")
        zf.write(config.ARCHIVO_FACT, "fact_sales_inventory.csv")

    print("Dataset de prueba empaquetado:")
    print(f"  Excel: {xlsx}")
    print(f"  ZIP  : {zpath}")
    print(f"  Productos: {len(prod)}  |  Registros: {len(fact)}")


if __name__ == "__main__":
    main()
