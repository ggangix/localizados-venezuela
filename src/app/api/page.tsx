import { CodeBlock } from "@/components/CodeBlock";
import { CONDICIONES, EDAD_MAX, EDAD_MIN, LUGAR_TIPOS } from "@/lib/constants";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localizadosvenezuela.com";

const condValues = CONDICIONES.join(" | ");
const tipoValues = LUGAR_TIPOS.join(" | ");
const edadRange = `${EDAD_MIN}–${EDAD_MAX}`;

export const metadata = {
  title: "API pública",
};

type Param = {
  name: string;
  tipo: string;
  desc: string;
  valores?: string;
};

function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="py-2 pr-4 font-medium">Parámetro</th>
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 font-medium">Descripción</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-slate-100 align-top">
              <td className="whitespace-nowrap py-2 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {p.name}
                </code>
              </td>
              <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{p.tipo}</td>
              <td className="py-2 text-slate-600">
                {p.desc}
                {p.valores && (
                  <>
                    {" "}
                    Valores: <code className="text-xs">{p.valores}</code>.
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({
  method,
  path,
  desc,
  params,
  curl,
  response,
}: {
  method: string;
  path: string;
  desc: string;
  params?: Param[];
  curl: string;
  response: string;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
          {method}
        </span>
        <code className="text-sm font-semibold text-slate-800">{path}</code>
      </div>
      <p className="text-sm text-slate-600">{desc}</p>

      {params && params.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Parámetros (query)
          </h3>
          <ParamTable params={params} />
        </div>
      )}

      <CodeBlock caption="Petición" code={curl} />
      <CodeBlock caption="Respuesta 200" code={response} />
    </section>
  );
}

const searchParams: Param[] = [
  {
    name: "q",
    tipo: "string",
    desc: "Búsqueda por nombre u observación (texto), o por cédula si son 4+ dígitos (coincide por prefijo).",
  },
  {
    name: "lugar",
    tipo: "string",
    desc: "Slug de un lugar para acotar los resultados (ver GET /lugares).",
  },
  {
    name: "condicion",
    tipo: "string",
    valores: condValues,
    desc: "Estado de la persona.",
  },
  { name: "tipo", tipo: "string", valores: tipoValues, desc: "Tipo de lugar." },
  { name: "edadMin", tipo: "number", desc: `Edad mínima (rango ${edadRange}).` },
  { name: "edadMax", tipo: "number", desc: `Edad máxima (rango ${edadRange}).` },
  { name: "page", tipo: "number", desc: "Número de página (por defecto 1)." },
  {
    name: "limit",
    tipo: "number",
    desc: "Resultados por página (por defecto 20, máximo 100).",
  },
];

const pagingParams: Param[] = [
  { name: "page", tipo: "number", desc: "Número de página (por defecto 1)." },
  {
    name: "limit",
    tipo: "number",
    desc: "Localizados por página (por defecto 50, máximo 100).",
  },
];

const searchResponse = `{
  "data": [
    {
      "slug": "gonzalez-gabriel-m3n4o5",
      "nombreCompleto": "GONZALEZ GABRIEL",
      "edad": "45",
      "condicion": "desconocido",
      "lugarSlug": "hospital-universitario-de-caracas",
      "lugarNombre": "Hospital Universitario de Caracas",
      "fuente": {
        "tipo": "excel",
        "nombre": "Pacientes Consolidados Hospitales Venezuela.xlsx",
        "fecha": "25JUN26 23:30 (Venezuela)"
      },
      "publicadoEn": "2026-06-26T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}`;

const detalleResponse = `{
  "data": {
    "slug": "gonzalez-gabriel-m3n4o5",
    "nombreCompleto": "GONZALEZ GABRIEL",
    "edad": "45",
    "condicion": "desconocido",
    "lugarSlug": "hospital-universitario-de-caracas",
    "lugarNombre": "Hospital Universitario de Caracas",
    "fuente": { "tipo": "excel", "nombre": "Pacientes Consolidados...xlsx" },
    "publicadoEn": "2026-06-26T00:00:00.000Z"
  }
}`;

const lugaresResponse = `{
  "data": [
    { "slug": "cruz-roja", "nombre": "Cruz Roja", "tipo": "hospital", "totalLocalizados": 5 },
    {
      "slug": "hospital-domingo-luciani",
      "nombre": "Hospital Domingo Luciani",
      "tipo": "hospital",
      "totalLocalizados": 4
    }
  ]
}`;

const lugarDetalleResponse = `{
  "data": {
    "lugar": {
      "slug": "hospital-domingo-luciani",
      "nombre": "Hospital Domingo Luciani",
      "tipo": "hospital",
      "totalLocalizados": 4
    },
    "localizados": [
      {
        "slug": "abello-matilde-a1b2c3",
        "nombreCompleto": "ABELLO MATILDE",
        "edad": "74",
        "observaciones": "Fallecida",
        "condicion": "fallecido",
        "lugarSlug": "hospital-domingo-luciani",
        "lugarNombre": "Hospital Domingo Luciani",
        "fuente": { "tipo": "excel", "nombre": "Pacientes Consolidados...xlsx" },
        "publicadoEn": "2026-06-26T00:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 50, "total": 4, "totalPages": 1 }
  }
}`;

export default function ApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API pública</h1>
        <p className="mt-2 text-slate-600">
          API REST de solo lectura para integraciones. Los datos publicados están
          disponibles sin autenticación. Respuestas en JSON; los campos opcionales sin
          valor se omiten.
        </p>
      </div>

      <p className="text-sm text-slate-700">
        Base URL: <code className="rounded bg-slate-100 px-2 py-1">{baseUrl}</code>
      </p>

      <div className="space-y-5">
        <EndpointCard
          method="GET"
          path="/api/v1/localizados"
          desc="Busca personas localizadas publicadas. Todos los parámetros son opcionales y se combinan (AND)."
          params={searchParams}
          curl={`curl -s "${baseUrl}/api/v1/localizados?q=gonzalez&condicion=desconocido&limit=10" | jq`}
          response={searchResponse}
        />

        <EndpointCard
          method="GET"
          path="/api/v1/localizados/{slug}"
          desc="Detalle de una persona por su slug. Devuelve 404 con { error: 'No encontrado' } si no existe."
          curl={`curl -s "${baseUrl}/api/v1/localizados/gonzalez-gabriel-m3n4o5" | jq`}
          response={detalleResponse}
        />

        <EndpointCard
          method="GET"
          path="/api/v1/lugares"
          desc="Lista todos los lugares con su conteo de localizados publicados, ordenados por nombre."
          curl={`curl -s "${baseUrl}/api/v1/lugares" | jq`}
          response={lugaresResponse}
        />

        <EndpointCard
          method="GET"
          path="/api/v1/lugares/{slug}"
          desc="Detalle de un lugar y sus localizados (paginado). Devuelve 404 si el lugar no existe."
          params={pagingParams}
          curl={`curl -s "${baseUrl}/api/v1/lugares/hospital-domingo-luciani?page=1&limit=50" | jq`}
          response={lugarDetalleResponse}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <h2 className="font-semibold">Errores y CORS</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
          <li>
            Recurso no encontrado: <code>404</code> con cuerpo{" "}
            <code>{`{ "error": "No encontrado" }`}</code>.
          </li>
          <li>
            Las rutas <code>GET /api/v1/*</code> incluyen{" "}
            <code>Access-Control-Allow-Origin: *</code> para uso público.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <h2 className="font-semibold">Contribuir datos</h2>
        <p className="mt-2">
          Enviar localizados o imágenes de listados <strong>no</strong> forma parte de
          esta API pública (el endpoint de contribuciones está restringido al mismo
          origen). Usa el formulario en{" "}
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
