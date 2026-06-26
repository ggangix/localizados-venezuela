#!/usr/bin/env bash
set -euo pipefail

REPO="ggangix/localizados-venezuela"
DIR="$(cd "$(dirname "$0")" && pwd)"

gh issue create -R "$REPO" -l "good first issue" -l documentation \
  -t "Añadir archivo LICENSE (MIT)" -F "$DIR/01-license.md"

gh issue create -R "$REPO" -l "good first issue" -l documentation \
  -t "Crear CONTRIBUTING.md en español" -F "$DIR/02-contributing.md"

gh issue create -R "$REPO" -l "good first issue" -l enhancement \
  -t "Paginación en /buscar cuando hay muchos resultados" -F "$DIR/03-buscar-paginacion.md"

gh issue create -R "$REPO" -l "good first issue" -l enhancement \
  -t "Paginación en la página de cada lugar" -F "$DIR/04-lugar-paginacion.md"

gh issue create -R "$REPO" -l enhancement -l "help wanted" \
  -t "Panel de moderación para publicar contribuciones (fase 2)" -F "$DIR/05-panel-moderacion.md"

gh issue create -R "$REPO" -l enhancement \
  -t "Añadir tests al CI (serializers y queries)" -F "$DIR/06-tests.md"

gh issue create -R "$REPO" -l enhancement \
  -t "Filtro por hospital/lugar en /buscar" -F "$DIR/07-buscar-filtro-lugar.md"

echo ""
echo "Issues creadas:"
gh issue list -R "$REPO" --limit 10