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
  /** Localiza la llamada PATCH (la escritura) entre todas las llamadas a fetch. */
  const patchCall = (mock: ReturnType<typeof vi.fn>) =>
    mock.mock.calls.find(c => ((c as [string, RequestInit?])[1]?.method ?? 'GET') === 'PATCH') as
      | [string, RequestInit]
      | undefined;

  /** Respuesta GET de un work item con las relations indicadas. */
  const withRelations = (id: number, relations: Array<{ rel: string; url: string }>): Response =>
    new Response(JSON.stringify({ id, fields: { 'System.Title': 'X' }, relations }), { status: 200 });

  it('en un item huérfano (sin padre) solo agrega la relación', async () => {
    // fresh Response por llamada: el GET consume el body, el PATCH necesita el suyo.
    const fetchMock = vi.fn(() => Promise.resolve(okResponse(34888)));
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    const r = (await updateWorkItem.handler({ id: 34888, parent: 34732, confirmed: true })) as Record<
      string,
      unknown
    >;

    const call = patchCall(fetchMock)!;
    expect(call[1].method).toBe('PATCH');
    const patchDoc = JSON.parse(call[1].body as string) as Array<Record<string, unknown>>;
    expect(patchDoc).toEqual([
      { op: 'add', path: '/relations/-', value: { rel: REL_PARENT, url: PARENT_URL } },
    ]);
    expect(r).toMatchObject({ id: 34888, parent: 34732 });
  });

  it('combina campos y parent en el mismo patch', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(okResponse(34888)));
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    await updateWorkItem.handler({
      id: 34888,
      fields: { 'System.State': 'Active' },
      parent: 34732,
      confirmed: true,
    });

    const patchDoc = JSON.parse(patchCall(fetchMock)![1].body as string) as Array<
      Record<string, unknown>
    >;
    expect(patchDoc).toContainEqual({ op: 'add', path: '/fields/System.State', value: 'Active' });
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: PARENT_URL },
    });
  });

  it('reasignar el padre de un item que YA tiene padre: remueve la relación previa antes de agregar la nueva', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        // GET: un hijo en el índice 0 y el padre actual (99999) en el índice 1.
        withRelations(34888, [
          { rel: 'System.LinkTypes.Hierarchy-Forward', url: 'https://dev.azure.com/eafit-dinfo/_apis/wit/workItems/555' },
          { rel: REL_PARENT, url: 'https://dev.azure.com/eafit-dinfo/_apis/wit/workItems/99999' },
        ]),
      )
      .mockResolvedValueOnce(okResponse(34888)); // PATCH
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    await updateWorkItem.handler({ id: 34888, parent: 34732, confirmed: true });

    const patchDoc = JSON.parse(patchCall(fetchMock)![1].body as string) as Array<
      Record<string, unknown>
    >;
    // La relación de padre estaba en el índice 1: se remueve por índice y se agrega la nueva.
    expect(patchDoc).toContainEqual({ op: 'remove', path: '/relations/1' });
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/relations/-',
      value: { rel: REL_PARENT, url: PARENT_URL },
    });
    // El remove debe ir ANTES del add (Azure aplica el patch en orden).
    const idxRemove = patchDoc.findIndex(o => o.op === 'remove');
    const idxAdd = patchDoc.findIndex(o => o.op === 'add' && o.path === '/relations/-');
    expect(idxRemove).toBeLessThan(idxAdd);
  });

  it('reasignar al MISMO padre es un no-op: no emite PATCH y responde unchanged', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(withRelations(34888, [{ rel: REL_PARENT, url: PARENT_URL }]));
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await load();

    const r = (await updateWorkItem.handler({ id: 34888, parent: 34732, confirmed: true })) as Record<
      string,
      unknown
    >;

    expect(r).toMatchObject({ unchanged: true, parent: 34732 });
    expect(patchCall(fetchMock), 'no debe emitir ninguna escritura').toBeUndefined();
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
