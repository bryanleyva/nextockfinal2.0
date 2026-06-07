# NEXTOCK — Frontend (Angular 19)

Aplicación web **Angular** (proyecto real con CLI, componentes standalone, router,
guard, interceptor JWT y **Highcharts**) que consume la API del backend NestJS.

## Funcionalidad

- **Registro** (HU-24) e **inicio de sesión** (HU-23) con JWT.
- **Multi-tenant**: cada bodega ve solo sus datos. Una bodega nueva entra vacía
  y debe subir sus CSV; a partir de ahí ve sus reportes y gráficos.
- **Dashboard** (HU-05): métricas, estado del inventario, ranking (HU-18), ventas.
- **Predicción por producto** (HU-01): ficha de texto + gráficos interactivos de
  demanda y stock (HU-06, HU-09, HU-11).
- **Reportes**: financiero (HU-10) y tabla sobre stock / déficit (HU-09/11).
- **Subir CSV** (HU-17) con reentrenamiento del modelo (HU-03).

## Estructura

```
src/app/
├── core/
│   ├── config.ts            # URL base de la API
│   ├── models.ts            # interfaces (tipos)
│   ├── auth.service.ts      # login/registro + token (signal)
│   ├── api.service.ts       # llamadas a la API
│   ├── auth.interceptor.ts  # agrega el Bearer token
│   ├── auth.guard.ts        # protege rutas internas
│   └── charts.ts            # opciones de Highcharts
├── pages/
│   ├── login/  shell/  dashboard/  prediccion/  reportes/  subir/
├── app.routes.ts            # rutas + guard
└── app.config.ts            # HttpClient + interceptor + router
```

## Requisitos

1. Backend NestJS en `http://localhost:3000` (ver `../nextockbackend2.0`).
2. Microservicio ML en `http://localhost:8000` (ver `../MLNEXTOCK`).

> Si el backend está en otra URL, edita `src/app/core/config.ts`.

## Arrancar

```powershell
cd C:\Users\Usuario\Desktop\nextockfinal2.0\nextockfrontend-angular
npm install      # solo la primera vez
npx ng serve
```

Abre **http://localhost:4200**. Usuario demo: **admin@nextock.com / admin123**
(esta bodega ya trae datos de ejemplo). Para probar el multi-tenant, regístrate
como una bodega nueva: entrará vacía hasta que subas tus CSV.
