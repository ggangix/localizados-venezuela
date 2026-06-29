import { connectDB } from "@/lib/db";
import { Localizado } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
import type {
  LeanLugar,
  LocalizadoSource,
  LocalizadoWithLugar,
} from "@/lib/mongoose-types";
import { toLocalizadoDTO, toLugarDTO } from "@/lib/serializers";
import type { ApiListResponse, LocalizadoDTO, LugarDTO } from "@/lib/types";

const PUBLISHED = {
  estado: "published" as const,
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSuggestionFilter(q?: string) {
  const term = q?.trim();
  if (!term) return null;

  const normalized = term.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const escaped = escapeRegExp(normalized);
  const regex = `(^|\\s)${escaped}`;
  const digits = normalized.replace(/\D/g, "");

  const clauses: Record<string, unknown>[] = [
    { nombreCompleto: { $regex: regex, $options: "i" } },
    { nombreNormalizado: { $regex: regex, $options: "i" } },
  ];

  if (digits) {
    clauses.push({ cedula: { $regex: `^${escapeRegExp(digits)}`, $options: "i" } });
    clauses.push({ telefono: { $regex: `^${escapeRegExp(digits)}`, $options: "i" } });
  }

  return {
    estado: "published",
    deletedAt: { $exists: false },
    $or: clauses,
  };
}

async function serializeLocalizadoRows(
  rows: LocalizadoListRow[]
): Promise<LocalizadoDTO[]> {
  if (rows.length === 0) return [];

  const lugarIds = [...new Set(rows.map((r) => String(r.lugarId)))];
  const lugares = await Lugar.find({ _id: { $in: lugarIds } }).lean<LeanLugar[]>();
  const lugarMap = new Map(lugares.map((l) => [String(l._id), l]));

  return rows.flatMap((row) => {
    const lugar = lugarMap.get(String(row.lugarId));
    if (!lugar) return [];
    return [toLocalizadoDTO(row, lugar)];
  });
}

function buildSearchFilter(q?: string, lugarId?: unknown) {
  const filter: Record<string, unknown> = { ...PUBLISHED };
  if (lugarId) filter.lugarId = lugarId;

  const term = q?.trim();
  if (!term) return filter;

  const digits = term.replace(/\D/g, "");
  if (digits.length >= 4) {
    filter.cedula = new RegExp(digits);
    return filter;
  }

  filter.$text = { $search: term };
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

export async function searchLocalizadoSuggestions(
  q?: string,
  limit = 5
): Promise<ApiListResponse<LocalizadoDTO>> {
  await connectDB();
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit || 5)));
  const filter = buildSuggestionFilter(q);

  if (!filter) {
    return { data: [], meta: { page: 1, limit: safeLimit, total: 0, totalPages: 0 } };
  }

  const [rows, total] = await Promise.all([
    Localizado.find(filter, LIST_PROJECTION)
      .sort({ nombreCompleto: 1 })
      .limit(safeLimit)
      .lean<LocalizadoListRow[]>(),
    Localizado.countDocuments(filter),
  ]);

  return {
    data: await serializeLocalizadoRows(rows),
    meta: {
      page: 1,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

export async function searchLocalizados(params: {
  q?: string;
  lugar?: string;
  page?: number;
  limit?: number;
}): Promise<ApiListResponse<LocalizadoDTO>> {
  await connectDB();
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));

  let lugarId: unknown;
  if (params.lugar) {
    const lugar = await Lugar.findOne({ slug: params.lugar }).select("_id").lean();
    if (!lugar) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }
    lugarId = lugar._id;
  }

  const filter = buildSearchFilter(params.q, lugarId);
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

  const data = await serializeLocalizadoRows(rows);

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
  const safePage = Math.max(1, Math.floor(page));

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
