"""
Generador de dataset sintetico para pruebas (espejo de PRODUCT y
FACT_SALES_INVENTORY del modelo de datos NEXTOCK).

Pensado para BODEGAS / tiendas pequenas:
  - pocas unidades vendidas por dia (1 a 9 aprox.)
  - STOCK MAXIMO de 60 unidades por producto (regla del negocio)
  - politica de reposicion "order-up-to-S" (repone hasta su capacidad), por lo
    que el stock SIEMPRE queda entre 0 y la capacidad (<= 60)
  - estacionalidad semanal, estacionalidad anual leve, tendencia y ruido Poisson

La etiqueta a predecir (target_units_sold) son las unidades vendidas del DIA
SIGUIENTE, para que el modelo aprenda a pronosticar la demanda.

Uso:
    python -m src.generate_dataset
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from datetime import date, timedelta

from . import config


# (nombre, categoria, unidad, precio_venta, demanda_base, perfil, capacidad<=60, comportamiento)
#   perfil        : "finde" | "semana" | "plano"
#   comportamiento: "normal" | "sobre" (repone de mas) | "deficit" (se queda corto)
PLANTILLAS = [
    ("Inca Kola 500ml",        "Bebidas",          "und",  3.00, 8, "finde",  56, "deficit"),
    ("Coca Cola 500ml",        "Bebidas",          "und",  3.00, 7, "finde",  49, "normal"),
    ("Agua San Luis 625ml",    "Bebidas",          "und",  1.50, 9, "semana", 54, "deficit"),
    ("Galleta Soda Field",     "Snacks",           "und",  1.20, 6, "semana", 42, "normal"),
    ("Chocolate Sublime",      "Snacks",           "und",  2.00, 5, "finde",  40, "normal"),
    ("Papas Lays 90g",         "Snacks",           "und",  3.50, 4, "finde",  32, "normal"),
    ("Arroz Costeno 1kg",      "Abarrotes",        "kg",   4.50, 5, "finde",  40, "normal"),
    ("Azucar Rubia 1kg",       "Abarrotes",        "kg",   4.20, 4, "finde",  32, "normal"),
    ("Fideos Don Vittorio",    "Abarrotes",        "und",  3.20, 4, "plano",  32, "normal"),
    ("Aceite Primor 1L",       "Abarrotes",        "L",    9.90, 3, "plano",  27, "normal"),
    ("Leche Gloria tarro",     "Lacteos",          "und",  4.30, 5, "plano",  40, "normal"),
    ("Yogurt Gloria 1L",       "Lacteos",          "L",    7.80, 3, "finde",  30, "normal"),
    ("Detergente Bolivar",     "Limpieza",         "und",  8.50, 2, "semana", 40, "sobre"),
    ("Lejia Clorox 1L",        "Limpieza",         "L",    4.80, 1, "plano",  40, "sobre"),
    ("Shampoo Head&Shoulders", "Cuidado Personal", "und", 14.90, 1, "plano",  36, "sobre"),
]


def _perfil_semanal(perfil: str) -> np.ndarray:
    """Multiplicadores de demanda por dia de la semana (0=lunes ... 6=domingo)."""
    if perfil == "finde":
        return np.array([0.85, 0.85, 0.90, 1.00, 1.20, 1.45, 1.35])
    if perfil == "semana":
        return np.array([1.15, 1.15, 1.10, 1.05, 1.00, 0.80, 0.70])
    return np.array([1.0, 1.0, 1.0, 1.0, 1.05, 1.05, 0.95])  # plano


def generar(dias: int = 180, store_id: int = 1) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(config.SEMILLA)
    fecha_inicio = date.today() - timedelta(days=dias)

    filas_producto = []
    filas_fact = []
    fact_id = 1

    for i, (nombre, categoria, unidad, precio_venta, demanda_base,
            perfil, capacidad, comportamiento) in enumerate(PLANTILLAS):
        product_id = i + 1
        categoria_id = config.CATEGORIAS.index(categoria)
        sku = f"SKU-{product_id:04d}"
        capacidad = min(capacidad, config.STOCK_MAXIMO)     # nunca mas de 60
        margen = rng.uniform(0.25, 0.45)
        precio_compra = round(precio_venta * (1 - margen), 2)
        lead_time = int(rng.integers(1, 4))                 # bodega: entrega rapida (1-3 dias)

        filas_producto.append({
            "product_id": product_id,
            "store_id": store_id,
            "source_product_id": sku,
            "product_name": nombre,
            "category": categoria,
            "unit_measure": unidad,
            "sale_price": precio_venta,
            "purchase_price": precio_compra,
            "lead_time_days": lead_time,
            "active": True,
            "created_at": f"{fecha_inicio} 08:00:00",
        })

        # Punto de reorden segun comportamiento (stock que dispara un nuevo pedido)
        if comportamiento == "sobre":
            punto_reorden = capacidad - max(1, demanda_base)   # repone casi lleno -> mucho stock
        else:
            punto_reorden = demanda_base * (lead_time + 2)      # reorden saludable
        punto_reorden = min(punto_reorden, capacidad - 1)

        # Los productos "deficit" dejan de reponer en los ultimos dias (se quedan cortos)
        dia_corte_reposicion = dias - 12 if comportamiento == "deficit" else dias + 1

        mult_semana = _perfil_semanal(perfil)
        tendencia = rng.uniform(0.0003, 0.0012)
        fase = rng.uniform(0, 2 * np.pi)

        stock = float(capacidad)        # arranca lleno
        pendiente = 0
        dias_para_llegar = 0
        dias_desde_pedido = 0
        ultimo_pedido = 0.0
        hist_ventas = []

        ventas_dia = []
        registros = []

        for d in range(dias):
            f = fecha_inicio + timedelta(days=d)
            dow = f.weekday()
            mes = f.month

            est_anual = 1.0 + 0.15 * np.sin(2 * np.pi * d / 365.0 + fase)
            lam = demanda_base * mult_semana[dow] * est_anual * (1 + tendencia * d)
            demanda = int(rng.poisson(max(lam, 0.1)))

            stock_inicial = stock

            # Recepcion de mercaderia (si llego el pedido)
            recibido = 0
            if pendiente > 0:
                dias_para_llegar -= 1
                if dias_para_llegar <= 0:
                    recibido = pendiente
                    stock = min(stock + recibido, capacidad)   # nunca supera la capacidad
                    pendiente = 0

            # Venta limitada por el stock disponible
            vendido = min(demanda, stock)
            stock -= vendido
            quiebre = stock <= 0
            stock_final = stock

            avg7 = float(np.mean(hist_ventas[-7:])) if hist_ventas else float(vendido)

            registros.append({
                "fact_id": fact_id,
                "product_id": product_id,
                "category": categoria_id,
                "record_date": f.isoformat(),
                "stock_initial": round(stock_inicial, 2),
                "units_received": round(recibido, 2),
                "units_sold": round(vendido, 2),
                "stock_final": round(stock_final, 2),
                "days_since_last_order": dias_desde_pedido,
                "last_order_qty": round(ultimo_pedido, 2),
                "sales_avg_7_days": round(avg7, 2),
                "sale_price": precio_venta,
                "lead_time_days": lead_time,
                "day_of_week": dow,
                "month": mes,
                "stockout_flag": bool(quiebre),
            })
            ventas_dia.append(vendido)
            fact_id += 1

            # Reposicion "order-up-to-S": si bajo del punto de reorden, pedir hasta la capacidad
            dias_desde_pedido += 1
            hist_ventas.append(vendido)
            if (stock + pendiente) <= punto_reorden and pendiente == 0 and d < dia_corte_reposicion:
                cantidad = int(round(capacidad - stock))       # reponer hasta llenar
                if cantidad > 0:
                    pendiente = cantidad
                    dias_para_llegar = lead_time
                    ultimo_pedido = cantidad
                    dias_desde_pedido = 0

        # target = ventas del dia siguiente
        for idx, reg in enumerate(registros):
            if idx < len(registros) - 1:
                reg["target_units_sold"] = round(ventas_dia[idx + 1], 2)
                filas_fact.append(reg)

    df_prod = pd.DataFrame(filas_producto)
    df_fact = pd.DataFrame(filas_fact)
    return df_prod, df_fact


def main():
    print("Generando dataset sintetico (escala bodega, stock max 60)...")
    df_prod, df_fact = generar()
    df_prod.to_csv(config.ARCHIVO_PRODUCTOS, index=False, encoding="utf-8")
    df_fact.to_csv(config.ARCHIVO_FACT, index=False, encoding="utf-8")
    print(f"  Productos : {len(df_prod):>6}  -> {config.ARCHIVO_PRODUCTOS}")
    print(f"  Registros : {len(df_fact):>6}  -> {config.ARCHIVO_FACT}")
    print(f"  Stock final: min={df_fact['stock_final'].min():.0f}  max={df_fact['stock_final'].max():.0f}")
    print(f"  Rango fechas: {df_fact['record_date'].min()} a {df_fact['record_date'].max()}")
    print("Listo.")


if __name__ == "__main__":
    main()
