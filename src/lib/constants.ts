import type { CondicionPersona, LugarTipo } from "@/lib/types";

export const DESAPARECIDOS_URL = "https://desaparecidosterremotovenezuela.com/";

export const CONDICIONES: CondicionPersona[] = ["vivo", "fallecido", "desconocido"];
export const LUGAR_TIPOS: LugarTipo[] = ["hospital", "recinto", "direccion", "otro"];

export const CONDICION_LABELS: Record<CondicionPersona, string> = {
  vivo: "Vivo",
  fallecido: "Fallecido",
  desconocido: "Sin confirmar",
};

export const LUGAR_TIPO_LABELS: Record<LugarTipo, string> = {
  hospital: "Hospital",
  recinto: "Recinto",
  direccion: "Dirección",
  otro: "Otro",
};

export const EDAD_MIN = 0;
export const EDAD_MAX = 130;
