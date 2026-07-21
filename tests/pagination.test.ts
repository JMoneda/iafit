import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Paginación de las tools de listado de Azure DevOps:
 * - list_pull_requests pagina con $top/$skip hasta reunir maxResults y marca truncated.
 * - query_work_items trocea el batch de ids en lotes de 200 (límite de la API) para
 *   no fallar ni truncar en silencio cuando maxResults supera ese límite.
 */
async function load() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  const listPullRequests = await import('../src/tools/azureDevOps/listPullRequests.js');
  const queryWorkItems = await import('../src/tools/azureDevOps/queryWorkItems.js');
  return { listPullRequests, queryWorkItems };
}

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200 });

/** Genera una página de N PRs con ids consecutivos desde `from`. */
const prPage = (from: number, n: number) => ({
  value: Array.from({ length: n }, (_, i) => ({
    pullRequestId: from + i,
    title: `PR ${from + i}`,
    status: 'active',
  })),
});

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('list_pull_requests — paginación', () => {
  it('una sola página incompleta: no marca truncated y hace una única llamada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(prPage(1, 3)));
    vi.stubGlobal('fetch', fetchMock);
    const { listPullRequests } = await load();

    const r = (await listPullRequests.handler({ repository: 'repo' })) as Record<string, unknown>;

    expect((r.pullRequests as unknown[]).length).toBe(3);
    expect(r.count).toBe(3);
    expect(r.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('varias páginas llenas: acumula hasta agotar y respeta $skip', async () => {
    // 100 + 100 + 40 => 240 PRs en total, con maxResults alto (300).
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prPage(1, 100)))
      .mockResolvedValueOnce(jsonResponse(prPage(101, 100)))
      .mockResolvedValueOnce(jsonResponse(prPage(201, 40)));
    vi.stubGlobal('fetch', fetchMock);
    const { listPullRequests } = await load();

    const r = (await listPullRequests.handler({
      repository: 'repo',
      maxResults: 300,
    })) as Record<string, unknown>;

    expect((r.pullRequests as unknown[]).length).toBe(240);
    expect(r.truncated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // La 2ª y 3ª llamada deben incrementar $skip.
    const urls = fetchMock.mock.calls.map(c => c[0] as string);
    expect(urls[0]).toContain('$skip=0');
    expect(urls[1]).toContain('$skip=100');
    expect(urls[2]).toContain('$skip=200');
  });

  it('hay más resultados que maxResults: recorta y marca truncated=true', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(prPage(1, 100)))
      .mockResolvedValueOnce(jsonResponse(prPage(101, 100)));
    vi.stubGlobal('fetch', fetchMock);
    const { listPullRequests } = await load();

    const r = (await listPullRequests.handler({
      repository: 'repo',
      maxResults: 150,
    })) as Record<string, unknown>;

    expect((r.pullRequests as unknown[]).length).toBe(150);
    expect(r.count).toBe(150);
    expect(r.truncated).toBe(true);
    // Con 100 no basta (== maxResults? no), pide 2ª página; con 200 ya sabe que hay más.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('propaga un error estructurado de Azure sin paginar de más', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    const { listPullRequests } = await load();

    const r = await listPullRequests.handler({ repository: 'repo' });
    expect(r).toMatchObject({ error: 'forbidden' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('query_work_items — troceo del batch de ids', () => {
  it('con más de 200 ids trocea en lotes de <=200 y concatena', async () => {
    const total = 250;
    const wiqlRefs = { workItems: Array.from({ length: total }, (_, i) => ({ id: i + 1 })) };
    const batch = (ids: number[]) => ({
      value: ids.map(id => ({ id, fields: { 'System.Title': `WI ${id}`, 'System.State': 'Active' } })),
    });

    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      // 1ª llamada: POST del WIQL. Siguientes: GET de cada lote.
      if (options?.method === 'POST') return Promise.resolve(jsonResponse(wiqlRefs));
      const ids = new URL(url).searchParams.get('ids')!.split(',').map(Number);
      return Promise.resolve(jsonResponse(batch(ids)));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { queryWorkItems } = await load();

    const r = (await queryWorkItems.handler({
      wiql: 'SELECT [System.Id] FROM WorkItems',
      maxResults: 250,
    })) as Record<string, unknown>;

    expect((r.items as unknown[]).length).toBe(250);
    expect(r.totalCount).toBe(250);
    expect(r.truncated).toBe(false);
    // 1 POST (wiql) + 2 GET (lotes de 200 y 50).
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const getCalls = fetchMock.mock.calls.filter(c => (c[1] as RequestInit | undefined)?.method !== 'POST');
    expect(getCalls.length).toBe(2);
  });

  it('marca truncated cuando la query casa más items que maxResults', async () => {
    const wiqlRefs = { workItems: Array.from({ length: 120 }, (_, i) => ({ id: i + 1 })) };
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (options?.method === 'POST') return Promise.resolve(jsonResponse(wiqlRefs));
      const ids = new URL(url).searchParams.get('ids')!.split(',').map(Number);
      return Promise.resolve(
        jsonResponse({ value: ids.map(id => ({ id, fields: { 'System.Title': `WI ${id}` } })) }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const { queryWorkItems } = await load();

    const r = (await queryWorkItems.handler({
      wiql: 'SELECT [System.Id] FROM WorkItems',
      maxResults: 50,
    })) as Record<string, unknown>;

    expect((r.items as unknown[]).length).toBe(50);
    expect(r.totalCount).toBe(120);
    expect(r.truncated).toBe(true);
  });

  it('sin resultados devuelve items vacío sin llamar al batch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ workItems: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const { queryWorkItems } = await load();

    const r = (await queryWorkItems.handler({ wiql: 'SELECT [System.Id] FROM WorkItems' })) as Record<
      string,
      unknown
    >;

    expect(r.items).toEqual([]);
    expect(r.totalCount).toBe(0);
    // Solo el POST del WIQL; nunca el GET de batch.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
