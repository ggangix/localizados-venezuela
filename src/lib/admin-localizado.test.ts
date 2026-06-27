import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---------------------------------------------------------------
vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const { find, findOne, bulkWrite } = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  bulkWrite: vi.fn(),
}));

vi.mock("@/lib/models/Localizado", () => ({
  Localizado: { find, findOne, bulkWrite },
  normalizeNombre: (s: string) => s.toLowerCase(),
}));

// Imported after the mocks are registered.
import { setEstadoLocalizados } from "@/lib/admin-localizado";

type Doc = {
  _id: string;
  lugarId: string;
  nombreNormalizado: string;
  deletedAt?: Date;
};

beforeEach(() => {
  vi.clearAllMocks();
  bulkWrite.mockResolvedValue({});
});

describe("setEstadoLocalizados", () => {
  it("reporta correctamente una operación parcialmente fallida", async () => {
    const docs: Doc[] = [
      { _id: "a", lugarId: "L1", nombreNormalizado: "ana" },
      // "b" no existe en la BD a propósito
      { _id: "c", lugarId: "L1", nombreNormalizado: "carlos" },
    ];
    find.mockResolvedValue(docs);
    // "carlos" ya tiene un publicado en el mismo lugar -> conflicto
    findOne.mockImplementation((q: { nombreNormalizado: string }) =>
      Promise.resolve(q.nombreNormalizado === "carlos" ? { _id: "dup" } : null)
    );

    const res = await setEstadoLocalizados(["a", "b", "c"], "published");

    expect(res.total).toBe(3);
    expect(res.affected).toBe(1);
    expect(res.results).toEqual([
      { id: "a", ok: true },
      { id: "b", ok: false, error: "Persona no encontrada" },
      {
        id: "c",
        ok: false,
        error: "Conflicto: ya existe otra persona publicada con ese nombre en el lugar",
      },
    ]);

    // Solo se escribe el registro válido, en una sola llamada bulkWrite.
    expect(bulkWrite).toHaveBeenCalledTimes(1);
    expect(bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: { filter: { _id: "a" }, update: { $set: { estado: "published" } } },
      },
    ]);
  });

  it("publica todos cuando no hay conflictos", async () => {
    find.mockResolvedValue([
      { _id: "a", lugarId: "L1", nombreNormalizado: "ana" },
      { _id: "b", lugarId: "L2", nombreNormalizado: "beto" },
    ]);
    findOne.mockResolvedValue(null);

    const res = await setEstadoLocalizados(["a", "b"], "published");

    expect(res).toEqual({
      total: 2,
      affected: 2,
      results: [
        { id: "a", ok: true },
        { id: "b", ok: true },
      ],
    });
    expect(bulkWrite).toHaveBeenCalledTimes(1);
  });

  it("marca como duplicado un registro repetido dentro de la misma selección", async () => {
    find.mockResolvedValue([
      { _id: "a", lugarId: "L1", nombreNormalizado: "ana" },
      { _id: "b", lugarId: "L1", nombreNormalizado: "ana" },
    ]);
    findOne.mockResolvedValue(null);

    const res = await setEstadoLocalizados(["a", "b"], "published");

    expect(res.affected).toBe(1);
    expect(res.results[1]).toEqual({
      id: "b",
      ok: false,
      error: "Duplicado dentro de la selección",
    });
  });

  it("para reject no valida duplicados", async () => {
    find.mockResolvedValue([{ _id: "a", lugarId: "L1", nombreNormalizado: "ana" }]);

    const res = await setEstadoLocalizados(["a"], "rejected");

    expect(res.affected).toBe(1);
    expect(findOne).not.toHaveBeenCalled();
    expect(bulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: "a" }, update: { $set: { estado: "rejected" } } } },
    ]);
  });
});
