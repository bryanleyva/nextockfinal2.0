# NEXTOCK — Módulo de Machine Learning (XGBoost)

Análisis y predicción de inventarios para bodegas. Este repositorio contiene
**solo la parte de Machine Learning**: a partir de la base de datos importada
(tablas `PRODUCT` y `FACT_SALES_INVENTORY`) entrena un modelo **XGBoost** que:

1. **Pronostica la demanda** por producto (HU-01).
2. Dado un **SKU / código de producto**, muestra la predicción en **gráficos** y
   reporta **sobre stock** y **déficit** (HU-09, HU-11).
3. Genera un **reporte de predicción** de inventario para todos los productos.
4. Realiza el **análisis financiero** de todas las ventas (HU-10).
5. Incluye un **dataset sintético de prueba** y un ranking de más vendidos (HU-18).

---

## 1. Instalación

```powershell
# Crear entorno virtual (ya existe .venv si seguiste la instalación)
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> Probado con Python 3.14, xgboost 3.2, pandas 3.0, numpy 2.4, scikit-learn, matplotlib.

## 2. Uso rápido (todo de una vez)

```powershell
.\.venv\Scripts\python.exe -m src.main pipeline
```

Esto ejecuta en orden: **dataset → entrenamiento → reporte de inventario →
análisis financiero**. Los resultados quedan en `outputs/`.

## 3. Comandos individuales

| Comando | Qué hace |
|---|---|
| `python -m src.main dataset`            | Genera el dataset de prueba en `data/` |
| `python -m src.main entrenar`           | Entrena XGBoost y guarda el modelo + métricas |
| `python -m src.main predecir SKU-0006`  | Pronóstico + 2 gráficos de **un** producto |
| `python -m src.main reporte`            | Reporte de predicción de **todos** los productos |
| `python -m src.main finanzas`           | Análisis financiero de todas las ventas |

(Usa `.\.venv\Scripts\python.exe` en Windows.)

### Consultar un producto por su código (SKU)

```powershell
.\.venv\Scripts\python.exe -m src.main predecir SKU-0006
```

Devuelve estado (SOBRE STOCK / DÉFICIT / ÓPTIMO), demanda diaria pronosticada,
punto de reorden, stock de seguridad, días hasta quiebre, unidades de sobre
stock / déficit y la cantidad recomendada a pedir; además crea:

- `outputs/reportes/reporte_<SKU>.txt` — **ficha de texto** del producto:

  ```
  Nombre del producto: Papas Lays 90g
  Categoria: Snacks
  Stock actual: 15 unidades
  Demanda proyectada: 69 unidades
  Nivel recomendado de pedido: 23 unidades
  Probabilidad de quiebre de stock: 88%
  Fecha estimada de agotamiento: 07/06/2026
  ```

- `outputs/graficos/demanda_<SKU>.png` — ventas reales + tendencia (prom. 7d) +
  pronóstico (enlazados, sin saltos).
- `outputs/graficos/stock_<SKU>.png` — proyección de stock con punto de reorden,
  stock de seguridad y día estimado de quiebre.
- `outputs/reportes/series_<SKU>.json` — series listas para **gráficos
  interactivos** en el frontend (ver sección 9).

> El reporte de texto de **todos** los productos se genera junto en
> `outputs/reportes/reporte_prediccion_inventario.txt`.

---

## 4. Estructura

```
MLNEXTOCK/
├── data/                         # dataset de prueba (CSV)
│   ├── product.csv               # = tabla PRODUCT
│   └── fact_sales_inventory.csv  # = tabla FACT_SALES_INVENTORY
├── models/
│   ├── xgboost_demanda.json      # modelo entrenado
│   └── model_training.json       # métricas MAE/RMSE/MAPE (= tabla MODEL_TRAINING)
├── outputs/
│   ├── graficos/                 # PNG legibles
│   └── reportes/                 # CSV
└── src/
    ├── config.py                 # rutas y parámetros de negocio
    ├── generate_dataset.py       # generador de datos sintéticos
    ├── train_model.py            # entrenamiento XGBoost
    ├── predict.py                # predicción + gráficos por SKU
    ├── reports.py                # reporte de predicción (todos los productos)
    ├── financial_analysis.py     # análisis financiero
    ├── viz.py                    # estilo común de gráficos
    └── main.py                   # orquestador CLI
```

---

## 5. El dataset (espejo del modelo de datos)

`fact_sales_inventory.csv` reproduce la tabla **FACT_SALES_INVENTORY** del
diseño: `stock_initial`, `units_received`, `units_sold`, `stock_final`,
`days_since_last_order`, `last_order_qty`, `sales_avg_7_days`, `sale_price`,
`lead_time_days`, `day_of_week`, `month`, `stockout_flag` y
`target_units_sold` (la etiqueta = ventas del día siguiente).

Datos a **escala de bodega / tienda pequeña**: **15 productos**, **180 días**
(~6 meses) de registros diarios, pocas unidades vendidas por día (1 a 9) y
**stock máximo de 60 unidades por producto** (regla del negocio, ver
`STOCK_MAXIMO` en `config.py`). Incluye estacionalidad semanal/anual, tendencia
y una política de reposición *order-up-to* que nunca supera la capacidad. Para
que la demo muestre los tres estados, algunos productos se generan con
**sobre-pedido** (sobre stock) y otros con **sub-stock** (déficit).

> Para usar **tu propia base de datos**, reemplaza los dos CSV en `data/`
> respetando esas columnas y vuelve a ejecutar `entrenar` y `reporte`.

## 6. El modelo

`XGBRegressor` entrenado con un *split* temporal (80% pasado / 20% reciente).
Variable objetivo: `target_units_sold`. Las métricas se guardan en
`models/model_training.json` (MAE, RMSE, MAPE e importancia de variables).

## 7. Cálculos de inventario

- **Stock de seguridad** = `z · σ(demanda) · √(lead time)` con `z = 1.65` (95%).
- **Punto de reorden** = `demanda_diaria · lead time + stock_seguridad`.
- **Sobre stock**: cobertura muy por encima del objetivo (`DIAS_OBJETIVO_STOCK`).
- **Déficit**: stock por debajo del punto de reorden / quiebre dentro del horizonte.

Estos umbrales se ajustan en `src/config.py`.

## 9. Gráficos interactivos (para el backend + Angular)

Las imágenes `.png` de matplotlib son **estáticas** (sirven para los reportes).
Para que en la web el usuario pase el mouse por los vértices y vea los datos
(tooltips), el frontend debe dibujar los gráficos con una librería JS
interactiva (**Chart.js**, **ApexCharts** o **Plotly**) consumiendo el JSON que
ya exporta este módulo:

`outputs/reportes/series_<SKU>.json`:

```json
{
  "sku": "SKU-0006",
  "estado": "DEFICIT",
  "resumen": { "stock_actual": 403, "prob_quiebre_pct": 55, ... },
  "demanda": {
    "ventas_reales": [ { "fecha": "2026-05-01", "valor": 62 }, ... ],
    "tendencia_7d":  [ { "fecha": "2026-05-01", "valor": 60 }, ... ],
    "pronostico":    [ { "fecha": "2026-06-05", "valor": 68 }, ... ]
  },
  "stock_proyectado": [ { "fecha": "2026-06-05", "valor": 341 }, ... ]
}
```

Flujo previsto: **ML (Python)** genera el JSON → **backend (API)** lo expone en
un endpoint → **Angular** lo renderiza con tooltips, zoom y leyenda interactiva.

## 8. Cobertura de Historias de Usuario

| HU | Descripción | Dónde |
|----|-------------|-------|
| HU-01 | Pronóstico de demanda | `train_model.py`, `predict.py` |
| HU-09 | Sugerencias de acciones (reducir compras / reponer) | `predict.py`, `reports.py` |
| HU-10 | Reporte financiero | `financial_analysis.py` |
| HU-11 | Reporte de stock / sobre stock | `reports.py`, `predict.py` |
| HU-14 | Resaltado visual de alertas en gráficos | `predict.py`, `reports.py` |
| HU-18 | Ranking de productos más vendidos | `reports.py` |
