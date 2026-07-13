import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';
import { loadTokens, saveTokens, clearTokens, type TokenData } from './tokenStore.js';

const BASE_PORT = parseInt(process.env.IAFIT_AUTH_PORT ?? '3456');
const PORTS_TO_TRY = [BASE_PORT, BASE_PORT + 1, BASE_PORT + 2];
const AUTH_TIMEOUT_MS = 2 * 60 * 1000;

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;

const SCOPES = 'https://app.vssps.visualstudio.com/user_impersonation offline_access';

export type AuthError = { error: string; message: string };

export function isAuthError(v: unknown): v is AuthError {
  return typeof v === 'object' && v !== null && 'error' in v && 'message' in v;
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function tryListen(server: http.Server, port: number): Promise<boolean> {
  return new Promise(resolve => {
    server.once('error', () => resolve(false));
    server.listen(port, '0.0.0.0', () => resolve(true));
  });
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

  const server = http.createServer();
  let listenPort: number | null = null;

  for (const port of PORTS_TO_TRY) {
    if (await tryListen(server, port)) {
      listenPort = port;
      break;
    }
  }

  if (listenPort === null) {
    throw new Error('auth_port_unavailable');
  }

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
