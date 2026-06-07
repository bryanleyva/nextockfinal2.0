# ============================================================================
#  NEXTOCK — Imagen única: Angular + NestJS (API) + FastAPI (ML)
#  Empaqueta las 3 piezas en un solo contenedor para que Node y Python
#  compartan el sistema de archivos (el backend escribe el CSV que el ML lee).
#
#  Contexto de build: la carpeta PADRE (nextockfinal2.0), p. ej.:
#      docker build -t nextock -f Dockerfile .
# ============================================================================

# ---------- 1) Build del frontend Angular ----------
FROM node:20-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY nextockfrontend-angular/package*.json ./
RUN npm ci
COPY nextockfrontend-angular/ ./
RUN npm run build

# ---------- 2) Build del backend NestJS ----------
FROM node:20-bookworm-slim AS backend
WORKDIR /build/backend
COPY nextockbackend2.0/package*.json ./
RUN npm ci
COPY nextockbackend2.0/ ./
RUN npm run build
RUN npm prune --omit=dev

# ---------- 3) Imagen final: Node (API + Angular) + Python (ML) ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    ML_SERVICE_URL=http://127.0.0.1:8000 \
    ML_DATA_DIR=/app/MLNEXTOCK/data \
    FRONTEND_DIST=/app/frontend/browser

# Python para el microservicio de ML (XGBoost / FastAPI)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias de Python en un entorno virtual aislado
COPY MLNEXTOCK/requirements.txt /app/MLNEXTOCK/requirements.txt
RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/venv/bin/pip install --no-cache-dir -r /app/MLNEXTOCK/requirements.txt

# Código del microservicio ML
COPY MLNEXTOCK/ /app/MLNEXTOCK/

# Backend compilado + dependencias de producción
COPY --from=backend /build/backend/dist /app/backend/dist
COPY --from=backend /build/backend/node_modules /app/backend/node_modules
COPY --from=backend /build/backend/package.json /app/backend/package.json

# Frontend Angular compilado (lo sirve NestJS en la misma URL)
COPY --from=frontend /build/frontend/dist/nextockfrontend-angular/browser /app/frontend/browser

# Script de arranque (lanza el ML y luego la API)
COPY start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
