/**
 * Regla de envío del formulario de búsqueda. Solo tiene sentido navegar a
 * `/buscar` si hay texto real (después de recortar espacios) o algún filtro
 * activo. Evita la redirección vacía cuando alguien da a "Buscar" sin escribir
 * nada, sin bloquear la búsqueda que usa solo filtros.
 */
export function shouldSubmitSearch(q: string, hasFilters: boolean): boolean {
  return q.trim().length > 0 || hasFilters;
}
