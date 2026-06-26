## Por qué
Hay devs que quieren colaborar pero no saben por dónde empezar. Un `CONTRIBUTING.md` corto reduce fricción.

## Qué hacer
Crear `CONTRIBUTING.md` en español con:

1. **Requisitos:** Node 22+, MongoDB
2. **Arranque:** `npm install` → `cp .env.example .env.local` → `npm run seed:sample` → `npm run dev`
3. **Antes del PR:** `npm run check` y `npm run build`
4. **Flujo:** fork → rama → commit → PR
5. **Bugs:** incluir pasos y, si aplica, datos de `seed/sample/`
6. Enlace a issues con label `good first issue`

Añadir en el README una línea que enlace a este archivo.

## Listo cuando
- [ ] `CONTRIBUTING.md` existe y está en español
- [ ] README enlaza al archivo
- [ ] No repite todo el README (solo lo esencial para contribuir)