"""
Configuracion central del modulo de Machine Learning (NEXTOCK).

Define rutas, semilla de aleatoriedad, categorias y parametros del negocio
(nivel de servicio, horizonte de pronostico, etc.).
"""
from pathlib import Path

# ---------------------------------------------------------------------------
# Rutas del proyecto
# ---------------------------------------------------------------------------
RAIZ = Path(__file__).resolve().parent.parent
DIR_DATOS = RAIZ / "data"
DIR_MODELOS = RAIZ / "models"
DIR_SALIDAS = RAIZ / "outputs"
DIR_GRAFICOS = DIR_SALIDAS / "graficos"
DIR_REPORTES = DIR_SALIDAS / "reportes"

# Archivos del dataset (espejo de las tablas PRODUCT y FACT_SALES_INVENTORY)
ARCHIVO_PRODUCTOS = DIR_DATOS / "product.csv"
ARCHIVO_FACT = DIR_DATOS / "fact_sales_inventory.csv"

# Artefactos del modelo
ARCHIVO_MODELO = DIR_MODELOS / "xgboost_demanda.json"
ARCHIVO_METRICAS = DIR_MODELOS / "model_training.json"

for _d in (DIR_DATOS, DIR_MODELOS, DIR_SALIDAS, DIR_GRAFICOS, DIR_REPORTES):
    _d.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Multi-tenant: cada BODEGA (tienda) tiene sus propios datos, modelo y salidas.
# rutas(store) devuelve las rutas aisladas de esa tienda.
# rutas(None) usa las rutas globales (dataset de demostracion / CLI / selftest).
# ---------------------------------------------------------------------------
def rutas(store=None) -> dict:
    if store is None:
        return {
            "productos": ARCHIVO_PRODUCTOS,
            "fact": ARCHIVO_FACT,
            "modelo": ARCHIVO_MODELO,
            "metricas": ARCHIVO_METRICAS,
            "graficos": DIR_GRAFICOS,
            "reportes": DIR_REPORTES,
        }
    store = str(store)
    base_d = DIR_DATOS / "stores" / store
    base_m = DIR_MODELOS / "stores" / store
    base_g = DIR_GRAFICOS / "stores" / store
    base_r = DIR_REPORTES / "stores" / store
    for d in (base_d, base_m, base_g, base_r):
        d.mkdir(parents=True, exist_ok=True)
    return {
        "productos": base_d / "product.csv",
        "fact": base_d / "fact_sales_inventory.csv",
        "modelo": base_m / "xgboost_demanda.json",
        "metricas": base_m / "model_training.json",
        "graficos": base_g,
        "reportes": base_r,
    }

# ---------------------------------------------------------------------------
# Parametros generales
# ---------------------------------------------------------------------------
SEMILLA = 42

# Catalogo de categorias (id == indice). FACT usa el id; PRODUCT usa el nombre.
CATEGORIAS = [
    "Abarrotes",
    "Bebidas",
    "Lacteos",
    "Limpieza",
    "Snacks",
    "Cuidado Personal",
]

# ---------------------------------------------------------------------------
# Parametros de negocio para el calculo de inventario
# ---------------------------------------------------------------------------
# Parametros pensados para BODEGAS / tiendas pequenas (reponen seguido, poco stock)
HORIZONTE_PRONOSTICO = 14      # dias a futuro que se pronostican
NIVEL_SERVICIO_Z = 1.65        # z para 95% de nivel de servicio (stock de seguridad)
DIAS_OBJETIVO_STOCK = 7        # dias de cobertura ideal; mas que esto => sobre stock
FACTOR_SOBRE_STOCK = 1.5       # margen sobre la cobertura objetivo para marcar sobre stock
STOCK_MAXIMO = 60              # capacidad maxima por producto (regla del negocio)

# Variables que usa el modelo XGBoost para pronosticar la demanda
COLUMNAS_FEATURES = [
    "category",
    "stock_initial",
    "units_received",
    "stock_final",
    "days_since_last_order",
    "last_order_qty",
    "sales_avg_7_days",
    "sale_price",
    "lead_time_days",
    "day_of_week",
    "month",
]
COLUMNA_OBJETIVO = "target_units_sold"
