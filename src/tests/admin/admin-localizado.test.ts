import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const { findById, find, findOne, create, updateMany, bulkWrite } = vi.hoisted(() => ({
  findById: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  bulkWrite: vi.fn(),
}));

vi.mock("@/lib/models/Localizado", () => ({
  Localizado: { findById, find, findOne, create, updateMany, bulkWrite },
  normalizeNombre: (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim(),
}));

const { lugarFindById, lugarFind, lugarCreate } = vi.hoisted(() => ({
  lugarFindById: vi.fn(),
  lugarFind: vi.fn(),
  lugarCreate: vi.fn(),
}));

vi.mock("@/lib/models/Lugar", () => ({
  Lugar: {
    find: lugarFind,
    findById: lugarFindById,
    create: lugarCreate,
  },
}));

import {
  createLocalizado,
  updateLocalizado,
  softDeleteLocalizados,
  restoreLocalizados,
  resolveLugarId,
  setEstadoLocalizados,
} from "@/lib/admin-localizado";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveLugarId", () => {
  it("retorna id si lugarId existe", async () => {
    lugarFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: "lugar-id" }),
    });
    const id = await resolveLugarId("lugar-id", undefined);
    expect(id).toBe("lugar-id");
  });

  it("lanza error si lugarId no encontrado", async () => {
    lugarFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
    await expect(resolveLugarId("bad-id", undefined)).rejects.toThrow(
      "Lugar no encontrado"
    );
  });

  it("crea lugar nuevo si lugarNombre no existe", async () => {
    lugarFind.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    lugarCreate.mockResolvedValue({ _id: "new-lugar-id" });
    const id = await resolveLugarId(undefined, "Nuevo Hospital");
    expect(id).toBe("new-lugar-id");
    expect(lugarCreate).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Nuevo Hospital" })
    );
  });
});

describe("createLocalizado", () => {
  it("crea localizado con input minimo", async () => {
    lugarFind.mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          { _id: "lugar-id", slug: "test", nombre: "Test Lugar", tipo: "recinto" },
        ]),
    });
    findOne.mockResolvedValue(null);
    create.mockResolvedValue({
      _id: "new-id",
      slug: "juan-perez-abc123",
      nombreCompleto: "Juan Perez",
    });

    const result = await createLocalizado({
      nombreCompleto: "Juan Perez",
      lugarNombre: "Test Lugar",
    });

    expect(result).toBeDefined();
    expect(result._id).toBe("new-id");
    expect(create).toHaveBeenCalledOnce();
  });

  it("rechaza nombre vacio", async () => {
    await expect(createLocalizado({ nombreCompleto: "  " })).rejects.toThrow(
      "nombreCompleto requerido"
    );
  });

  it("rechaza duplicado si estado es published", async () => {
    lugarFind.mockReturnValue({
      lean: vi
        .fn()
        .mockResolvedValue([
          { _id: "lugar-id", slug: "test", nombre: "Test", tipo: "recinto" },
        ]),
    });
    findOne.mockResolvedValue({ _id: "existing" });

    await expect(
      createLocalizado({
        nombreCompleto: "Juan Perez",
        lugarNombre: "Test",
        estado: "published",
      })
    ).rejects.toThrow("Ya existe publicado");
  });
});

describe("updateLocalizado", () => {
  it("actualiza campos de persona", async () => {
    const doc = {
      _id: "id-1",
      nombreCompleto: "Juan Perez",
      nombreNormalizado: "JUAN PEREZ",
      edad: "30",
      save: vi.fn().mockResolvedValue({}),
    };
    findById.mockResolvedValue(doc);

    await updateLocalizado("id-1", { nombreCompleto: "Juan Actualizado" });

    expect(doc.nombreCompleto).toBe("Juan Actualizado");
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it("restaura deletedAt si patch.restore es true", async () => {
    const doc = {
      _id: "id-1",
      deletedAt: new Date(),
      deletedBy: "admin",
      nombreCompleto: "Juan",
      nombreNormalizado: "JUAN",
      save: vi.fn().mockResolvedValue({}),
    };
    findById.mockResolvedValue(doc);

    await updateLocalizado("id-1", { restore: true });

    expect(doc.deletedAt).toBeUndefined();
    expect(doc.deletedBy).toBeUndefined();
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it("lanza error si doc no existe", async () => {
    findById.mockResolvedValue(null);
    await expect(updateLocalizado("bad-id", {})).rejects.toThrow(
      "Persona no encontrada"
    );
  });
});

describe("softDeleteLocalizados", () => {
  it("marca como borrados y retorna count", async () => {
    updateMany.mockResolvedValue({ modifiedCount: 3 });

    const count = await softDeleteLocalizados(["a", "b", "c"]);

    expect(count).toBe(3);
    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["a", "b", "c"] } },
      { $set: { deletedAt: expect.any(Date), deletedBy: "admin" } }
    );
  });
});

describe("restoreLocalizados", () => {
  it("limpia deletedAt y deletedBy", async () => {
    updateMany.mockResolvedValue({ modifiedCount: 2 });

    const count = await restoreLocalizados(["a", "b"]);

    expect(count).toBe(2);
    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["a", "b"] } },
      { $unset: { deletedAt: "", deletedBy: "" } }
    );
  });
});

describe("setEstadoLocalizados", () => {
  it("retorna reporte granular con resultados", async () => {
    find.mockResolvedValue([
      { _id: "a", lugarId: "L1", nombreNormalizado: "ana", deletedAt: null },
      { _id: "b", lugarId: "L2", nombreNormalizado: "beto", deletedAt: null },
    ]);
    findOne.mockResolvedValue(null);
    bulkWrite.mockResolvedValue({});

    const res = await setEstadoLocalizados(["a", "b"], "published");

    expect(res.total).toBe(2);
    expect(res.affected).toBe(2);
    expect(res.results).toEqual([
      { id: "a", ok: true },
      { id: "b", ok: true },
    ]);
  });

  it("reporta persona no encontrada", async () => {
    find.mockResolvedValue([{ _id: "a", lugarId: "L1", nombreNormalizado: "ana" }]);

    const res = await setEstadoLocalizados(["a", "b"], "published");
    expect(res.results[1]).toEqual({
      id: "b",
      ok: false,
      error: "Persona no encontrada",
    });
  });
});
