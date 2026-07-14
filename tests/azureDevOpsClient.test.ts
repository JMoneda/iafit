import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El cliente lee las variables de entorno al importarse; cada test resetea
 * módulos, fija el entorno y stubbea global.fetch para no tocar la red.
 */
async function loadClient(env: Record<string, string> = {}) {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  Object.assign(process.env, env);
  return import('../src/utils/azureDevOpsClient.js');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('azureDevOpsClient — autenticación y URL', () => {
  it('con PAT definido usa Basic auth con base64(":" + PAT)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const m = await loadClient();

    await m.adoGet('wit/workitems/1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    const esperado = 'Basic ' + Buffer.from(':pat-de-prueba').toString('base64');
    expect(headers.Authorization).toBe(esperado);
  });

  it('construye la URL con org, proyecto codificado y api-version=7.1', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const m = await loadClient();

    await m.adoGet('wit/workitems/42', 'Mi Proyecto');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      'https://dev.azure.com/eafit-dinfo/Mi%20Proyecto/_apis/wit/workitems/42?api-version=7.1',
    );
  });

  it('si el path ya tiene query string, agrega api-version con &', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const m = await loadClient();

    await m.adoGet('wit/workitems?ids=1,2');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('?ids=1,2&api-version=7.1');
  });

  it('resolveProject usa el proyecto por defecto cuando no se pasa', async () => {
    const m = await loadClient();
    expect(m.resolveProject()).toBe('SolucionesIA');
    expect(m.resolveProject('Otro')).toBe('Otro');
  });
});

describe('azureDevOpsClient — mapeo de errores (nunca lanza)', () => {
  const casos: Array<[number, string]> = [
    [401, 'auth_expired'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [429, 'rate_limited'],
    [500, 'api_error'],
  ];

  for (const [status, codigo] of casos) {
    it(`HTTP ${status} → error estructurado '${codigo}'`, async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response('detalle', { status })),
      );
      const m = await loadClient();
      const r = await m.adoGet('wit/workitems/1');
      expect(m.isAzureError(r)).toBe(true);
      expect(r).toMatchObject({ error: codigo });
      // todo error trae mensaje legible para el usuario
      expect((r as { message: string }).message.length).toBeGreaterThan(0);
    });
  }

  it('caída de red → network_error estructurado, sin excepción', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const m = await loadClient();
    const r = await m.adoGet('wit/workitems/1');
    expect(r).toMatchObject({ error: 'network_error' });
  });

  it('adoPost respeta el Content-Type de json-patch para work items', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
    const m = await loadClient();

    await m.adoPost('wit/workitems/$Task', [], undefined, 'application/json-patch+json');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(options.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json-patch+json');
  });
});
