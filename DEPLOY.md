# 🚀 Despliegue de NEXTOCK

NEXTOCK son **3 piezas** que esta imagen empaqueta en **un solo contenedor** (Node y
Python comparten archivos), más **una base de datos PostgreSQL** aparte:

```
┌─────────────────────────── Contenedor único ───────────────────────────┐
│  Angular (compilado)  ─▶  NestJS (API + sirve Angular, :PORT)            │
│                              └─▶  FastAPI / XGBoost (ML, 127.0.0.1:8000) │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         PostgreSQL (persistente)  ← aquí se guarda TODO
```

> La **verdad** vive en PostgreSQL. Al arrancar, el backend **regenera desde la BD**
> los CSV que usa el ML, y el modelo **se reentrena solo** → la app se recupera
> sola aunque el disco del contenedor sea efímero.

---

## Opción A — Render (gratis) + Neon (Postgres gratis y persistente) ✅ recomendada

### 1) Base de datos en Neon
1. Crea una cuenta en **https://neon.tech** → **New Project**.
2. Copia el **connection string** (algo como
   `postgresql://usuario:clave@ep-xxx.neon.tech/neondb?sslmode=require`).

### 2) Servicio web en Render
1. Sube este proyecto a un repo de **GitHub** (la carpeta `nextockfinal2.0` con el `Dockerfile`).
2. En **https://render.com** → **New +** → **Web Service** → conecta tu repo.
3. Configura:
   - **Runtime:** Docker
   - **Dockerfile Path:** `Dockerfile`
   - **Plan:** Free
4. En **Environment** añade las variables:
   | Clave | Valor |
   |---|---|
   | `DATABASE_URL` | *(el string de Neon)* |
   | `DB_SYNCHRONIZE` | `true` |
   | `JWT_SECRET` | *(un texto largo y aleatorio)* |
   | `ML_SERVICE_URL` | `http://127.0.0.1:8000` |
   | `ML_DATA_DIR` | `/app/MLNEXTOCK/data` |
   | `FRONTEND_DIST` | `/app/frontend/browser` |

   > No pongas `PORT`: Render lo inyecta solo y el backend lo respeta.
   > Con `DATABASE_URL`, el SSL se activa automáticamente.
5. **Create Web Service**. La primera build tarda varios minutos (compila Angular,
   NestJS e instala XGBoost). Al terminar tendrás una URL pública `https://...onrender.com`.

### 3) Primer uso
- Abre la URL → **Prueba gratuita** para registrar tu cuenta → entra y sube tus CSV en
  **Procesar BD**. ¡Listo!

> ⚠️ **Tier gratis:** el servicio **se duerme** tras ~15 min sin uso; el primer acceso
> tarda ~30-60 s en despertar. Los datos **no se pierden** (están en Neon).

---

## Opción B — Una VM "siempre gratis" (Oracle Cloud) + Docker Compose

Más sólida (no se duerme, disco persistente), un poco más técnica.

1. Crea una VM **Always Free** en **https://www.oracle.com/cloud/free/** (Ubuntu).
2. Instala Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Copia el proyecto a la VM (git clone o scp) y entra a `nextockfinal2.0`.
4. Prepara las variables y levanta todo:
   ```bash
   cp .env.example .env
   nano .env            # pon DB_PASSWORD y JWT_SECRET; deja DATABASE_URL vacío
   docker compose up -d --build
   ```
5. Abre el puerto **3000** en las reglas de red (Security List) de la VM.
6. La app queda en `http://<IP-de-tu-VM>:3000` y **PostgreSQL guarda todo** en el
   volumen `pg_data` (persiste aunque reinicies).

---

## (Opcional) Cargar los datos de demostración
La app arranca **vacía**; te registras y subes tus CSV. Si quieres precargar el
dataset de ejemplo en la BD desplegada, desde `nextockbackend2.0/` con las variables
`DB_*`/`DATABASE_URL` apuntando a la BD remota:
```bash
npm install
npm run seed
```

---

## Checklist antes de desplegar
- [ ] `JWT_SECRET` cambiado por uno largo y aleatorio.
- [ ] `DB_SSL=true` (o usa `DATABASE_URL`) si tu Postgres es gestionado.
- [ ] La BD acepta conexiones desde el host (Neon/Supabase: por defecto sí).
- [ ] Probado el registro/login y la subida de un CSV en la URL pública.
