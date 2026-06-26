import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">No encontrado</h1>
      <p className="mt-2 text-slate-600">
        El registro que buscas no existe o no está publicado.
      </p>
      <Link href="/buscar" className="mt-6 inline-block text-brand-600 underline">
        Volver a buscar
      </Link>
    </div>
  );
}
