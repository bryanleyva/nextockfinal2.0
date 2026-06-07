# NEXTOCK — Frontend básico

Interfaz web simple en **HTML + CSS + JavaScript (fetch) + Highcharts**, tal como
el diagrama de arquitectura física. Consume la API del backend NestJS.

Incluye:
- **Registro** de usuario (HU-24) e **inicio de sesión** (HU-23) con JWT.
- **Dashboard** con métricas (HU-05), estado del inventario, ranking (HU-18) y ventas diarias.
- **Predicción por producto** (HU-01): ficha de texto + gráficos interactivos de
  demanda y proyección de stock (HU-06, HU-09, HU-11).
- **Reportes**: resumen financiero (HU-10) y tabla de sobre stock / déficit (HU-09/11).
- **Subir CSV** (HU-17) y reentrenar el modelo (HU-03).

## Requisitos

1. El **backend NestJS** corriendo en `http://localhost:3000`.
2. El **microservicio ML** corriendo en `http://localhost:8000`.
3. Conexión a internet (Highcharts se carga por CDN).

> Si tu backend corre en otra URL, edita `API_BASE` en `js/api.js`.

## Cómo abrirlo

Necesita servirse por HTTP (no abrir el archivo directamente) para que funcione el
login y las llamadas a la API:

```powershell
cd C:\Users\Usuario\Desktop\nextockfinal2.0\nextockfrontend2.0
py -m http.server 5500
```

Luego abre en el navegador: **http://localhost:5500**

(Alternativa: extensión *Live Server* de VSCode → clic derecho en `index.html` → "Open with Live Server".)

## Usuario de prueba

- Correo: **admin@nextock.com**
- Contraseña: **admin123**

## Flujo de demostración sugerido

1. Inicia sesión.
2. **Dashboard**: revisa métricas y gráficos.
3. **Predicción**: elige un SKU (ej. `SKU-0001` déficit, `SKU-0014` sobre stock) → *Analizar*.
4. **Reportes**: mira el resumen financiero y la tabla de estados.
5. **Subir datos**: prueba subiendo el `fact_sales_inventory.csv` de `MLNEXTOCK/data`.

## Archivos

```
nextockfrontend2.0/
├── index.html        # estructura de las vistas
├── css/styles.css    # estilos
└── js/
    ├── api.js        # cliente fetch + manejo del token JWT
    ├── charts.js     # gráficos Highcharts
    └── app.js        # lógica: auth, navegación, dashboard, predicción, reportes, subida
```
