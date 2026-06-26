import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Moderación",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-3 -mt-5 max-w-none sm:-mx-4 sm:-mt-8">
      <div className="border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Localizados Venezuela</p>
            <h1 className="text-lg font-semibold">Panel de moderación</h1>
          </div>
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Volver al sitio
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4">{children}</div>
    </div>
  );
}