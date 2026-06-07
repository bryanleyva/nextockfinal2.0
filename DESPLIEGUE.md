# NEXTOCK — Despliegue para pruebas internas (red local / LAN)

Tu PC actúa como **servidor de pruebas**: tú y tu equipo entran desde el navegador
usando la IP de esta PC en la misma red (WiFi/LAN). Todo corre local; nada en la nube.

## Arquitectura del despliegue

```
  Otros equipos de la red ──HTTP──►  http://<IP-de-tu-PC>:3000
                                          │
                                  NestJS (puerto 3000)
                                  ├── sirve el frontend Angular (compilado)
                                  └── API /api/*  ──►  ML (localhost:8000)  [interno]
                                          │
                                     PostgreSQL (localhost:5432)
```

Ventajas: **un solo puerto abierto (3000)**, sin problemas de CORS, y el ML queda
interno (no expuesto a la red).

---

## 1. Requisitos (una sola vez)

```powershell
# Dependencias (si no se instalaron antes)
cd MLNEXTOCK ; .\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..\nextockbackend2.0 ; npm install
cd ..\nextockfrontend-angular ; npm install

# Compilar el frontend (genera dist/ que sirve el backend)
cd ..\nextockfrontend-angular ; npm run build

# Compilar el backend
cd ..\nextockbackend2.0 ; npm run build

# Cargar datos demo en PostgreSQL (crea usuario admin@nextock.com / admin123)
npm run seed
```

## 2. Abrir el puerto en el Firewall (una sola vez, como ADMINISTRADOR)

Abre PowerShell **como administrador** y ejecuta:

```powershell
New-NetFirewallRule -DisplayName "NEXTOCK 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

> Sin esta regla, otros equipos de la red no podrán conectarse (solo funcionará en tu PC).

## 3. Arrancar todo

```powershell
cd C:\Users\Usuario\Desktop\nextockfinal2.0
.\start-nextock.ps1
```

Esto abre 2 ventanas (ML y backend) y muestra las URLs de acceso.

## 4. Acceder

- En esta PC: **http://localhost:3000**
- Desde otros equipos de la red: **http://<IP-de-tu-PC>:3000**
  (la IP detectada actualmente es **http://192.168.1.37:3000**; puede cambiar si te reconectas a la red)

Para saber tu IP en cualquier momento:
```powershell
ipconfig | Select-String "IPv4"
```

**Usuario demo:** `admin@nextock.com` / `admin123` (ya trae datos de ejemplo).
Cada persona puede registrar su propia bodega en **Prueba gratuita** y entrará vacía
hasta que suba sus CSV (multi-tenant).

## 5. Detener

Cierra las 2 ventanas de PowerShell que abrió el script (ML y backend).

## 6. Actualizar tras cambios de código

```powershell
# Si cambiaste el frontend:
cd nextockfrontend-angular ; npm run build
# Si cambiaste el backend:
cd ..\nextockbackend2.0 ; npm run build
# Reinicia el script de arranque.
```

---

## Dónde se guardan los datos

| Dato | Ubicación |
|---|---|
| Usuarios, productos, ventas | PostgreSQL (`C:/Program Files/PostgreSQL/18/data`) |
| CSV subidos por cada bodega | `MLNEXTOCK/data/stores/<id>/` |
| Modelo XGBoost por bodega | `MLNEXTOCK/models/stores/<id>/` |
| Gráficos y reportes | `MLNEXTOCK/outputs/.../stores/<id>/` |

## Notas

- Es un despliegue **de pruebas en LAN**. Para producción real (acceso por internet,
  varios usuarios concurrentes) se hospedarían PostgreSQL y los servicios en un
  servidor/nube y se usaría HTTPS.
- La PC debe estar **encendida** y conectada a la red mientras se hacen las pruebas.
- Si usas la red de una empresa/universidad con "aislamiento de clientes" (AP isolation),
  puede que los equipos no se vean entre sí; en ese caso usa un router/hotspot propio.
