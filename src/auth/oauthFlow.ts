import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import { loadTokens, saveTokens, clearTokens, type TokenData } from './tokenStore.js';

const BASE_PORT = parseInt(process.env.IAFIT_AUTH_PORT ?? '3456');
const PORTS_TO_TRY = [BASE_PORT, BASE_PORT + 1, BASE_PORT + 2];
const AUTH_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Interfaz donde escucha el callback OAuth. Por defecto loopback (127.0.0.1): no se
 * expone a la red local durante la ventana de auth. EXCEPCIÓN: dentro de Docker el
 * reenvío de puertos (`-p`) no alcanza el loopback del contenedor, así que ahí hay que
 * escuchar en 0.0.0.0 vía IAFIT_AUTH_HOST=0.0.0.0 (solo relevante con OAuth; con PAT no
 * se usa ningún puerto).
 */
const AUTH_HOST = process.env.IAFIT_AUTH_HOST ?? '127.0.0.1';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

const SCOPES = 'https://app.vssps.visualstudio.com/user_impersonation offline_access';

/**
 * Resolución de token en curso (single-flight). Si varias tools se llaman de forma
 * concurrente con el token expirado, todas reusan esta misma Promise en vez de
 * disparar cada una su propio refresh —o peor, abrir varios navegadores compitiendo
 * por el puerto 3456—. Se limpia al terminar (éxito o error).
 */
let inFlight: Promise<string | AuthError> | null = null;

export type AuthError = { error: string; message: string };

export function isAuthError(v: unknown): v is AuthError {
  return typeof v === 'object' && v !== null && 'error' in v && 'message' in v;
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * Intenta escuchar en el primer puerto disponible de PORTS_TO_TRY. Crea un
 * `http.Server` NUEVO por intento (reutilizar la misma instancia tras un evento
 * 'error' de bind deja el server en un estado inconsistente). Bindea a AUTH_HOST
 * (127.0.0.1 por defecto): el redirect_uri es localhost, así que no hay razón para
 * exponer el callback a toda la red local durante la ventana de autenticación.
 */
async function listenOnAvailablePort(): Promise<{ server: http.Server; port: number } | null> {
  for (const port of PORTS_TO_TRY) {
    const server = http.createServer();
    const ok = await new Promise<boolean>(resolve => {
      server.once('error', () => resolve(false));
      server.listen(port, AUTH_HOST, () => resolve(true));
    });
    if (ok) return { server, port };
    // El bind falló (p. ej. EADDRINUSE): se descarta esta instancia y se prueba
    // el siguiente puerto con una nueva. El listener 'error' era `once`, ya se quitó.
    server.removeAllListeners();
  }
  return null;
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID!,
    code_verifier: codeVerifier,
    scope: SCOPES,
  });

  let res: Response;
  try {
    res = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
  } catch {
    throw new Error('network_error');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID!,
    scope: SCOPES,
  });

  let res: Response;
  try {
    res = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );
  } catch {
    throw new Error('network_error');
  }

  if (res.status === 400 || res.status === 401) {
    throw new Error('refresh_expired');
  }
  if (!res.ok) {
    throw new Error('network_error');
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function runInteractiveLogin(): Promise<TokenData> {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const bound = await listenOnAvailablePort();
  if (bound === null) {
    throw new Error('auth_port_unavailable');
  }
  const { server, port: listenPort } = bound;

  const redirectUri = `http://localhost:${listenPort}/auth/callback`;

  const authUrl = new URL(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`,
  );
  authUrl.searchParams.set('client_id', CLIENT_ID!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  process.stderr.write(
    `\n[IAFIT] Para autenticarte, abre esta URL en tu navegador:\n${authUrl.toString()}\nEsperando autenticación (timeout: 2 minutos)...\n\n`,
  );

  const tokens = await new Promise<TokenData>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('auth_timeout'));
    }, AUTH_TIMEOUT_MS);

    server.on('request', (req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url!, `http://localhost:${listenPort}`);

          if (url.pathname !== '/auth/callback') {
            res.writeHead(404).end();
            return;
          }

          const returnedState = url.searchParams.get('state');
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error || returnedState !== state || !code) {
            res
              .writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
              .end(
                `<html><body><h2>Error de autenticación: ${error ?? 'estado inválido'}. Puedes cerrar esta pestaña.</h2></body></html>`,
              );
            clearTimeout(timeout);
            server.close();
            reject(new Error(error ?? 'invalid_state'));
            return;
          }

          res
            .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            .end(
              '<html><body><h2>Autenticación exitosa. Puedes cerrar esta pestaña.</h2></body></html>',
            );

          clearTimeout(timeout);
          server.close();

          resolve(await exchangeCode(code, verifier, redirectUri));
        } catch (err) {
          reject(err);
        }
      })();
    });
  });

  return tokens;
}

export async function getValidToken(): Promise<string | AuthError> {
  if (!TENANT_ID || !CLIENT_ID) {
    return {
      error: 'missing_config',
      message: 'Faltan variables de entorno: AZURE_AD_CLIENT_ID y/o AZURE_AD_TENANT_ID.',
    };
  }

  // Fast path sin lock: si hay un token vigente (con 60s de margen) se devuelve ya.
  const cached = loadTokens();
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  // Slow path (refresh o login interactivo): single-flight. La primera llamada crea
  // la Promise; las concurrentes la reusan. Se limpia al terminar para permitir un
  // reintento posterior si esta resolución falló.
  if (!inFlight) {
    inFlight = resolveToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function resolveToken(): Promise<string | AuthError> {
  // Re-chequea el fast path: otra llamada pudo renovar el token mientras esperábamos
  // el lock (o entre el chequeo de getValidToken y la toma del single-flight).
  let tokens = loadTokens();
  if (tokens && tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }

  if (tokens?.refreshToken) {
    try {
      tokens = await refreshAccessToken(tokens.refreshToken);
      saveTokens(tokens);
      return tokens.accessToken;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === 'refresh_expired') {
        clearTokens();
        // fall through to interactive login
      } else {
        return {
          error: 'network_error',
          message:
            'No se pudo conectar para renovar la sesión. Reintenta en unos segundos.',
        };
      }
    }
  }

  try {
    tokens = await runInteractiveLogin();
    saveTokens(tokens);
    return tokens.accessToken;
  } catch (err) {
    const msg = (err as Error).message;

    if (msg === 'auth_port_unavailable') {
      return {
        error: 'auth_port_unavailable',
        message:
          'No se pudo iniciar el servidor de autenticación local. Verifica que el puerto 3456 (o cercanos) esté disponible.',
      };
    }
    if (msg === 'auth_timeout') {
      return {
        error: 'auth_timeout',
        message: 'No se completó el inicio de sesión a tiempo. Intenta de nuevo.',
      };
    }
    if (msg === 'network_error') {
      return {
        error: 'network_error',
        message: 'No se pudo conectar a Microsoft para autenticarse. Reintenta en unos segundos.',
      };
    }

    return {
      error: 'auth_required',
      message:
        'No se pudo completar la autenticación. Verifica los logs del servidor para obtener la URL de autorización.',
    };
  }
}
