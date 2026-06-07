#!/usr/bin/env bash
# Arranca el microservicio ML (FastAPI) y el backend NestJS dentro del mismo
# contenedor. Si cualquiera de los dos termina, el contenedor se detiene.
set -e

echo "→ Iniciando microservicio ML (FastAPI) en 127.0.0.1:8000 ..."
cd /app/MLNEXTOCK
/opt/venv/bin/python -m uvicorn src.api:app --host 127.0.0.1 --port 8000 &
ML_PID=$!

echo "→ Iniciando backend NestJS (API + Angular) en el puerto ${PORT:-3000} ..."
cd /app/backend
node dist/main &
API_PID=$!

# Espera a que cualquiera de los dos procesos termine y propaga la salida.
wait -n "$ML_PID" "$API_PID"
echo "✖ Un proceso terminó; deteniendo el contenedor."
kill "$ML_PID" "$API_PID" 2>/dev/null || true
