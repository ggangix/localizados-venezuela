const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localizadosvenezuela.com";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/localizados?q=gonzalez&page=1&limit=20",
    desc: "Buscar localizados publicados",
  },
  {
    method: "GET",
    path: "/api/v1/localizados/{slug}",
    desc: "Detalle de un localizado",
  },
  {
    method: "GET",
    path: "/api/v1/lugares",
    desc: "Listar lugares con conteo",
  },
  {
    method: "GET",
    path: "/api/v1/lugares/{slug}",
    desc: "Detalle de lugar y sus localizados",
  },
];

export const metadata = {
  title: "API pública",
};

export default function ApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API pública</h1>
        <p className="mt-2 text-slate-600">
          API REST de solo lectura para integraciones. Los datos publicados están
          disponibles sin autenticación.
        </p>
      </div>

      <p className="text-sm">
        Base URL: <code className="rounded bg-slate-100 px-2 py-1">{baseUrl}</code>
      </p>

      <div className="space-y-4">
        {endpoints.map((ep) => (
          <div
            key={ep.path}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                {ep.method}
              </span>
              <code className="text-sm">{ep.path}</code>
            </div>
            <p className="mt-2 text-sm text-slate-600">{ep.desc}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <h2 className="font-semibold">Cabeceras CORS</h2>
        <p className="mt-2 text-slate-600">
          Las rutas <code>GET /api/v1/*</code> incluyen{" "}
          <code>Access-Control-Allow-Origin: *</code> para uso público.
        </p>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <h2 className="font-semibold">Contribuir datos</h2>
        <p className="mt-2">
          Enviar localizados o imágenes de listados <strong>no</strong> forma parte de
          esta API. Usa el formulario en{" "}
          <a href="/contribuir" className="font-semibold underline">
            /contribuir
          </a>
          , protegido con reCAPTCHA v3. Las contribuciones quedan en cola{" "}
          <code>pending</code> hasta moderación (fase 2).
        </p>
      </section>
    </div>
  );
}
