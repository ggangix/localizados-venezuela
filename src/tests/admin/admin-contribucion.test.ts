import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const { contribFindById } = vi.hoisted(() => ({ contribFindById: vi.fn() }));

vi.mock("@/lib/models/Contribucion", () => ({
  Contribucion: { findById: contribFindById },
}));

const { localizadoFindOne, localizadoCreate, localizadoUpdateMany } = vi.hoisted(
  () => ({
    localizadoFindOne: vi.fn(),
    localizadoCreate: vi.fn(),
    localizadoUpdateMany: vi.fn(),
  })
);

vi.mock("@/lib/models/Localizado", () => ({
  Localizado: {
    findOne: localizadoFindOne,
    create: localizadoCreate,
    updateMany: localizadoUpdateMany,
  },
  normalizeNombre: (s: string) => s.toUpperCase().trim(),
}));

const { lugarFind, lugarFindById, lugarCreate } = vi.hoisted(() => ({
  lugarFind: vi.fn(),
  lugarFindById: vi.fn(),
  lugarCreate: vi.fn(),
}));

vi.mock("@/lib/models/Lugar", () => ({
  Lugar: {
    find: lugarFind,
    findById: lugarFindById,
    create: lugarCreate,
  },
}));

import { approveContribucion, rejectContribucion } from "@/lib/admin-contribucion";

const CONTRIB_ID = "507f1f77bcf86cd799439011";
const LUGAR_MOCK = {
  _id: "lugar-1",
  slug: "hospital-central",
  nombre: "Hospital Central",
  tipo: "hospital",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function makeContrib(overrides: Record<string, unknown> = {}) {
  return {
    _id: CONTRIB_ID,
    tipo: "persona",
    estado: "pending",
    persona: { nombreCompleto: "Juan Perez", lugarNombre: "Hospital Central" },
    fuenteNombre: "Web",
    fuenteUrl: null,
    set: vi.fn(),
    save: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("approveContribucion", () => {
  it("aprueba contribucion tipo persona creando localizado", async () => {
    const contrib = makeContrib();
    contribFindById.mockResolvedValue(contrib);
    lugarFind.mockReturnValue({ lean: vi.fn().mockResolvedValue([LUGAR_MOCK]) });
    lugarFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(LUGAR_MOCK) });
    localizadoFindOne.mockResolvedValue(null);
    localizadoCreate.mockResolvedValue({
      _id: "localizado-1",
      nombreCompleto: "Juan Perez",
    });

    const result = await approveContribucion(CONTRIB_ID, { moderadoPor: "admin" });

    expect(result.tipo).toBe("persona");
    expect(result.contribucionId).toBe(CONTRIB_ID);
    expect(result.localizadoId).toBe("localizado-1");
    expect(contribFindById).toHaveBeenCalledWith(CONTRIB_ID);
    expect(localizadoCreate).toHaveBeenCalledOnce();
    expect(contrib.save).toHaveBeenCalled();
  });

  it("aprueba contribucion tipo lista_imagen", async () => {
    const contrib = makeContrib({ tipo: "lista_imagen" });
    contribFindById.mockResolvedValue(contrib);

    const result = await approveContribucion(CONTRIB_ID, {});

    expect(result.tipo).toBe("lista_imagen");
    expect(result.contribucionId).toBe(CONTRIB_ID);
    expect(contrib.set).toHaveBeenCalledWith(
      expect.objectContaining({ estado: "published" })
    );
    expect(contrib.save).toHaveBeenCalled();
  });

  it("lanza error si contribucion no encontrada", async () => {
    contribFindById.mockResolvedValue(null);
    await expect(approveContribucion("bad-id", {})).rejects.toThrow(
      "Contribuci\u00f3n no encontrada"
    );
  });

  it("lanza error si contribucion no esta pending", async () => {
    contribFindById.mockResolvedValue(makeContrib({ estado: "rejected" }));
    await expect(approveContribucion(CONTRIB_ID, {})).rejects.toThrow(
      "Solo se aprueban contribuciones pending"
    );
  });

  it("lanza error si persona no tiene nombre", async () => {
    contribFindById.mockResolvedValue(
      makeContrib({ persona: { lugarNombre: "Test" } })
    );
    await expect(approveContribucion(CONTRIB_ID, {})).rejects.toThrow(
      "Falta nombre de la persona"
    );
  });

  it("actualiza localizado existente si contribucionId ya tiene uno", async () => {
    const contrib = makeContrib();
    contribFindById.mockResolvedValue(contrib);

    const existingDoc = {
      _id: "localizado-1",
      nombreCompleto: "Juan",
      nombreNormalizado: "JUAN",
      save: vi.fn().mockResolvedValue({}),
    };
    localizadoFindOne.mockResolvedValue(existingDoc);
    lugarFind.mockReturnValue({ lean: vi.fn().mockResolvedValue([LUGAR_MOCK]) });

    const result = await approveContribucion(CONTRIB_ID, {
      personaPatch: { nombreCompleto: "Juan Perez Actualizado" },
    });

    expect(result.localizadoId).toBe("localizado-1");
    expect(existingDoc.nombreCompleto).toBe("Juan Perez Actualizado");
    expect(existingDoc.save).toHaveBeenCalled();
  });
});

describe("rejectContribucion", () => {
  it("rechaza contribucion y actualiza localizados relacionados", async () => {
    const contrib = makeContrib();
    contribFindById.mockResolvedValue(contrib);
    localizadoUpdateMany.mockResolvedValue({ modifiedCount: 2 });

    const result = await rejectContribucion(CONTRIB_ID, {
      moderadoPor: "admin",
      notasModeracion: "Datos incompletos",
    });

    expect(result.contribucionId).toBe(CONTRIB_ID);
    expect(contrib.estado).toBe("rejected");
    expect(contrib.notasModeracion).toBe("Datos incompletos");
    expect(contrib.save).toHaveBeenCalled();
    expect(localizadoUpdateMany).toHaveBeenCalledWith(
      { contribucionId: contrib._id },
      { $set: { estado: "rejected" } }
    );
  });

  it("lanza error si contribucion no encontrada", async () => {
    contribFindById.mockResolvedValue(null);
    await expect(rejectContribucion("bad-id", {})).rejects.toThrow(
      "Contribuci\u00f3n no encontrada"
    );
  });

  it("lanza error si no esta pending", async () => {
    contribFindById.mockResolvedValue(makeContrib({ estado: "published" }));
    await expect(rejectContribucion(CONTRIB_ID, {})).rejects.toThrow(
      "Solo se rechazan contribuciones pending"
    );
  });
});
