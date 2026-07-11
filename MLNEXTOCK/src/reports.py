"""
Reporte de prediccion de inventario para TODOS los productos (HU-01, HU-09, HU-11).

Para cada producto pronostica la demanda, diagnostica su estado
(SOBRE STOCK / DEFICIT / OPTIMO), calcula punto de reorden, cantidad a pedir,
sobre stock y deficit; exporta todo a CSV y genera graficos resumen:
  - Conteo de productos por estado
  - Sobre stock vs deficit por producto
  - Ranking de productos mas vendidos (HU-18)

Uso:
    python -m src.reports
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config
from . import viz
from . import predict


def analizar_todos(store=None) -> list[dict]:
    """Diagnostica todos los productos (una sola pasada).

    Es TOLERANTE a datos inconsistentes: un producto sin historial de ventas o
    con datos que rompan el pronostico se OMITE, en vez de tumbar todo el reporte.
    """
    df_prod, df_fact, modelo = predict.cargar(store)
    ids_con_historial = set(df_fact["product_id"].unique())
    diags = []
    for _, producto in df_prod.iterrows():
        if producto["product_id"] not in ids_con_historial:
            continue  # sin historial de ventas: no se puede pronosticar
        try:
            pron = predict.pronosticar(df_fact, producto, modelo)
            diags.append(predict.diagnosticar(producto, pron))
        except Exception:
            continue  # dato inconsistente en este producto: se omite
    return diags


def tabla_desde_diags(diags: list[dict]) -> pd.DataFrame:
    tabla = pd.DataFrame([{k: v for k, v in d.items() if k != "recomendacion"} for d in diags])
    cols = [
        "sku", "nombre", "categoria", "estado", "stock_actual",
        "demanda_diaria_prom", "demanda_total_horizonte", "cobertura_dias",
        "stock_seguridad", "punto_reorden", "stock_objetivo",
        "dias_hasta_quiebre", "fecha_agotamiento", "prob_quiebre_pct",
        "sobre_stock_unid", "deficit_unid", "cantidad_recomendada_pedir",
    ]
    return tabla[cols]


def escribir_reporte_texto(diags: list[dict], store=None) -> str:
    """Genera un unico .txt con la ficha de texto de cada producto."""
    bloques = []
    for d in diags:
        bloques.append(predict.reporte_texto(d, guardar=False))
    contenido = ("\n" + "-" * 48 + "\n").join(bloques)
    ruta = config.rutas(store)["reportes"] / "reporte_prediccion_inventario.txt"
    ruta.write_text(contenido + "\n", encoding="utf-8")
    return str(ruta)


def graficar_estados(tabla: pd.DataFrame, store=None) -> str:
    viz.aplicar_estilo()
    orden = ["OPTIMO", "SOBRE STOCK", "DEFICIT"]
    colores = {"OPTIMO": viz.PALETA["ok"], "SOBRE STOCK": viz.PALETA["pronostico"],
               "DEFICIT": viz.PALETA["alerta"]}
    conteo = tabla["estado"].value_counts().reindex(orden).fillna(0)
    fig, ax = viz.plt.subplots(figsize=(9, 6))
    barras = ax.bar(conteo.index, conteo.values, color=[colores[e] for e in conteo.index])
    ax.bar_label(barras, fmt="%d", fontsize=13, fontweight="bold", padding=3)
    ax.set_title("Productos por estado de inventario")
    ax.set_ylabel("Cantidad de productos")
    ax.grid(axis="x", alpha=0)
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "resumen_estados.png"))


def graficar_sobre_deficit(tabla: pd.DataFrame, store=None) -> str:
    viz.aplicar_estilo()
    t = tabla.copy()
    t["neto"] = t["sobre_stock_unid"] - t["deficit_unid"]
    t = t[t["neto"] != 0].sort_values("neto")
    if t.empty:
        return ""
    fig, ax = viz.plt.subplots(figsize=(12, max(5, 0.45 * len(t))))
    colores = [viz.PALETA["pronostico"] if v > 0 else viz.PALETA["alerta"] for v in t["neto"]]
    ax.barh(t["sku"] + " - " + t["nombre"].str[:20], t["neto"], color=colores)
    ax.axvline(0, color=viz.PALETA["neutro"], lw=1)
    ax.set_title("Sobre stock (+, ambar)  vs  Deficit (-, rojo)  por producto")
    ax.set_xlabel("Unidades")
    ax.grid(axis="y", alpha=0)
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "resumen_sobre_deficit.png"))


def graficar_ranking_vendidos(n: int = 10, store=None) -> str:
    """HU-18: ranking de productos mas vendidos (historico)."""
    viz.aplicar_estilo()
    r = config.rutas(store)
    prod = pd.read_csv(r["productos"])
    fact = pd.read_csv(r["fact"])
    g = fact.groupby("product_id")["units_sold"].sum()
    prod = prod.set_index("product_id")
    prod["vendidos"] = g
    top = prod.sort_values("vendidos", ascending=False).head(n).iloc[::-1]
    etiquetas = [f"{r.source_product_id} - {r.product_name[:24]}" for r in top.itertuples()]
    fig, ax = viz.plt.subplots()
    barras = ax.barh(etiquetas, top["vendidos"], color=viz.PALETA["historico"])
    ax.bar_label(barras, fmt="%.0f", padding=3, fontsize=10)
    ax.set_title(f"Top {n} productos mas vendidos (historico)")
    ax.set_xlabel("Unidades vendidas")
    ax.grid(axis="y", alpha=0)
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "ranking_vendidos.png"))


def generar(store=None, con_graficos: bool = True) -> dict:
    diags = analizar_todos(store)
    tabla = tabla_desde_diags(diags)

    ruta_csv = config.rutas(store)["reportes"] / "reporte_prediccion_inventario.csv"
    tabla.to_csv(ruta_csv, index=False, encoding="utf-8")
    ruta_txt = escribir_reporte_texto(diags, store)

    # Los PNG solo se generan cuando se piden (la web usa graficos interactivos).
    # Omitirlos ahorra bastante memoria (util en hosting con RAM limitada).
    graficos = []
    if con_graficos:
        graficos = [
            graficar_estados(tabla, store),
            graficar_sobre_deficit(tabla, store),
            graficar_ranking_vendidos(store=store),
        ]
    return {
        "tabla": tabla,
        "reporte_csv": str(ruta_csv),
        "reporte_txt": ruta_txt,
        "graficos": [g for g in graficos if g],
        "n_sobre_stock": int((tabla["estado"] == "SOBRE STOCK").sum()),
        "n_deficit": int((tabla["estado"] == "DEFICIT").sum()),
        "n_optimo": int((tabla["estado"] == "OPTIMO").sum()),
    }


def main():
    print("Generando reporte de prediccion de inventario (todos los productos)...")
    res = generar()
    tabla = res["tabla"]
    print(f"\n  Productos analizados: {len(tabla)}")
    print(f"    OPTIMO      : {res['n_optimo']}")
    print(f"    SOBRE STOCK : {res['n_sobre_stock']}")
    print(f"    DEFICIT     : {res['n_deficit']}")
    print("\n  Vista rapida:")
    with pd.option_context("display.max_columns", None, "display.width", 160):
        print(tabla[["sku", "nombre", "estado", "stock_actual",
                     "demanda_diaria_prom", "dias_hasta_quiebre",
                     "cantidad_recomendada_pedir"]].to_string(index=False))
    print(f"\n  Reporte CSV: {res['reporte_csv']}")
    print(f"  Reporte TXT: {res['reporte_txt']}")
    print("  Graficos:")
    for g in res["graficos"]:
        print(f"    - {g}")
    print("Listo.")


if __name__ == "__main__":
    main()
