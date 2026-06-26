import { connectDB } from "@/lib/db";
import { CONDICIONES, EDAD_MAX, EDAD_MIN, LUGAR_TIPOS } from "@/lib/constants";
import { Localizado } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
import type {
  LeanLugar,
  LocalizadoSource,
  LocalizadoWithLugar,
} from "@/lib/mongoose-types";
import { toLocalizadoDTO, toLugarDTO } from "@/lib/serializers";
import type {
  ApiListResponse,
  CondicionPersona,
  LocalizadoDTO,
  LugarDTO,
  LugarTipo,
} from "@/lib/types";

const PUBLISHED = {
  estado: "published" as const,
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

/** Valida/normaliza filtros que llegan como string crudo desde la URL. */
export function coerceCondicion(v?: string | null): CondicionPersona | undefined {
  return v && CONDICIONES.includes(v as CondicionPersona)
    ? (v as CondicionPersona)
    : undefined;
}

export function coerceTipo(v?: string | null): LugarTipo | undefined {
  return v && LUGAR_TIPOS.includes(v as LugarTipo) ? (v as LugarTipo) : undefined;
}

export function coerceEdad(v?: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < EDAD_MIN || n > EDAD_MAX) return undefined;
  return Math.floor(n);
}

const LIST_PROJECTION = {
  slug: 1,
  nombreCompleto: 1,
  edad: 1,
  cedula: 1,
  telefono: 1,
  direccion: 1,
  observaciones: 1,
  condicion: 1,
  lugarId: 1,
  fuente: 1,
  createdAt: 1,
} as const;

type LocalizadoListRow = LocalizadoSource & { lugarId: LeanLugar["_id"] };

/**
 * Resuelve a qué lugares acotar la búsqueda según slug y/o tipo.
 * - ids === null  → sin restricción por lugar
 * - noMatch === true → ningún lugar coincide, la búsqueda debe devolver vacío
 */
async function resolveLugarConstraint(
  lugarSlug?: string,
  tipo?: LugarTipo
): Promise<{ ids: LeanLugar["_id"][] | null; noMatch: boolean }> {
  if (!lugarSlug && !tipo) return { ids: null, noMatch: false };

  const lugarFilter: Record<string, unknown> = {};
  if (lugarSlug) lugarFilter.slug = lugarSlug;
  if (tipo) lugarFilter.tipo = tipo;

  const lugares = await Lugar.find(lugarFilter)
    .select("_id")
    .lean<{ _id: LeanLugar["_id"] }[]>();

  if (lugares.length === 0) return { ids: [], noMatch: true };
  return { ids: lugares.map((l) => l._id), noMatch: false };
}

function buildSearchFilter(opts: {
  q?: string;
  lugarIds?: LeanLugar["_id"][] | null;
  condicion?: CondicionPersona;
  edadMin?: number;
  edadMax?: number;
}) {
  const { q, lugarIds, condicion, edadMin, edadMax } = opts;
  const filter: Record<string, unknown> = { ...PUBLISHED };

  if (lugarIds && lugarIds.length > 0) {
    filter.lugarId = lugarIds.length === 1 ? lugarIds[0] : { $in: lugarIds };
  }

  if (condicion) filter.condicion = condicion;

  // `edad` se guarda como String heterogéneo ("74", "8 años", "") →
  // extraemos el primer número con regex y lo convertimos a int en la consulta.
  // Sin dígitos (o vacío) queda en null y se excluye del rango.
  if (edadMin != null || edadMax != null) {
    const edadDigits = {
      $let: {
        vars: {
          m: { $regexFind: { input: { $toString: "$edad" }, regex: "[0-9]+" } },
        },
        in: "$$m.match",
      },
    };
    const edadInt = {
      $convert: { input: edadDigits, to: "int", onError: null, onNull: null },
    };
    const conds: unknown[] = [{ $ne: [edadInt, null] }];
    if (edadMin != null) conds.push({ $gte: [edadInt, edadMin] });
    if (edadMax != null) conds.push({ $lte: [edadInt, edadMax] });
    filter.$expr = { $and: conds };
  }

  const term = q?.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    const letters = (term.match(/[a-zA-Z]/g) ?? []).length;
    // Cédula solo si el término es predominantemente numérico (permite un
    // prefijo tipo V/E). Coincide por prefijo y anclado al inicio para poder
    // usar el índice `cedula` y evitar falsos positivos por substring.
    // `digits` solo contiene [0-9], así que es seguro en el patrón.
    if (digits.length >= 4 && letters <= 1) {
      filter.cedula = new RegExp("^" + digits);
    } else {
      filter.$text = { $search: term };
    }
  }

  return filter;
}

export async function getStats() {
  await connectDB();
  const [totalLocalizados, totalLugares, totalPendientes] = await Promise.all([
    Localizado.countDocuments(PUBLISHED),
    Lugar.countDocuments(),
    Localizado.countDocuments({ estado: "pending" }),
  ]);
  return { totalLocalizados, totalLugares, totalPendientes };
}

export async function searchLocalizados(params: {
  q?: string;
  lugar?: string;
  condicion?: CondicionPersona;
  tipo?: LugarTipo;
  edadMin?: number;
  edadMax?: number;
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<LocalizadoDTO>> {
  await connectDB();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));

  const { ids: lugarFilterIds, noMatch } = await resolveLugarConstraint(
    params.lugar,
    params.tipo
  );
  if (noMatch) {
    return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }

  const filter = buildSearchFilter({
    q: params.q,
    lugarIds: lugarFilterIds,
    condicion: params.condicion,
    edadMin: params.edadMin,
    edadMax: params.edadMax,
  });
  const usesText = "$text" in filter;

  const query = Localizado.find(filter, LIST_PROJECTION)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean<LocalizadoListRow[]>();

  if (usesText) {
    query.sort({ score: { $meta: "textScore" } });
  } else {
    query.sort({ nombreCompleto: 1 });
  }

  const [rows, total] = await Promise.all([query, Localizado.countDocuments(filter)]);

  if (rows.length === 0) {
    return {
      data: [],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  const lugarIds = [...new Set(rows.map((r) => String(r.lugarId)))];
  const lugares = await Lugar.find({ _id: { $in: lugarIds } }).lean<LeanLugar[]>();
  const lugarMap = new Map(lugares.map((l) => [String(l._id), l]));

  const data = rows.flatMap((row) => {
    const lugar = lugarMap.get(String(row.lugarId));
    if (!lugar) return [];
    return [toLocalizadoDTO(row, lugar)];
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLocalizadoBySlug(slug: string) {
  await connectDB();
  const rows = await Localizado.aggregate<LocalizadoWithLugar>([
    { $match: { slug, ...PUBLISHED } },
    {
      $lookup: {
        from: Lugar.collection.name,
        localField: "lugarId",
        foreignField: "_id",
        as: "lugar",
      },
    },
    { $unwind: "$lugar" },
    { $limit: 1 },
  ]);

  const row = rows[0];
  if (!row) return null;

  return {
    localizado: toLocalizadoDTO(row, row.lugar),
    lugar: row.lugar,
  };
}

export async function listLugares(): Promise<LugarDTO[]> {
  await connectDB();
  const lugares = await Lugar.find().sort({ nombre: 1 }).lean<LeanLugar[]>();
  const counts = await Localizado.aggregate<{ _id: LeanLugar["_id"]; total: number }>([
    { $match: PUBLISHED },
    { $group: { _id: "$lugarId", total: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.total]));
  return lugares.map((l) => toLugarDTO(l, countMap.get(String(l._id)) ?? 0));
}

type LugarFacetResult = {
  total: { n: number }[];
  rows: LocalizadoListRow[];
};

export async function getLugarBySlug(slug: string, page = 1, limit = 50) {
  await connectDB();
  const lugar = await Lugar.findOne({ slug }).lean<LeanLugar | null>();
  if (!lugar) return null;

  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);

  const [result] = await Localizado.aggregate<LugarFacetResult>([
    { $match: { lugarId: lugar._id, ...PUBLISHED } },
    {
      $facet: {
        total: [{ $count: "n" }],
        rows: [
          { $sort: { nombreCompleto: 1 } },
          { $skip: (safePage - 1) * safeLimit },
          { $limit: safeLimit },
          { $project: LIST_PROJECTION },
        ],
      },
    },
  ]);

  const total = result?.total[0]?.n ?? 0;
  const rows = result?.rows ?? [];

  return {
    lugar: toLugarDTO(lugar, total),
    localizados: rows.map((l) => toLocalizadoDTO(l, lugar)),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}
