# NEXTOCK — Backend (NestJS + PostgreSQL + ML XGBoost)

API REST del sistema de gestión de inventarios para bodegas. Hecho con **NestJS**
(corre sobre **Node + Express**), persiste en **PostgreSQL** vía TypeORM y se
conecta por HTTP al **microservicio de Machine Learning (XGBoost)** que vive en
`../MLNEXTOCK`.

## Arquitectura

```
 Angular (frontend)          NestJS (este backend)            ML (Python/XGBoost)
 JS/HTML/CSS + Highcharts  →  Node+Express + Multer + TypeORM  →  FastAPI (puerto 8000)
        fetch  ──HTTP──►          (puerto 3000)        ──HTTP──►   predict / reports
                                       │
                                       ▼
                                  PostgreSQL
```

- **Node + Express**: NestJS usa Express por debajo (compatible con el diagrama).
- **Multer**: carga de archivos CSV (HU-17).
- **CSV**: formato de intercambio con el ML.
- **PostgreSQL**: base de datos (tablas `product`, `fact_sales_inventory`, `users`).
- **XGBoost**: el ML no cambia; el backend lo consume como servicio.
- **Highcharts** (frontend): los endpoints `/series/:sku` devuelven JSON listo para graficar.

## Requisitos

- Node 18+ (probado con Node 22) y npm
- PostgreSQL 14+ corriendo (probado con PostgreSQL 18)
- El microservicio de ML corriendo (ver `../MLNEXTOCK`)

## Puesta en marcha

```powershell
# 1) Instalar dependencias
npm install

# 2) Configurar la conexion: copia .env.example a .env y pon tu password de PostgreSQL
#    (DB_PASSWORD, DB_NAME, etc.)

# 3) Crear la base de datos (una sola vez)
#    psql -U postgres -c "CREATE DATABASE nextock;"

# 4) Levantar el microservicio de ML (en otra terminal, dentro de MLNEXTOCK)
#    .\.venv\Scripts\python.exe -m uvicorn src.api:app --port 8000

# 5) Cargar datos de prueba en PostgreSQL (lee los CSV de MLNEXTOCK/data)
npm run seed

# 6) Arrancar el backend
npm run start:dev
```

API disponible en `http://localhost:3000/api`.
Usuario de prueba (creado por el seed): **admin@nextock.com / admin123**.

## Endpoints (mapeados a las Historias de Usuario)

Todos (salvo registro/login) requieren header `Authorization: Bearer <token>`.

| Método | Ruta | HU | Descripción |
|---|---|---|---|
| POST | `/api/auth/registro` | HU-24 | Registro de usuario |
| POST | `/api/auth/login` | HU-23 | Iniciar sesión (devuelve JWT) |
| POST | `/api/auth/cambiar-password` | HU-25 | Cambio de contraseña |
| GET | `/api/usuarios/perfil` | HU-15 | Ver mi perfil |
| GET | `/api/productos` | — | Listar productos (`?categoria=`) |
| GET | `/api/productos/buscar?q=` | HU-21 | Buscador de inventario |
| GET | `/api/productos/categorias` | HU-22 | Categorías para filtrar |
| GET | `/api/inventario/metricas` | HU-05 | Panel con métricas clave |
| GET | `/api/inventario/ventas?desde=&hasta=` | HU-06/08 | Ventas diarias + filtro fechas |
| GET | `/api/analisis/prediccion/:sku` | HU-01 | Pronóstico + diagnóstico (ML) |
| GET | `/api/analisis/series/:sku` | — | Series para Highcharts |
| GET | `/api/analisis/reporte-inventario` | HU-09/11 | Sobre stock / déficit / sugerencias |
| GET | `/api/analisis/finanzas` | HU-10 | Reporte financiero |
| GET | `/api/analisis/ranking` | HU-18 | Productos más vendidos |
| POST | `/api/datos/productos` | HU-17 | Subir product.csv |
| POST | `/api/datos/hechos` | HU-17/03 | Subir fact CSV y reentrenar ML |
| GET | `/api/soporte/encargados` | HU-19 | Encargados de la página |
| POST | `/api/soporte/contacto` | HU-07 | Contactar soporte |
| POST | `/api/soporte/compartir` | HU-20 | Compartir reporte por correo |

## Pendiente (próximas iteraciones)

- HU-13/HU-16: descarga de reportes en PDF / Excel (hoy el ML genera CSV/PNG).
- HU-20/HU-07: envío real de correo (hoy responde OK; falta SMTP/Nodemailer).
- HU-02/HU-04: persistir histórico de análisis en PostgreSQL.
