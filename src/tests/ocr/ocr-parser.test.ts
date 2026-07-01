import { describe, expect, it } from "vitest";
import { parseMarkdownTables } from "@/lib/ocr-parser";

describe("parseMarkdownTables", () => {
  it("parsea tabla markdown completa", () => {
    const input = [
      "| Nombre      | Edad | Cedula     |",
      "|-------------|------|------------|",
      "| Juan Perez  | 30   | V-12345678 |",
      "| Maria Lopez | 25   | V-87654321 |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.tablesFound).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      nombre: "Juan Perez",
      edad: "30",
      cedula: "V-12345678",
    });
    expect(result.rows[1]).toMatchObject({
      nombre: "Maria Lopez",
      edad: "25",
      cedula: "V-87654321",
    });
  });

  it("detecta condicion desde observaciones", () => {
    const input = [
      "| Nombre     | Obs. |",
      "|------------|------|",
      "| Ana Gomez  | fallecido |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows[0].condicion).toBe("fallecido");
  });

  it("ignora separator rows", () => {
    const input = ["| Nombre |", "|--------|", "| Test   |"].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows).toHaveLength(1);
    expect(result.rowsSkipped).toBe(0);
  });

  it("retorna vacio si no hay tablas", () => {
    const result = parseMarkdownTables("Esto no tiene tabla");
    expect(result.tablesFound).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("mapea header nombre desde Apellidos y Nombres", () => {
    const input = [
      "| Apellidos y Nombres |",
      "|---------------------|",
      "| Carlos Silva        |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.tablesFound).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nombre).toBe("Carlos Silva");
  });

  it("mapea header Direccion", () => {
    const input = [
      "| Nombre   | Direccion  |",
      "|----------|------------|",
      "| Luis     | Calle 1    |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].direccion).toBe("Calle 1");
  });

  it("mapea header Cedula", () => {
    const input = [
      "| Nombre | Cedula |",
      "|--------|--------|",
      "| Ana    | V-123  |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows[0].cedula).toBe("V-123");
  });

  it("skips filas sin nombre", () => {
    const input = [
      "| Nombre | Edad |",
      "|--------|------|",
      "| —      | 30   |",
      "| Ana    | 25   |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows).toHaveLength(1);
    expect(result.rowsSkipped).toBe(1);
    expect(result.rows[0].nombre).toBe("Ana");
  });

  it("parsea multiples tablas", () => {
    const input = [
      "| Nombre |",
      "|--------|",
      "| Ana    |",
      "",
      "| Nombre  |",
      "|---------|",
      "| Luis    |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.tablesFound).toBe(2);
    expect(result.rows).toHaveLength(2);
  });

  it("ignora filas con placeholder sin identificar", () => {
    const input = [
      "| Nombre         |",
      "|----------------|",
      "| Sin identificar |",
      "| Pedro          |",
    ].join("\n");

    const result = parseMarkdownTables(input);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nombre).toBe("Pedro");
  });
});
