import { type NextRequest, NextResponse } from "next/server";
import { searchLocalizados } from "@/lib/queries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Intentamos extraer el remitente y el contenido del mensaje de múltiples formatos comunes de APIs de WhatsApp
    const from =
      body.from ||
      body.sender ||
      body.data?.from ||
      body.data?.sender ||
      body.key?.remoteJid ||
      body.chatId;

    const text =
      body.body ||
      body.text ||
      body.message ||
      body.data?.body ||
      body.data?.text ||
      body.data?.message ||
      body.message?.conversation;

    if (!from || !text) {
      console.warn("[WhatsApp Webhook] Datos incompletos recibidos:", { from, text });
      return NextResponse.json(
        { success: false, error: "Missing 'from' or 'text' fields" },
        { status: 400 }
      );
    }

    const queryText = String(text).trim();
    if (queryText.length < 2) {
      return NextResponse.json(
        { success: false, error: "Search query too short" },
        { status: 200 }
      );
    }

    console.log(
      `[WhatsApp Webhook] Procesando consulta de: ${from} | Búsqueda: "${queryText}"`
    );

    // Realizamos la búsqueda en la colección de Localizados
    const searchResults = await searchLocalizados({ q: queryText, limit: 5 });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    let responseMessage = "";

    if (searchResults.data.length === 0) {
      responseMessage = `No encontramos registros para "${queryText}" en nuestro sistema de personas localizadas.\n\nAsegúrate de escribir el nombre completo o la cédula correctamente. Ten en cuenta que este registro es únicamente para personas ya localizadas y confirmadas.`;
    } else {
      const total = searchResults.meta.total;
      responseMessage = `Resultados para "${queryText}" (Encontrados: ${total}):\n\n`;

      searchResults.data.forEach((persona) => {
        const condicionEmoji =
          persona.condicion === "vivo"
            ? "🟢 Vivo"
            : persona.condicion === "fallecido"
              ? "🔴 Fallecido"
              : "🟡 Desconocido";

        responseMessage += `👤 *${persona.nombreCompleto}*\n`;
        if (persona.cedula) responseMessage += `🆔 Cédula: ${persona.cedula}\n`;
        if (persona.edad) responseMessage += `🎂 Edad: ${persona.edad} años\n`;
        responseMessage += `📌 Condición: ${condicionEmoji}\n`;
        responseMessage += `🏥 Lugar: ${persona.lugarNombre}\n`;
        if (persona.observaciones)
          responseMessage += `📝 Obs: ${persona.observaciones}\n`;
        responseMessage += `🔗 Ver Ficha: ${siteUrl}/localizados/${persona.slug}\n`;
        responseMessage += `-------------------\n\n`;
      });

      if (total > 5) {
        responseMessage += `Hay más resultados disponibles. Puedes verlos todos buscando en la web: ${siteUrl}/buscar?q=${encodeURIComponent(
          queryText
        )}`;
      }
    }

    // Enviamos la respuesta de vuelta a FZAP / API de WhatsApp
    const fzapUrl = process.env.FZAP_API_URL;
    const instanceId = process.env.FZAP_INSTANCE_ID;
    const fzapToken = process.env.FZAP_API_TOKEN;

    if (!fzapUrl) {
      console.warn(
        "[WhatsApp Webhook] FZAP_API_URL no configurado. Respuesta formateada:\n",
        responseMessage
      );
      return NextResponse.json({
        success: true,
        message: "No FZAP_API_URL configured, message logged locally",
        responseMessage,
      });
    }

    // Para FZAP, el endpoint de envío de texto es /chat/send/text
    const targetUrl = `${fzapUrl.replace(/\/$/, "")}/chat/send/text`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (fzapToken) {
      headers["token"] = fzapToken;
    }

    console.log(`[WhatsApp Webhook] Enviando respuesta a ${targetUrl}...`);

    try {
      const fzapResponse = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: from,
          body: responseMessage,
        }),
      });

      if (!fzapResponse.ok) {
        const errorText = await fzapResponse.text();
        console.error(
          `[WhatsApp Webhook] Error llamando a la API de FZAP: Status ${fzapResponse.status}`,
          errorText
        );
        return NextResponse.json(
          {
            success: false,
            error: `FZAP API returned status ${fzapResponse.status}`,
            responseMessage,
          },
          { status: 200 }
        );
      }

      console.log(`[WhatsApp Webhook] Respuesta enviada exitosamente a ${from}`);
      return NextResponse.json({ success: true });
    } catch (fetchError) {
      console.warn(
        "[WhatsApp Webhook] No se pudo conectar a FZAP (posiblemente fuera de línea en entorno local):",
        fetchError instanceof Error ? fetchError.message : String(fetchError)
      );
      return NextResponse.json({
        success: false,
        error: "Could not connect to FZAP API (offline)",
        responseMessage,
      });
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Error interno de procesamiento:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
