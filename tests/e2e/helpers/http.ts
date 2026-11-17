// tests/e2e/helpers/http.ts
// F05-T02 — Cliente HTTP mínimo para la suite E2E con cookies de sesión reales.
//
// El `fetch` nativo de Node NO almacena cookies: esta ayuda extrae la cabecera
// `Set-Cookie` (sessionToken, HttpOnly) y la reenvía manualmente como `Cookie`
// en cada petición posterior (authedFetch). Todas las peticiones usan
// `redirect: "manual"` para poder inspeccionar los 3xx del guard server-side.

export interface ApiEnvelope {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; details?: unknown };
}

function headerValues(headers: Headers, name: string): string[] {
  const getSetCookie = (
    headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }
  const single = headers.get(name);
  return single ? [single] : [];
}

/**
 * Devuelve la cabecera Set-Cookie COMPLETA de la cookie de sesión
 * (`sessionToken=<valor>; Path=/; HttpOnly; ...`) para poder asertar sus
 * flags de seguridad, o null si la respuesta no la estableció.
 */
export function extractSessionCookie(res: Response): string | null {
  const match = headerValues(res.headers, "set-cookie").find((cookie) =>
    /^sessionToken\s*=/i.test(cookie.trim()),
  );
  return match ? match.trim() : null;
}

/**
 * Extrae únicamente el par `sessionToken=<valor>` (sin atributos), que es lo
 * que debe reenviarse como cabecera `Cookie` en las peticiones siguientes.
 */
export function extractSessionCookiePair(res: Response): string | null {
  const header = extractSessionCookie(res);
  return header ? header.split(";")[0].trim() : null;
}

export interface ApiClient {
  readonly baseUrl: string;
  cookie: string | null;
  /** Actualiza la cookie que se reenviará en las siguientes peticiones. */
  setCookie(cookie: string | null): void;
  /** Petición JSON con la cookie de sesión adjunta (si existe). */
  request(method: string, pathname: string, body?: unknown): Promise<Response>;
  /** Petición cruda (para GET / con redirect: "manual", descargas, etc.). */
  raw(pathname: string, init?: RequestInit): Promise<Response>;
}

export function createApiClient(
  baseUrl: string,
  cookie: string | null = null,
): ApiClient {
  const client: ApiClient = {
    baseUrl,
    cookie,
    setCookie(next: string | null) {
      client.cookie = next;
    },
    async raw(pathname: string, init: RequestInit = {}): Promise<Response> {
      const headers: Record<string, string> = {
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      };
      if (client.cookie) headers.Cookie = client.cookie;
      return fetch(`${baseUrl}${pathname}`, {
        ...init,
        headers,
        redirect: init.redirect ?? "manual",
      });
    },
    async request(
      method: string,
      pathname: string,
      body?: unknown,
    ): Promise<Response> {
      const headers: Record<string, string> = {};
      if (client.cookie) headers.Cookie = client.cookie;
      if (body !== undefined) headers["Content-Type"] = "application/json";
      return fetch(`${baseUrl}${pathname}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: "manual",
      });
    },
  };
  return client;
}

/** Parsea el cuerpo JSON como ApiResponse<T>. */
export async function jsonOf(res: Response): Promise<ApiEnvelope> {
  return (await res.json()) as ApiEnvelope;
}
