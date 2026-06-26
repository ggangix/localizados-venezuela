import { DesaparecidosLink } from "@/components/DesaparecidosLink";

export function DisclaimerBanner() {
  return (
    <div
      role="alert"
      className="border-b border-alert-border bg-alert-bg px-4 py-3 text-sm text-alert-text"
    >
      <p className="mx-auto max-w-5xl font-medium">
        Este sitio registra únicamente personas <strong>ya localizadas</strong> (en
        hospitales, recintos u otros lugares). No es para reportar desaparecidos. Si
        buscas a alguien, usa la búsqueda de registros publicados.
      </p>
      <p className="mx-auto mt-2 max-w-5xl text-sm text-alert-text">
        ¿Tienes <strong>desaparecidos</strong> para reportar? Hazlo en{" "}
        <DesaparecidosLink className="font-semibold text-alert-text underline hover:opacity-90" />
        .
      </p>
    </div>
  );
}
