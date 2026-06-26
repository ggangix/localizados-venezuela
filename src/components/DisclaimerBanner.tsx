import { DesaparecidosLink } from "@/components/DesaparecidosLink";

export function DisclaimerBanner() {
  return (
    <div
      role="alert"
      className="border-b border-alert-border bg-alert-bg px-4 py-3 text-sm text-alert-text"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="font-semibold">
          Solo personas <strong>ya localizadas</strong>. Usa la búsqueda para revisar
          registros publicados.
        </p>
        <p className="text-sm">
          ¿Reportar desaparecidos?{" "}
          <DesaparecidosLink className="font-bold text-alert-text underline decoration-2 underline-offset-2 hover:opacity-90" />
        </p>
      </div>
    </div>
  );
}
