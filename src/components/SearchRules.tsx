import { DesaparecidosLink } from "@/components/DesaparecidosLink";

export function SearchRules({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 text-sm font-semibold leading-6 text-white shadow-sm ${className}`}
      aria-label="Reglas de búsqueda"
    >
      <p>
        Busca solo personas <strong className="text-brand-100">ya localizadas</strong>.
        No es para reportar desaparecidos.
      </p>
      <p className="mt-1 text-brand-100">
        Para desaparecidos:{" "}
        <DesaparecidosLink className="font-bold text-white underline decoration-2 underline-offset-2" />
      </p>
    </div>
  );
}
