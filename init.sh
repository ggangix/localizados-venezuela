#!/usr/bin/env bash
#
# init.sh — arranque idempotente del entorno de desarrollo.
# Equivale a los pasos de CONTRIBUTING.md en un solo comando.
#
#   ./init.sh
#
set -euo pipefail

cd "$(dirname "$0")"

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$1"; }

# 1. Comprobar Node 22+
step "Comprobando Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js no está instalado. Requiere Node 22+." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  warn "Node $(node -v) detectado; se recomienda Node 22+."
fi

# 2. Instalar dependencias
step "Instalando dependencias (npm install)"
npm install

# 3. Variables de entorno
step "Configurando .env.local"
if [ -f .env.local ]; then
  echo ".env.local ya existe, se conserva."
else
  cp .env.example .env.local
  echo ".env.local creado desde .env.example (ajusta los valores si hace falta)."
fi

# 4. Base de datos (best-effort vía docker compose)
step "Levantando MongoDB"
if docker compose version >/dev/null 2>&1; then
  if docker compose up -d mongo; then
    echo "MongoDB arriba (docker compose)."
  else
    warn "No se pudo iniciar MongoDB (¿puerto 27017 ocupado?). Continúo."
  fi
else
  warn "Docker no disponible; asegúrate de tener MongoDB en MONGODB_URI."
fi

# 5. Datos de ejemplo (best-effort: requiere MongoDB)
step "Sembrando datos de ejemplo"
if npm run seed:sample; then
  echo "Datos de ejemplo sembrados."
else
  warn "No se pudo sembrar (¿MongoDB disponible?). Puedes correr 'npm run seed:sample' luego."
fi

# 6. Health-check: la misma compuerta que se exige antes de un PR
step "Validando el proyecto (npm run verify)"
npm run verify

printf '\n\033[1;32m✅ Entorno listo. Arranca con: npm run dev\033[0m\n'
