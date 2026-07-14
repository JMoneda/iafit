import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contrato de seguridad central de IAFIT: ninguna tool de escritura ejecuta
 * efectos en Azure DevOps sin confirmed=true. Con confirmed=false devuelve
 * un preview estructurado y NO realiza llamadas de escritura a la red.
 */
async function loadWriteTools() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  const createWorkItem = await import('../src/tools/azureDevOps/createWorkItem.js');
  const updateWorkItem = await import('../src/tools/azureDevOps/updateWorkItem.js');
  const addPrComment = await import('../src/tools/azureDevOps/addPrComment.js');
  return { createWorkItem, updateWorkItem, addPrComment };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('contrato de confirmación — confirmed=false nunca ejecuta', () => {
  it('create_work_item devuelve preview y NO llama a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { createWorkItem } = await loadWriteTools();

    const r = (await createWorkItem.handler({
      type: 'Task',
      title: 'Tarea de prueba',
      confirmed: false,
    })) as Record<string, unknown>;

    expect(r.requires_confirmation).toBe(true);
    expect(r.preview).toMatchObject({ type: 'Task', title: 'Tarea de prueba' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('add_pr_comment devuelve preview y NO llama a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { addPrComment } = await loadWriteTools();

    const r = (await addPrComment.handler({
      repository: 'repo-x',
      pullRequestId: 7,
      comment: 'hola',
      confirmed: false,
    })) as Record<string, unknown>;

    expect(r.requires_confirmation).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('update_work_item con confirmed=false solo LEE (GET) para el preview, nunca PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 5, fields: { 'System.Title': 'Actual', 'System.State': 'New' } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { updateWorkItem } = await loadWriteTools();

    const r = (await updateWorkItem.handler({
      id: 5,
      fields: { 'System.State': 'Active' },
      confirmed: false,
    })) as Record<string, unknown>;

    expect(r.requires_confirmation).toBe(true);
    const preview = r.preview as Record<string, unknown>;
    expect(preview.changes).toEqual({ 'System.State': 'Active' });
    expect(preview.currentFields).toMatchObject({ 'System.Title': 'Actual' });

    for (const call of fetchMock.mock.calls as Array<[string, RequestInit | undefined]>) {
      const method = call[1]?.method ?? 'GET';
      expect(method, 'confirmed=false no debe emitir escrituras').toBe('GET');
    }
  });

  it('update_work_item devuelve preview aunque la lectura del estado actual falle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const { updateWorkItem } = await loadWriteTools();

    const r = (await updateWorkItem.handler({
      id: 999,
      fields: { 'System.State': 'Active' },
      confirmed: false,
    })) as Record<string, unknown>;

    expect(r.requires_confirmation).toBe(true);
    expect((r.preview as Record<string, unknown>).currentFields).toBeNull();
  });
});

describe('contrato de confirmación — confirmed=true ejecuta la escritura', () => {
  it('create_work_item con confirmed=true hace POST json-patch y mapea la respuesta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 101,
          fields: { 'System.Title': 'Tarea creada', 'System.State': 'New' },
          _links: { html: { href: 'https://dev.azure.com/x/wi/101' } },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { createWorkItem } = await loadWriteTools();

    const r = (await createWorkItem.handler({
      type: 'Task',
      title: 'Tarea creada',
      tags: ['iafit', 'demo'],
      confirmed: true,
    })) as Record<string, unknown>;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/wit/workitems/$Task?api-version=7.1');
    expect(options.method).toBe('POST');
    const patchDoc = JSON.parse(options.body as string) as Array<{ path: string; value: unknown }>;
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/fields/System.Title',
      value: 'Tarea creada',
    });
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/fields/System.Tags',
      value: 'iafit; demo',
    });
    expect(r).toMatchObject({ id: 101, title: 'Tarea creada', url: 'https://dev.azure.com/x/wi/101' });
  });

  it('si Azure DevOps rechaza la escritura, propaga el error estructurado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
    const { createWorkItem } = await loadWriteTools();

    const r = await createWorkItem.handler({ type: 'Task', title: 'x', confirmed: true });
    expect(r).toMatchObject({ error: 'forbidden' });
  });
});
