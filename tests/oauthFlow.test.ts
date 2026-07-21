import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Single-flight de getValidToken: si varias tools se llaman de forma concurrente con
 * el token expirado, debe dispararse UNA sola renovación (no una por llamada, ni
 * varios logins interactivos compitiendo por el puerto). También verifica el fast
 * path: un token vigente se devuelve sin tocar la red.
 */
let tmpDir: string | null = null;

async function loadAuth(seed?: { accessToken: string; refreshToken: string; expiresAt: number }) {
  vi.resetModules();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iafit-oauth-'));
  process.env.IAFIT_DATA_DIR = tmpDir;
  process.env.AZURE_AD_TENANT_ID = 'tenant-de-prueba';
  process.env.AZURE_AD_CLIENT_ID = 'client-de-prueba';
  delete process.env.AZURE_DEVOPS_PAT;

  // Sembramos el token en disco ANTES de importar oauthFlow (que lee el store).
  const store = await import('../src/auth/tokenStore.js');
  if (seed) store.saveTokens(seed);

  const oauth = await import('../src/auth/oauthFlow.js');
  return oauth;
}

/** Respuesta del endpoint de token de Entra ID, con un pequeño retraso para
 *  garantizar que las llamadas concurrentes se solapen. */
function tokenResponse(accessToken: string): Promise<Response> {
  return new Promise(resolve =>
    setTimeout(
      () =>
        resolve(
          new Response(
            JSON.stringify({ access_token: accessToken, refresh_token: 'refresh-nuevo', expires_in: 3600 }),
            { status: 200 },
          ),
        ),
      20,
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
  delete process.env.IAFIT_DATA_DIR;
  delete process.env.AZURE_AD_TENANT_ID;
  delete process.env.AZURE_AD_CLIENT_ID;
});

describe('getValidToken — single-flight', () => {
  it('dos llamadas concurrentes con token expirado disparan UN solo refresh', async () => {
    const { getValidToken } = await loadAuth({
      accessToken: 'viejo',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() - 1000, // expirado
    });

    const fetchMock = vi.fn(() => tokenResponse('token-renovado'));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([getValidToken(), getValidToken()]);

    expect(a).toBe('token-renovado');
    expect(b).toBe('token-renovado');
    // Sin single-flight, cada llamada habría hecho su propio POST de refresh.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fast path: un token vigente se devuelve sin tocar la red', async () => {
    const { getValidToken } = await loadAuth({
      accessToken: 'token-vigente',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() + 3_600_000, // vigente
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await getValidToken()).toBe('token-vigente');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tras un refresh fallido el lock se libera y una llamada posterior reintenta', async () => {
    const { getValidToken } = await loadAuth({
      accessToken: 'viejo',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() - 1000,
    });

    // Primer refresh: error de red transitorio.
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom-red'))
      .mockImplementationOnce(() => tokenResponse('token-al-reintento'));
    vi.stubGlobal('fetch', fetchMock);

    const primero = await getValidToken();
    expect(primero).toMatchObject({ error: 'network_error' });

    // El single-flight debió limpiarse: este segundo intento vuelve a llamar fetch.
    const segundo = await getValidToken();
    expect(segundo).toBe('token-al-reintento');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
