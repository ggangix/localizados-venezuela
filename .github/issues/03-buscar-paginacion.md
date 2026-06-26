## Por qué
En `/buscar`, si hay más de 20 resultados, el usuario no puede ver el resto. La API ya soporta `page` y `limit`; la página solo falta la UI.

## Qué hacer
1. Si `meta.totalPages > 1`, mostrar controles de paginación (Anterior / Siguiente o números)
2. Mantener `q` en la URL al cambiar de página: `/buscar?q=gonzalez&page=2`
3. Mostrar texto tipo: «Página 2 de 5»
4. Componente reutilizable `Pagination` (se usará también en lugares)

## Archivos de referencia
- `src/app/buscar/page.tsx`
- `src/lib/queries.ts` → `searchLocalizados`

## Listo cuando
- [ ] Se puede navegar entre páginas de resultados
- [ ] Funciona en móvil
- [ ] Botones con `aria-label` accesibles
- [ ] `npm run check` y `npm run build` pasan