import {
  getLocalizadoBySlug,
  getLugarBySlug,
  getStats,
  listLugares,
  searchLocalizados,
} from "@/lib/queries";
import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  function createQueryMock<T>(result: T) {
    const query = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      then: (onfulfilled: (value: T) => unknown) => onfulfilled(result),
    };
    return query;
  }

  return {
    connectDB: vi.fn(),
    Localizado: {
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      aggregate: vi.fn(),
      createQueryMock,
    },
    Lugar: {
      find: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
      collection: { name: "lugars" },
      createQueryMock,
    },
  };
});

vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/lib/models/Localizado", () => ({ Localizado: mocks.Localizado }));
vi.mock("@/lib/models/Lugar", () => ({ Lugar: mocks.Lugar }));

function createLugar(
  overrides: Partial<{
    _id: mongoose.Types.ObjectId;
    slug: string;
    nombre: string;
  }> = {}
) {
  return {
    _id: new mongoose.Types.ObjectId(),
    slug: "hospital-central",
    nombre: "Hospital Central",
    tipo: "hospital" as const,
    direccion: "Av. Principal",
    ciudad: "Caracas",
    estado: "Distrito Capital",
    ...overrides,
  };
}

function createLocalizado(
  overrides: Partial<{
    _id: mongoose.Types.ObjectId;
    slug: string;
    nombreCompleto: string;
    cedula: string;
    lugarId: mongoose.Types.ObjectId;
  }> = {}
) {
  return {
    _id: new mongoose.Types.ObjectId(),
    slug: "juan-perez",
    nombreCompleto: "Juan Perez",
    edad: "30",
    cedula: "12345678",
    telefono: "5551234",
    direccion: "Calle 1",
    observaciones: "",
    condicion: "vivo" as const,
    lugarId: new mongoose.Types.ObjectId(),
    fuente: { tipo: "manual" as const, nombre: "Test source" },
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connectDB.mockResolvedValue(undefined as unknown as typeof mongoose);
});

describe("getStats", () => {
  it("devuelve los conteos de ambos modelos", async () => {
    mocks.Localizado.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    mocks.Lugar.countDocuments.mockResolvedValue(3);

    const stats = await getStats();

    expect(mocks.connectDB).toHaveBeenCalledTimes(1);
    expect(mocks.Localizado.countDocuments).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        estado: "published",
      })
    );
    expect(mocks.Localizado.countDocuments).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        estado: "pending",
      })
    );
    expect(mocks.Lugar.countDocuments).toHaveBeenCalledWith();
    expect(stats).toEqual({
      totalLocalizados: 10,
      totalLugares: 3,
      totalPendientes: 2,
    });
  });
});

describe("searchLocalizados", () => {
  it("usa page=1 y limit=20 por defecto", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    const query = mocks.Localizado.createQueryMock([row]);
    mocks.Localizado.find.mockReturnValue(query as never);
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    const result = await searchLocalizados({});

    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(query.sort).toHaveBeenCalledWith({ nombreCompleto: 1 });
  });

  it("limita el límite a 100", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    mocks.Localizado.find.mockReturnValue(
      mocks.Localizado.createQueryMock([row]) as never
    );
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    const result = await searchLocalizados({ limit: 200 });

    expect(result.meta.limit).toBe(100);
  });

  it("calcula el skip a partir de page y limit", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    const query = mocks.Localizado.createQueryMock([row]);
    mocks.Localizado.find.mockReturnValue(query as never);
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    await searchLocalizados({ page: 3, limit: 10 });

    expect(query.skip).toHaveBeenCalledWith(20);
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it("busca por regex de cédula cuando q tiene 4 o más dígitos", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ cedula: "12345678", lugarId: lugar._id });
    mocks.Localizado.find.mockReturnValue(
      mocks.Localizado.createQueryMock([row]) as never
    );
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    await searchLocalizados({ q: "12-34.56-78" });

    const [filter] = mocks.Localizado.find.mock.calls[0];
    expect(filter).toMatchObject({ estado: "published" });
    expect((filter as { cedula: RegExp }).cedula).toBeInstanceOf(RegExp);
    expect((filter as { cedula: RegExp }).cedula.source).toBe("12345678");
  });

  it("busca por $text y ordena por textScore cuando q no tiene dígitos", async () => {
    const lugar = createLugar();
    const row = createLocalizado({
      nombreCompleto: "Juan Perez",
      lugarId: lugar._id,
    });
    const query = mocks.Localizado.createQueryMock([row]);
    mocks.Localizado.find.mockReturnValue(query as never);
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    await searchLocalizados({ q: "Juan Perez" });

    const [filter] = mocks.Localizado.find.mock.calls[0];
    expect(filter).toMatchObject({
      estado: "published",
      $text: { $search: "Juan Perez" },
    });
    expect(query.sort).toHaveBeenCalledWith({ score: { $meta: "textScore" } });
  });

  it("mantiene el filtro de publicados y orden por nombre cuando q está vacío o es espacio en blanco", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    const query = mocks.Localizado.createQueryMock([row]);
    mocks.Localizado.find.mockReturnValue(query as never);
    mocks.Localizado.countDocuments.mockResolvedValue(1);
    mocks.Lugar.find.mockReturnValue(mocks.Lugar.createQueryMock([lugar]) as never);

    await searchLocalizados({ q: "   " });

    const [filter] = mocks.Localizado.find.mock.calls[0];
    expect(filter).toMatchObject({ estado: "published" });
    expect(query.sort).toHaveBeenCalledWith({ nombreCompleto: 1 });
  });

  it("filtra por slug de lugar y resuelve lugarId", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    mocks.Lugar.findOne.mockReturnValue(mocks.Lugar.createQueryMock(lugar) as never);
    mocks.Localizado.find.mockReturnValue(
      mocks.Localizado.createQueryMock([row]) as never
    );
    mocks.Localizado.countDocuments.mockResolvedValue(1);

    await searchLocalizados({ lugar: lugar.slug });

    expect(mocks.Lugar.findOne).toHaveBeenCalledWith({ slug: lugar.slug });
    const [filter] = mocks.Localizado.find.mock.calls[0];
    expect(filter).toMatchObject({
      estado: "published",
      lugarId: lugar._id,
    });
  });

  it("devuelve una respuesta vacía cuando el slug de lugar es desconocido", async () => {
    mocks.Lugar.findOne.mockReturnValue(mocks.Lugar.createQueryMock(null) as never);
    const result = await searchLocalizados({ lugar: "unknown" });

    expect(result).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    expect(mocks.Localizado.find).not.toHaveBeenCalled();
  });
});

describe("getLocalizadoBySlug", () => {
  it("devuelve los DTOs cuando se encuentra el localizado", async () => {
    const lugar = createLugar();
    const row = { ...createLocalizado({ lugarId: lugar._id }), lugar };
    mocks.Localizado.aggregate.mockResolvedValue([row]);

    const result = await getLocalizadoBySlug("juan-perez");

    expect(result).not.toBeNull();
    expect(result?.localizado.slug).toBe("juan-perez");
    expect(result?.lugar.slug).toBe(lugar.slug);
    expect(mocks.Localizado.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({ slug: "juan-perez", estado: "published" }),
        }),
        expect.objectContaining({
          $lookup: expect.objectContaining({ from: "lugars" }),
        }),
      ])
    );
  });

  it("devuelve null cuando no se encuentra el localizado", async () => {
    mocks.Localizado.aggregate.mockResolvedValue([]);
    const result = await getLocalizadoBySlug("missing");

    expect(result).toBeNull();
  });
});

describe("listLugares", () => {
  it("mapea los lugares con totales de la agregación", async () => {
    const lugarA = createLugar({ slug: "a", nombre: "A" });
    const lugarB = createLugar({ slug: "b", nombre: "B" });
    const query = mocks.Lugar.createQueryMock([lugarA, lugarB]);
    mocks.Lugar.find.mockReturnValue(query as never);
    mocks.Localizado.aggregate.mockResolvedValue([
      { _id: lugarA._id, total: 5 },
      { _id: lugarB._id, total: 3 },
    ]);

    const result = await listLugares();

    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("a");
    expect(result[0].totalLocalizados).toBe(5);
    expect(result[1].slug).toBe("b");
    expect(result[1].totalLocalizados).toBe(3);
    expect(query.sort).toHaveBeenCalledWith({ nombre: 1 });
  });
});

describe("getLugarBySlug", () => {
  it("devuelve el DTO de lugar y localizados paginados", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    mocks.Lugar.findOne.mockReturnValue(mocks.Lugar.createQueryMock(lugar) as never);
    mocks.Localizado.aggregate.mockResolvedValue([
      {
        total: [{ n: 1 }],
        rows: [row],
      },
    ]);

    const result = await getLugarBySlug(lugar.slug, 1, 10);

    expect(result).not.toBeNull();
    expect(result?.lugar.slug).toBe(lugar.slug);
    expect(result?.localizados).toHaveLength(1);
    expect(result?.localizados[0].slug).toBe(row.slug);
    expect(result?.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it("devuelve null cuando el slug de lugar es desconocido", async () => {
    mocks.Lugar.findOne.mockReturnValue(mocks.Lugar.createQueryMock(null) as never);
    const result = await getLugarBySlug("unknown");

    expect(result).toBeNull();
  });

  it("clampea el límite a 100 cuando se pasa un valor mayor", async () => {
    const lugar = createLugar();
    const row = createLocalizado({ lugarId: lugar._id });
    mocks.Lugar.findOne.mockReturnValue(mocks.Lugar.createQueryMock(lugar) as never);
    mocks.Localizado.aggregate.mockResolvedValue([
      {
        total: [{ n: 1 }],
        rows: [row],
      },
    ]);

    const result = await getLugarBySlug(lugar.slug, 1, 200);

    expect(result?.meta.limit).toBe(100);
  });
});
