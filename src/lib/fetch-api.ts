/** Error estructurado devuelto por fetchApi cuando ok es false. */
export type ApiErrorData = {
  error: string;
  code: string;
  details?: unknown;
};

/** Resultado discriminado: éxito con data tipada o fallo con error estructurado. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorData };

export type FetchApiInit = RequestInit & {
  /** Tiempo máximo de espera en ms. Por defecto 15 000. */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const RETRY_BACKOFF_MS = 1_000;

const MSG_RED = "Error de conexión. Verifica tu red e intenta de nuevo.";
const MSG_TIMEOUT = "Timeout";
const MSG_ABORT = "Petición cancelada";
const MSG_PARSE = "Respuesta inválida del servidor";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isGetMethod(method?: string): boolean {
  return !method || method.toUpperCase() === "GET";
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

function extractHttpError(body: unknown, status: number): ApiErrorData {
  if (body && typeof body === "object" && "error" in body) {
    const record = body as { error?: unknown; code?: unknown; details?: unknown };
    const message = typeof record.error === "string" ? record.error : `Error ${status}`;
    const code = typeof record.code === "string" ? record.code : String(status);
    const details = "details" in record ? record.details : undefined;
    return { error: message, code, details };
  }
  return { error: `Error ${status}`, code: String(status) };
}

function abortResult(externalSignal?: AbortSignal): ApiResult<never> {
  if (externalSignal?.aborted) {
    return { ok: false, error: { error: MSG_ABORT, code: "ABORT" } };
  }
  return { ok: false, error: { error: MSG_TIMEOUT, code: "TIMEOUT" } };
}

async function readResponseBody(
  res: Response
): Promise<{ body: unknown; parseError: boolean }> {
  const text = await res.text();
  if (!text.trim()) {
    return { body: undefined, parseError: false };
  }
  try {
    return { body: JSON.parse(text) as unknown, parseError: false };
  } catch {
    return { body: undefined, parseError: true };
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

async function fetchOnce<T>(
  url: string,
  init: FetchApiInit,
  retriesLeft: number
): Promise<ApiResult<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...fetchInit } = init;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const headers = new Headers(fetchInit.headers);
    if (fetchInit.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...fetchInit,
        headers,
        credentials: fetchInit.credentials ?? "include",
        signal: controller.signal,
      });
    } catch (err) {
      if (isAbortError(err)) {
        return abortResult(externalSignal ?? undefined);
      }
      if (err instanceof TypeError) {
        return { ok: false, error: { error: MSG_RED, code: "NETWORK" } };
      }
      const message = err instanceof Error ? err.message : "Error desconocido";
      return { ok: false, error: { error: message, code: "UNKNOWN" } };
    }

    const { body, parseError } = await readResponseBody(res);

    if (!res.ok) {
      const error = extractHttpError(body, res.status);
      if (retriesLeft > 0 && isRetryableStatus(res.status)) {
        await sleep(RETRY_BACKOFF_MS);
        return fetchOnce<T>(url, init, 0);
      }
      return { ok: false, error };
    }

    if (parseError) {
      return {
        ok: false,
        error: { error: MSG_PARSE, code: "PARSE" },
      };
    }

    return { ok: true, data: (body ?? ({} as T)) as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: { error: message, code: "UNKNOWN" } };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cliente HTTP centralizado con tipado estricto, timeout, retry en GET 5xx
 * y manejo uniforme de errores de red, timeout y HTTP.
 */
export async function fetchApi<T>(
  url: string,
  init: FetchApiInit = {}
): Promise<ApiResult<T>> {
  const retriesLeft = isGetMethod(init.method) ? 1 : 0;
  return fetchOnce<T>(url, init, retriesLeft);
}
