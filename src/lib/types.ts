export type LugarTipo = "hospital" | "recinto" | "direccion" | "otro";
export type EstadoPublicacion = "published" | "pending" | "rejected";
export type FuenteTipo = "excel" | "contribucion" | "ocr" | "manual";
export type ContribucionTipo = "persona" | "lista_imagen";
export type CondicionPersona = "vivo" | "fallecido" | "desconocido";

export interface FuenteInfo {
  tipo: FuenteTipo;
  nombre: string;
  url?: string;
  notas?: string;
  fecha?: string;
}

export interface LocalizadoDTO {
  slug: string;
  nombreCompleto: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion: CondicionPersona;
  lugarSlug: string;
  lugarNombre: string;
  fuente: FuenteInfo;
  publicadoEn: string;
}

export interface LugarDTO {
  slug: string;
  nombre: string;
  tipo: LugarTipo;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  totalLocalizados: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
