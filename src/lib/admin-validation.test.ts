import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";

// --- Mocks ---------------------------------------------------------------
vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const { locFindById, contribFindById } = vi.hoisted(() => ({
  locFindById: vi.fn(),
  contribFindById: vi.fn(),
}));

vi.mock("@/lib/models/Localizado", () => ({
  Localizado: { findById: locFindById },
  normalizeNombre: (s: string) => s.toLowerCase(),
}));

vi.mock("@/lib/models/Contribucion", () => ({
  Contribucion: { findById: contribFindById },
}));

// Imported after the mocks are registered.
import { updateLocalizado } from "@/lib/admin-localizado";
import { approveContribucion, rejectContribucion } from "@/lib/admin-contribucion";

const VALID_ID = "507f1f77bcf86cd799439011";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guardas de ObjectId en helpers admin", () => {
  it("updateLocalizado rechaza un id mal formado con 400 antes de tocar la BD", async () => {
    await expect(updateLocalizado("no-es-objectid", {})).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(locFindById).not.toHaveBeenCalled();
  });

  it("updateLocalizado devuelve 404 cuando el id es válido pero no existe", async () => {
    locFindById.mockResolvedValue(null);
    await expect(updateLocalizado(VALID_ID, {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it("approveContribucion rechaza un id mal formado con 400", async () => {
    await expect(approveContribucion("abc", {})).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(contribFindById).not.toHaveBeenCalled();
  });

  it("approveContribucion devuelve 404 cuando la contribución no existe", async () => {
    contribFindById.mockResolvedValue(null);
    await expect(approveContribucion(VALID_ID, {})).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("rejectContribucion rechaza un id mal formado con 400", async () => {
    await expect(rejectContribucion("###", {})).rejects.toBeInstanceOf(ValidationError);
    expect(contribFindById).not.toHaveBeenCalled();
  });

  it("rejectContribucion devuelve 404 cuando la contribución no existe", async () => {
    contribFindById.mockResolvedValue(null);
    await expect(rejectContribucion(VALID_ID, {})).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});
