import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Vínculo padre-hijo: en Azure DevOps es una relación (link), no un campo.
 * create_work_item y update_work_item deben emitirlo como op sobre /relations/-
 * con rel = System.LinkTypes.Hierarchy-Reverse y la URL del work item padre.
 */
async function load() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  const createWorkItem = await import('../src/tools/azureDevOps/createWorkItem.js');
  const updateWorkItem = await import('../src/tools/azureDevOps/updateWorkItem.js');
  return { createWorkItem, updateWorkItem };
}

function okResponse(id: number): Response {
  return new Response(
    JSON.stringify({ id, fields: { 'System.Title': 'X' }, _links: { html: { href: 'u' } } }),
    { status: 200 },
  );
}

const REL_PARENT = 'System.LinkTypes.Hierarchy-Reverse';
const PARENT_URL = 'https://dev.azure.com/eafit-dinfo/_apis/wit/workItems/34732';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('create_work_item — vínculo padre', () => {
  it('con `parent` agrega la relación jerárquica en el patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(34889));
    vi.stubGlobal('fetch', fetchMock);
    const { createWorkItem } = await load();

    await createWorkItem.handler({ type: 'Task', title: 'Tarea hija', parent: 34732, confirmed: true });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const patchDoc = JSON.parse(options.body as string) as Array<Record<string, unknown>>;
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: PARENT_URL },
    });
  });

  it('el preview incluye el parent y no llama a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { createWorkItem } = await load();

    const r = (await createWorkItem.handler({
      type: 'Task',
      title: 'X',
      parent: 34732,
      confirmed: false,
    })) as Record<string, unknown>;

    expect((r.preview as Record<string, unknown>).parent).toBe(34732);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('update_work_item — vínculo padre', () => {
  it('con `parent` y sin `fields` emite solo la relación (PATCH)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(34888));
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    const r = (await updateWorkItem.handler({ id: 34888, parent: 34732, confirmed: true })) as Record<
      string,
      unknown
    >;

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('PATCH');
    const patchDoc = JSON.parse(options.body as string) as Array<Record<string, unknown>>;
    expect(patchDoc).toEqual([
      { op: 'add', path: '/relations/-', value: { rel: REL_PARENT, url: PARENT_URL } },
    ]);
    expect(r).toMatchObject({ id: 34888, parent: 34732 });
  });

  it('combina campos y parent en el mismo patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(34888));
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    await updateWorkItem.handler({
      id: 34888,
      fields: { 'System.State': 'Active' },
      parent: 34732,
      confirmed: true,
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const patchDoc = JSON.parse(options.body as string) as Array<Record<string, unknown>>;
    expect(patchDoc).toContainEqual({ op: 'add', path: '/fields/System.State', value: 'Active' });
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: PARENT_URL },
    });
  });

  it('sin fields ni parent devuelve nothing_to_update y no llama a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    const r = await updateWorkItem.handler({ id: 34888, confirmed: true });
    expect(r).toMatchObject({ error: 'nothing_to_update' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
