"""
Prediccion de demanda y stock por producto (SKU) con XGBoost.

Para un SKU entrega:
  - Pronostico de demanda a HORIZONTE_PRONOSTICO dias (HU-01)
  - Proyeccion del stock y dia estimado de quiebre
  - Punto de reorden, stock de seguridad y cantidad recomendada a pedir (HU-09)
  - Diagnostico de SOBRE STOCK / DEFICIT (HU-11)
  - Dos graficos legibles: demanda (historico + pronostico) y proyeccion de stock

Uso:
    python -m src.predict SKU-0007
"""
from __future__ import annotations

import sys
import json
import math
import numpy as np
import pandas as pd
from datetime import timedelta
from statistics import NormalDist
from xgboost import XGBRegressor

from . import config
from . import viz
import matplotlib.dates as mdates


# ---------------------------------------------------------------------------
# Carga de datos / modelo
# ---------------------------------------------------------------------------
def cargar(store=None):
    r = config.rutas(store)
    if not r["productos"].exists() or not r["fact"].exists():
        raise FileNotFoundError(
            "No hay datos cargados para esta bodega. Sube tu CSV de ventas para empezar."
        )
    df_prod = pd.read_csv(r["productos"])
    df_fact = pd.read_csv(r["fact"], parse_dates=["record_date"])
    # Si todavia no existe el modelo de la tienda, se entrena automaticamente.
    if not r["modelo"].exists():
        from . import train_model
        train_model.entrenar_tienda(store)
    modelo = XGBRegressor()
    modelo.load_model(r["modelo"])
    return df_prod, df_fact, modelo


def _resolver_producto(df_prod: pd.DataFrame, sku_o_id: str) -> pd.Series:
    s = str(sku_o_id).strip()
    fila = df_prod[df_prod["source_product_id"].astype(str).str.lower() == s.lower()]
    if fila.empty and s.isdigit():
        fila = df_prod[df_prod["product_id"] == int(s)]
    if fila.empty:
        disponibles = ", ".join(df_prod["source_product_id"].head(8))
        raise ValueError(f"No se encontro el producto '{sku_o_id}'. Ejemplos validos: {disponibles} ...")
    return fila.iloc[0]


# ---------------------------------------------------------------------------
# Pronostico recursivo de demanda
# ---------------------------------------------------------------------------
def pronosticar(df_fact: pd.DataFrame, producto: pd.Series, modelo: XGBRegressor,
                horizonte: int = config.HORIZONTE_PRONOSTICO) -> pd.DataFrame:
    """Pronostico dia a dia. Proyecta el stock SIN reposicion para detectar quiebres."""
    hist = df_fact[df_fact["product_id"] == producto["product_id"]].sort_values("record_date")
    ultima = hist.iloc[-1]

    categoria = int(ultima["category"])
    sale_price = float(ultima["sale_price"])
    lead_time = int(producto["lead_time_days"])

    # Estado inicial tomado del ultimo registro historico
    stock = float(ultima["stock_final"])
    stock_actual = stock
    ventas_recientes = list(hist["units_sold"].tail(7).values)
    dias_desde_pedido = int(ultima["days_since_last_order"])
    ultimo_pedido = float(ultima["last_order_qty"])
    fecha = pd.Timestamp(ultima["record_date"])

    filas = []
    for _ in range(horizonte):
        fecha = fecha + timedelta(days=1)
        avg7 = float(np.mean(ventas_recientes[-7:])) if ventas_recientes else float(ultima["sales_avg_7_days"])

        feats = pd.DataFrame([{
            "category": categoria,
            "stock_initial": stock,
            "units_received": 0.0,
            "stock_final": stock,             # estado de inicio del dia (sin venta aun)
            "days_since_last_order": dias_desde_pedido,
            "last_order_qty": ultimo_pedido,
            "sales_avg_7_days": avg7,
            "sale_price": sale_price,
            "lead_time_days": lead_time,
            "day_of_week": fecha.weekday(),
            "month": fecha.month,
        }])[config.COLUMNAS_FEATURES]

        demanda = float(np.clip(modelo.predict(feats)[0], 0, None))
        vendido = min(demanda, stock)          # venta real limitada por stock
        stock_ini = stock
        stock = max(stock - vendido, 0.0)

        filas.append({
            "fecha": fecha,
            "demanda_pronosticada": round(demanda, 2),
            "venta_proyectada": round(vendido, 2),
            "stock_inicial": round(stock_ini, 2),
            "stock_proyectado": round(stock, 2),
            "quiebre": stock <= 0,
        })

        ventas_recientes.append(demanda)
        dias_desde_pedido += 1

    pron = pd.DataFrame(filas)
    pron.attrs["stock_actual"] = stock_actual
    pron.attrs["lead_time"] = lead_time
    return pron


# ---------------------------------------------------------------------------
# Diagnostico de inventario (sobre stock / deficit / optimo)
# ---------------------------------------------------------------------------
def diagnosticar(producto: pd.Series, pron: pd.DataFrame) -> dict:
    stock_actual = pron.attrs["stock_actual"]
    lead_time = pron.attrs["lead_time"]

    demanda = pron["demanda_pronosticada"].values
    demanda_diaria = float(np.mean(demanda))
    demanda_std = float(np.std(demanda))

    # Stock de seguridad y punto de reorden
    stock_seguridad = config.NIVEL_SERVICIO_Z * demanda_std * np.sqrt(max(lead_time, 1))
    demanda_lead = demanda_diaria * lead_time
    punto_reorden = demanda_lead + stock_seguridad

    # Cobertura actual en dias
    cobertura_dias = (stock_actual / demanda_diaria) if demanda_diaria > 0 else float("inf")

    # Stock objetivo y nivel para reponer
    stock_objetivo = demanda_diaria * config.DIAS_OBJETIVO_STOCK + stock_seguridad
    umbral_sobre = stock_objetivo * config.FACTOR_SOBRE_STOCK

    # Dia de quiebre dentro del horizonte
    quiebres = pron[pron["quiebre"]]
    dia_quiebre = quiebres["fecha"].iloc[0] if not quiebres.empty else None
    dias_hasta_quiebre = (
        int((dia_quiebre - pron["fecha"].iloc[0]).days) + 1 if dia_quiebre is not None else None
    )
    fecha_agotamiento = dia_quiebre.strftime("%d/%m/%Y") if dia_quiebre is not None else None

    # Probabilidad de quiebre durante el lead time (sin reposicion).
    # Se modela la demanda acumulada del lead time como Normal(mu, sigma).
    mu_lead = demanda_diaria * lead_time
    sigma_lead = demanda_std * math.sqrt(max(lead_time, 1))
    if sigma_lead <= 0:
        prob_quiebre = 100.0 if stock_actual < mu_lead else 0.0
    else:
        prob_quiebre = (1 - NormalDist(mu_lead, sigma_lead).cdf(stock_actual)) * 100
    prob_quiebre = round(float(min(100.0, max(0.0, prob_quiebre))), 1)

    # Clasificacion
    sobre_stock_unid = 0.0
    deficit_unid = 0.0
    if stock_actual > umbral_sobre and demanda_diaria > 0:
        estado = "SOBRE STOCK"
        sobre_stock_unid = round(stock_actual - stock_objetivo, 2)
        recomendacion = (
            f"Reducir compras. Hay ~{cobertura_dias:.0f} dias de cobertura "
            f"(objetivo {config.DIAS_OBJETIVO_STOCK}). Exceso de {sobre_stock_unid:.0f} unidades."
        )
        cantidad_pedir = 0.0
    elif stock_actual <= punto_reorden:
        estado = "DEFICIT"
        deficit_unid = round(max(punto_reorden - stock_actual, 0), 2)
        # El pedido se limita a la capacidad maxima del negocio (STOCK_MAXIMO).
        objetivo_pedido = min(stock_objetivo, config.STOCK_MAXIMO)
        cantidad_pedir = round(max(objetivo_pedido - stock_actual, 0), 2)
        msg_quiebre = (
            f"quiebre estimado en {dias_hasta_quiebre} dias" if dias_hasta_quiebre
            else "riesgo de quiebre proximo"
        )
        recomendacion = (
            f"Reponer ya: el stock esta bajo el punto de reorden ({punto_reorden:.0f}). "
            f"{msg_quiebre}. Pedir ~{cantidad_pedir:.0f} unidades."
        )
    else:
        estado = "OPTIMO"
        cantidad_pedir = 0.0
        recomendacion = (
            f"Inventario en estado optimo (~{cobertura_dias:.0f} dias de cobertura). "
            "No requiere accion inmediata."
        )

    return {
        "product_id": int(producto["product_id"]),
        "sku": producto["source_product_id"],
        "nombre": producto["product_name"],
        "categoria": producto["category"],
        "precio_venta": float(producto["sale_price"]),
        "precio_compra": float(producto["purchase_price"]),
        "lead_time_dias": lead_time,
        "stock_actual": round(stock_actual, 2),
        "demanda_diaria_prom": round(demanda_diaria, 2),
        "demanda_total_horizonte": round(float(np.sum(demanda)), 2),
        "cobertura_dias": round(cobertura_dias, 1) if np.isfinite(cobertura_dias) else None,
        "stock_seguridad": round(float(stock_seguridad), 2),
        "punto_reorden": round(float(punto_reorden), 2),
        "stock_objetivo": round(float(stock_objetivo), 2),
        "dias_hasta_quiebre": dias_hasta_quiebre,
        "fecha_agotamiento": fecha_agotamiento,
        "prob_quiebre_pct": prob_quiebre,
        "sobre_stock_unid": sobre_stock_unid,
        "deficit_unid": deficit_unid,
        "cantidad_recomendada_pedir": cantidad_pedir,
        "estado": estado,
        "recomendacion": recomendacion,
    }


# ---------------------------------------------------------------------------
# Graficos
# ---------------------------------------------------------------------------
def graficar_demanda(producto, hist, pron, diag, store=None) -> str:
    viz.aplicar_estilo()
    fig, ax = viz.plt.subplots()

    h = hist.tail(60).copy()
    h["ma7"] = h["units_sold"].rolling(7, min_periods=1).mean()

    # 1) Ventas reales diarias (de fondo, tenues) -> contexto del ruido real
    ax.plot(h["record_date"], h["units_sold"], color=viz.PALETA["historico"],
            lw=1.0, alpha=0.28, marker="o", ms=2, label="Ventas reales (diarias)")
    # 2) Tendencia historica (promedio movil 7 dias) -> base sobre la que sigue el pronostico
    ax.plot(h["record_date"], h["ma7"], color=viz.PALETA["historico"],
            lw=2.8, label="Tendencia historica (prom. 7d)")
    # 3) Pronostico conectado a la tendencia para que haya continuidad visual
    fechas_fc = [h["record_date"].iloc[-1]] + list(pron["fecha"])
    valores_fc = [round(float(h["ma7"].iloc[-1]), 2)] + list(pron["demanda_pronosticada"])
    ax.plot(fechas_fc, valores_fc, color=viz.PALETA["pronostico"],
            lw=2.8, marker="o", ms=3, label="Pronostico XGBoost")

    # Linea divisoria historico / futuro
    corte = h["record_date"].iloc[-1]
    ax.axvline(corte, color=viz.PALETA["neutro"], ls=":", lw=1.5)
    ax.text(corte, ax.get_ylim()[1] * 0.96, "  hoy", color=viz.PALETA["neutro"], fontsize=10, va="top")

    prom = diag["demanda_diaria_prom"]
    ax.axhline(prom, color=viz.PALETA["morado"], ls="--", lw=1.3,
               label=f"Demanda diaria prom. pronosticada ({prom:.0f})")

    ax.set_title(f"Pronostico de demanda  |  {diag['sku']} - {diag['nombre']}")
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Unidades vendidas / dia")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d-%b"))
    fig.autofmt_xdate(rotation=35)

    ruta = config.rutas(store)["graficos"] / f"demanda_{diag['sku']}.png"
    return str(viz.guardar(fig, ruta))


def graficar_stock(producto, pron, diag, store=None) -> str:
    viz.aplicar_estilo()
    fig, ax = viz.plt.subplots()

    # La linea parte del STOCK ACTUAL de hoy y luego declina dia a dia.
    fecha_hoy = pron["fecha"].iloc[0] - timedelta(days=1)
    fechas = [fecha_hoy] + list(pron["fecha"])
    valores = [diag["stock_actual"]] + list(pron["stock_proyectado"])

    ax.plot(fechas, valores, color=viz.PALETA["stock"],
            lw=2.5, marker="o", ms=3, label="Stock proyectado (sin reposicion)")
    ax.fill_between(fechas, 0, valores, color=viz.PALETA["stock"], alpha=0.10)

    # Lineas de referencia
    ax.axhline(diag["punto_reorden"], color=viz.PALETA["alerta"], ls="--", lw=1.6,
               label=f"Punto de reorden ({diag['punto_reorden']:.0f})")
    ax.axhline(diag["stock_seguridad"], color=viz.PALETA["pronostico"], ls=":", lw=1.6,
               label=f"Stock de seguridad ({diag['stock_seguridad']:.0f})")

    # Zona de quiebre
    if diag["dias_hasta_quiebre"]:
        idx = diag["dias_hasta_quiebre"] - 1
        if 0 <= idx < len(pron):
            f_q = pron["fecha"].iloc[idx]
            ax.axvline(f_q, color=viz.PALETA["alerta"], lw=1.5)
            ax.annotate(f"Quiebre\n{f_q.strftime('%d-%b')}",
                        xy=(f_q, 0), xytext=(f_q, ax.get_ylim()[1] * 0.35),
                        color=viz.PALETA["alerta"], fontsize=10, ha="center", fontweight="bold",
                        arrowprops=dict(arrowstyle="->", color=viz.PALETA["alerta"]))

    color_estado = {"SOBRE STOCK": viz.PALETA["pronostico"],
                    "DEFICIT": viz.PALETA["alerta"],
                    "OPTIMO": viz.PALETA["ok"]}[diag["estado"]]
    ax.set_title(f"Proyeccion de stock  |  {diag['sku']} - {diag['nombre']}   [{diag['estado']}]",
                 color=color_estado)
    ax.set_xlabel("Fecha")
    ax.set_ylabel("Unidades en stock")
    ax.set_ylim(bottom=0)
    ax.legend(loc="upper right")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d-%b"))
    fig.autofmt_xdate(rotation=35)

    ruta = config.rutas(store)["graficos"] / f"stock_{diag['sku']}.png"
    return str(viz.guardar(fig, ruta))


# ---------------------------------------------------------------------------
# API principal
# ---------------------------------------------------------------------------
def exportar_series_json(diag: dict, hist: pd.DataFrame, pron: pd.DataFrame, store=None) -> str:
    """
    Exporta las series (historico + pronostico + lineas de referencia) en JSON,
    listo para que el backend/Angular dibuje graficos INTERACTIVOS con tooltips
    (Chart.js / ApexCharts / Plotly). Cada punto lleva fecha y valor.
    """
    h = hist.tail(60).copy()
    h["ma7"] = h["units_sold"].rolling(7, min_periods=1).mean()

    data = {
        "sku": diag["sku"],
        "nombre": diag["nombre"],
        "categoria": diag["categoria"],
        "estado": diag["estado"],
        "resumen": {
            "stock_actual": diag["stock_actual"],
            "demanda_proyectada": diag["demanda_total_horizonte"],
            "nivel_recomendado_pedido": diag["cantidad_recomendada_pedir"],
            "prob_quiebre_pct": diag["prob_quiebre_pct"],
            "fecha_agotamiento": diag["fecha_agotamiento"],
            "punto_reorden": diag["punto_reorden"],
            "stock_seguridad": diag["stock_seguridad"],
        },
        "demanda": {
            "ventas_reales": [
                {"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 2)}
                for d, v in zip(h["record_date"], h["units_sold"])
            ],
            "tendencia_7d": [
                {"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 2)}
                for d, v in zip(h["record_date"], h["ma7"])
            ],
            "pronostico": [
                {"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 2)}
                for d, v in zip(pron["fecha"], pron["demanda_pronosticada"])
            ],
        },
        "stock_proyectado": (
            [{"fecha": (pron["fecha"].iloc[0] - timedelta(days=1)).strftime("%Y-%m-%d"),
              "valor": round(float(diag["stock_actual"]), 2)}]
            + [{"fecha": d.strftime("%Y-%m-%d"), "valor": round(float(v), 2)}
               for d, v in zip(pron["fecha"], pron["stock_proyectado"])]
        ),
    }
    ruta = config.rutas(store)["reportes"] / f"series_{diag['sku']}.json"
    ruta.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return str(ruta)


def analizar_producto(sku_o_id: str, store=None) -> dict:
    df_prod, df_fact, modelo = cargar(store)
    producto = _resolver_producto(df_prod, sku_o_id)
    hist = df_fact[df_fact["product_id"] == producto["product_id"]].sort_values("record_date")

    pron = pronosticar(df_fact, producto, modelo)
    diag = diagnosticar(producto, pron)

    diag["grafico_demanda"] = graficar_demanda(producto, hist, pron, diag, store)
    diag["grafico_stock"] = graficar_stock(producto, pron, diag, store)
    diag["series_json"] = exportar_series_json(diag, hist, pron, store)
    reporte_texto(diag, store=store)   # genera el .txt con la ficha
    diag["pronostico"] = pron

    return diag


def reporte_texto(diag: dict, guardar: bool = True, store=None) -> str:
    """Genera la ficha de reporte en texto (formato solicitado)."""
    agot = diag["fecha_agotamiento"] or f"No se agota en {config.HORIZONTE_PRONOSTICO} dias"
    texto = (
        f"Nombre del producto: {diag['nombre']}\n"
        f"Categoria: {diag['categoria']}\n"
        f"Stock actual: {diag['stock_actual']:.0f} unidades\n"
        f"Demanda proyectada: {diag['demanda_total_horizonte']:.0f} unidades\n"
        f"Nivel recomendado de pedido: {diag['cantidad_recomendada_pedir']:.0f} unidades\n"
        f"Probabilidad de quiebre de stock: {diag['prob_quiebre_pct']:.0f}%\n"
        f"Fecha estimada de agotamiento: {agot}"
    )
    if guardar:
        ruta = config.rutas(store)["reportes"] / f"reporte_{diag['sku']}.txt"
        ruta.write_text(texto + "\n", encoding="utf-8")
        diag["reporte_txt"] = str(ruta)
    return texto


def _imprimir(diag: dict):
    print("-" * 48)
    print(reporte_texto(diag))
    print("-" * 48)
    print(f"(Estado: {diag['estado']}  |  demanda proyectada = proximos "
          f"{config.HORIZONTE_PRONOSTICO} dias)")
    print(f"Reporte TXT    : {diag.get('reporte_txt', '')}")
    print(f"Grafico demanda: {diag['grafico_demanda']}")
    print(f"Grafico stock  : {diag['grafico_stock']}")


def main():
    if len(sys.argv) < 2:
        print("Uso: python -m src.predict <SKU o product_id>")
        print("Ejemplo: python -m src.predict SKU-0007")
        sys.exit(1)
    diag = analizar_producto(sys.argv[1])
    _imprimir(diag)


if __name__ == "__main__":
    main()
