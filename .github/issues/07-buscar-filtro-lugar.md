## Por qué
Mucha gente busca por hospital («¿quién está en Domingo Luciani?»). La API ya acepta `?lugar={slug}` pero el formulario de `/buscar` no lo ofrece.

## Qué hacer
1. Añadir selector de lugar en la búsqueda (dropdown o autocomplete)
2. Cargar lugares con `listLugares()` en servidor o `GET /api/v1/lugares`
3. URL resultante: `/buscar?lugar=hospital-domingo-luciani` o combinado con `q`

## Listo cuando
- [ ] Se puede filtrar solo por lugar (sin texto)
- [ ] Se puede combinar texto + lugar
- [ ] El filtro se mantiene al paginar (si ya hay paginación)
- [ ] `npm run build` OK