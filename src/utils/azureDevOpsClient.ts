import { getValidToken, isAuthError } from '../auth/oauthFlow.js';

const ORG = process.env.AZURE_DEVOPS_ORG ?? 'eafit-dinfo';
const DEFAULT_PROJECT = process.env.AZURE_DEVOPS_PROJECT ?? '';
const ADO_PAT = process.env.AZURE_DEVOPS_PAT;
const API_VERSION = '7.1';

export type AzureError = { error: string; message: string };

export function isAzureError(v: unknown): v is AzureError {
  return typeof v === 'object' && v !== null && 'error' in v && 'message' in v;
}

export function resolveProject(project?: string): string {
  return project ?? DEFAULT_PROJECT;
}

function baseUrl(project: string): string {
  return `https://dev.azure.com/${ORG}/${encodeURIComponent(project)}/_apis`;
}

function buildUrl(path: string, project: string): string {
  const base = `${baseUrl(project)}/${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${sep}api-version=${API_VERSION}`;
}

interface RequestOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

/**
 * Resuelve el header Authorization. Si AZURE_DEVOPS_PAT está definido, usa
 * autenticación Basic con el PAT (self-service, no requiere registro de app en
 * Entra ID). Si no, cae al flujo OAuth2 + PKCE contra Entra ID.
 */
async function authHeader(): Promise<{ Authorization: string } | AzureError> {
  if (ADO_PAT && ADO_PAT.trim() !== '') {
    const basic = Buffer.from(`:${ADO_PAT.trim()}`).toString('base64');
    return { Authorization: `Basic ${basic}` };
  }
  const tokenResult = await getValidToken();
  if (isAuthError(tokenResult)) return tokenResult;
  return { Authorization: `Bearer ${tokenResult}` };
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T | AzureError> {
  const auth = await authHeader();
  if (isAzureError(auth)) return auth;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
    ...auth,
  };

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    return {
      error: 'network_error',
      message: 'No se pudo conectar a Azure DevOps. Reintenta en unos segundos.',
    };
  }

  if (res.status === 401) {
    return { error: 'auth_expired', message: 'La sesión expiró. Se requiere iniciar sesión de nuevo.' };
  }
  if (res.status === 403) {
    return { error: 'forbidden', message: 'Tu cuenta no tiene permisos para esta operación en Azure DevOps.' };
  }
  if (res.status === 404) {
    return { error: 'not_found', message: `Recurso no encontrado: ${url}` };
  }
  if (res.status === 429) {
    return { error: 'rate_limited', message: 'Azure DevOps respondió 429. Espera antes de reintentar.' };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { error: 'api_error', message: `Azure DevOps respondió ${res.status}: ${body.slice(0, 200)}` };
  }

  return res.json() as Promise<T>;
}

export async function adoGet<T>(path: string, project?: string): Promise<T | AzureError> {
  return request<T>(buildUrl(path, resolveProject(project)));
}

export async function adoPost<T>(
  path: string,
  body: unknown,
  project?: string,
  contentType?: string,
): Promise<T | AzureError> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  return request<T>(buildUrl(path, resolveProject(project)), {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
}

export async function adoPatch<T>(
  path: string,
  body: unknown,
  project?: string,
  contentType?: string,
): Promise<T | AzureError> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  return request<T>(buildUrl(path, resolveProject(project)), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers,
  });
}
