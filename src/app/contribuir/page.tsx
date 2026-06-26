import { ContribuirForm } from "@/components/ContribuirForm";
import { DesaparecidosLink } from "@/components/DesaparecidosLink";
import { ShareButtons } from "@/components/ShareButtons";
import { absoluteUrl } from "@/lib/share";

export const metadata = {
  title: "Contribuir",
};

export default function ContribuirPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contribuir información</h1>
        <p className="mt-2 text-slate-600">
          Puedes reportar una persona localizada o subir una imagen de un listado.
          Indica siempre la fuente (hospital, cuenta de X, grupo de WhatsApp, etc.).
        </p>
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          ¿Quieres reportar un <strong>desaparecido</strong>? Este sitio no es para eso
          — usa <DesaparecidosLink className="font-semibold text-blue-900 underline" />.
        </p>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Fase 1:</strong> las contribuciones se guardan pero{" "}
          <strong>no se publican automáticamente</strong>. En la fase 2 se activará
          moderación y OCR para procesar listas en imagen.
        </p>
      </div>
      <ShareButtons
        variant="full"
        url={absoluteUrl("/contribuir")}
        title="Contribuir — Localizados Venezuela"
        text="Ayuda a reportar personas ya localizadas tras el sismo en Venezuela."
        label="Compartir página de contribución"
        contentType="contribuir"
      />
      <ContribuirForm />
    </div>
  );
}
