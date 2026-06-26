import { readFile } from "fs/promises";
import path from "path";
import { parseMarkdownTables } from "@/lib/ocr-parser";

const OCR_PROMPT = `Eres un asistente que transcribe listas de pacientes/localizados en hospitales venezolanos.
Lee la imagen y devuelve SOLO una tabla markdown con columnas como:
| Nombre | Edad | Cédula | Dirección | Observaciones |
Incluye todas las filas legibles. Si una celda está vacía déjala en blanco.
No agregues texto fuera de la tabla.`;

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export async function extractRowsFromImage(imagenPath: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const rel = imagenPath.startsWith("/") ? imagenPath.slice(1) : imagenPath;
  const fullPath = path.join(process.cwd(), "public", rel.replace(/^uploads\//, "uploads/"));
  const buffer = await readFile(fullPath);
  const mime = mimeFromPath(fullPath);
  const base64 = buffer.toString("base64");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const markdown = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!markdown) {
    throw new Error("OpenAI no devolvió contenido");
  }

  const parsed = parseMarkdownTables(markdown);
  return { markdown, ...parsed };
}