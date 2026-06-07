"""
Analisis financiero de todas las ventas (HU-10).

Calcula ingresos, costos, utilidad bruta y margen a partir de
FACT_SALES_INVENTORY + PRODUCT, y genera graficos legibles:
  - Ingresos vs costos por mes
  - Ingresos por categoria
  - Top 10 productos por ingreso
Tambien exporta un resumen y el detalle por producto a CSV.

Uso:
    python -m src.financial_analysis
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from . import config
from . import viz


def _cargar(store=None) -> pd.DataFrame:
    r = config.rutas(store)
    prod = pd.read_csv(r["productos"])
    fact = pd.read_csv(r["fact"], parse_dates=["record_date"])
    df = fact.merge(
        prod[["product_id", "source_product_id", "product_name", "category", "purchase_price"]],
        on="product_id", how="left", suffixes=("", "_prod"),
    )
    df["ingreso"] = df["units_sold"] * df["sale_price"]
    df["costo"] = df["units_sold"] * df["purchase_price"]
    df["utilidad"] = df["ingreso"] - df["costo"]
    df["periodo"] = df["record_date"].dt.to_period("M").dt.to_timestamp()
    return df


def resumen(df: pd.DataFrame) -> dict:
    ingreso = float(df["ingreso"].sum())
    costo = float(df["costo"].sum())
    utilidad = ingreso - costo
    return {
        "ingreso_total": round(ingreso, 2),
        "costo_total": round(costo, 2),
        "utilidad_bruta": round(utilidad, 2),
        "margen_pct": round((utilidad / ingreso * 100) if ingreso else 0, 2),
        "unidades_vendidas": int(df["units_sold"].sum()),
        "ticket_promedio_diario": round(df.groupby("record_date")["ingreso"].sum().mean(), 2),
        "rango": f"{df['record_date'].min().date()} a {df['record_date'].max().date()}",
    }


def _fmt_soles(x, _pos=None):
    if abs(x) >= 1000:
        return f"S/ {x/1000:.1f}k"
    return f"S/ {x:.0f}"


def graficar_mensual(df: pd.DataFrame, store=None) -> str:
    viz.aplicar_estilo()
    # Mostrar solo meses COMPLETOS (los bordes del dataset suelen ser parciales
    # y harian caer las barras de golpe, pareciendo un error).
    dias = df.groupby("periodo")["record_date"].nunique()
    completos = dias[dias >= 28].index
    descartados = [p.strftime("%b %y") for p in dias.index if p not in completos]
    if descartados:
        print(f"  (Grafico mensual: se omiten meses parciales: {', '.join(descartados)})")
    g = (df[df["periodo"].isin(completos)]
         .groupby("periodo")[["ingreso", "costo", "utilidad"]].sum())
    fig, ax = viz.plt.subplots()
    x = np.arange(len(g))
    w = 0.38
    ax.bar(x - w/2, g["ingreso"], w, color=viz.PALETA["historico"], label="Ingresos")
    ax.bar(x + w/2, g["costo"], w, color=viz.PALETA["alerta"], label="Costos")
    ax.plot(x, g["utilidad"], color=viz.PALETA["ok"], lw=2.5, marker="o", label="Utilidad bruta")
    ax.set_xticks(x)
    ax.set_xticklabels([p.strftime("%b %y") for p in g.index], rotation=35, ha="right")
    ax.yaxis.set_major_formatter(viz.plt.FuncFormatter(_fmt_soles))
    ax.set_title("Analisis financiero mensual: ingresos, costos y utilidad")
    ax.set_xlabel("Mes")
    ax.set_ylabel("Soles (S/)")
    ax.legend(loc="upper left")
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "fin_mensual.png"))


def graficar_categoria(df: pd.DataFrame, store=None) -> str:
    viz.aplicar_estilo()
    g = df.groupby("category")["ingreso"].sum().sort_values()
    fig, ax = viz.plt.subplots()
    ax.barh(g.index, g.values, color=viz.PALETA["morado"])
    for i, v in enumerate(g.values):
        ax.text(v, i, f" {_fmt_soles(v)}", va="center", fontsize=10)
    ax.xaxis.set_major_formatter(viz.plt.FuncFormatter(_fmt_soles))
    ax.set_title("Ingresos por categoria")
    ax.set_xlabel("Ingreso (S/)")
    ax.grid(axis="y", alpha=0)
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "fin_categoria.png"))


def graficar_top_productos(df: pd.DataFrame, n: int = 10, store=None) -> str:
    viz.aplicar_estilo()
    g = (df.groupby(["source_product_id", "product_name"])["ingreso"].sum()
         .sort_values(ascending=False).head(n).iloc[::-1])
    etiquetas = [f"{sku} - {nom[:24]}" for sku, nom in g.index]
    fig, ax = viz.plt.subplots()
    ax.barh(etiquetas, g.values, color=viz.PALETA["historico"])
    for i, v in enumerate(g.values):
        ax.text(v, i, f" {_fmt_soles(v)}", va="center", fontsize=10)
    ax.xaxis.set_major_formatter(viz.plt.FuncFormatter(_fmt_soles))
    ax.set_title(f"Top {n} productos por ingreso")
    ax.set_xlabel("Ingreso (S/)")
    ax.grid(axis="y", alpha=0)
    return str(viz.guardar(fig, config.rutas(store)["graficos"] / "fin_top_productos.png"))


def analizar(store=None) -> dict:
    df = _cargar(store)
    res = resumen(df)

    # Detalle por producto a CSV
    det = (df.groupby(["source_product_id", "product_name", "category"])
           .agg(unidades=("units_sold", "sum"),
                ingreso=("ingreso", "sum"),
                costo=("costo", "sum"),
                utilidad=("utilidad", "sum"))
           .reset_index().sort_values("ingreso", ascending=False))
    det["margen_pct"] = (det["utilidad"] / det["ingreso"] * 100).round(2)
    det = det.round(2)
    ruta_csv = config.rutas(store)["reportes"] / "reporte_financiero_productos.csv"
    det.to_csv(ruta_csv, index=False, encoding="utf-8")

    graficos = [graficar_mensual(df, store), graficar_categoria(df, store),
                graficar_top_productos(df, store=store)]
    res["reporte_csv"] = str(ruta_csv)
    res["graficos"] = graficos
    return res


def main():
    print("Generando analisis financiero de todas las ventas...")
    res = analizar()
    print("\n  --- Resumen financiero ---")
    print(f"  Periodo            : {res['rango']}")
    print(f"  Ingreso total      : S/ {res['ingreso_total']:,.2f}")
    print(f"  Costo total        : S/ {res['costo_total']:,.2f}")
    print(f"  Utilidad bruta     : S/ {res['utilidad_bruta']:,.2f}")
    print(f"  Margen bruto       : {res['margen_pct']:.2f} %")
    print(f"  Unidades vendidas  : {res['unidades_vendidas']:,}")
    print(f"  Ticket prom. diario: S/ {res['ticket_promedio_diario']:,.2f}")
    print(f"\n  Reporte CSV: {res['reporte_csv']}")
    print("  Graficos:")
    for g in res["graficos"]:
        print(f"    - {g}")
    print("Listo.")


if __name__ == "__main__":
    main()
