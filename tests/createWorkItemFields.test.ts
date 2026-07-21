import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * create_work_item: soporte de campos personalizados (`fields`) y manejo de
 * campos obligatorios del proceso. Cuando Azure DevOps rechaza por un campo
 * requerido, la tool NO crea nada y devuelve requires_input con los campos
 * faltantes y sus valores permitidos, para pedírselos al usuario.
 */
async function loadCreateWorkItem() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  return import('../src/tools/azureDevOps/createWorkItem.js');
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('create_work_item — campos personalizados', () => {
  it('envía los campos de `fields` en el patch document', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: 5, fields: { 'System.Title': 'X' }, _links: { html: { href: 'u' } } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { handler } = await loadCreateWorkItem();

    await handler({
      type: 'Task',
      title: 'X',
      fields: { 'Custom.TaskType': 'Development', 'Microsoft.VSTS.Common.Priority': 2 },
      confirmed: true,
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const patchDoc = JSON.parse(options.body as string) as Array<{ path: string; value: unknown }>;
    expect(patchDoc).toContainEqual({ op: 'add', path: '/fields/Custom.TaskType', value: 'Development' });
    expect(patchDoc).toContainEqual({
      op: 'add',
      path: '/fields/Microsoft.VSTS.Common.Priority',
      value: 2,
    });
  });

  it('el preview (confirmed=false) incluye `fields` y no llama a la red', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { handler } = await loadCreateWorkItem();

    const r = (await handler({
      type: 'Task',
      title: 'X',
      fields: { 'Custom.TaskType': 'Development' },
      confirmed: false,
    })) as Record<string, unknown>;

    expect(r.requires_confirmation).toBe(true);
    expect((r.preview as Record<string, unknown>).fields).toEqual({ 'Custom.TaskType': 'Development' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('create_work_item — campo obligatorio faltante', () => {
  it('ante un Rule Error responde requires_input con los campos y valores permitidos, sin crear', async () => {
    const ruleBody = JSON.stringify({
      message:
        'TF401320: Rule Error for field Task Type. Error code: Required, HasValues, LimitedToValues.',
      typeKey: 'RuleValidationException',
    });
    const fieldsBody = JSON.stringify({
      count: 1,
      value: [
        {
          referenceName: 'Custom.TaskType',
          name: 'Task Type',
          alwaysRequired: true,
          allowedValues: ['Development', 'Analysis', 'Configuration'],
        },
      ],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(ruleBody, { status: 400 })) // POST rechazado
      .mockResolvedValueOnce(new Response(fieldsBody, { status: 200 })); // GET de campos del tipo
    vi.stubGlobal('fetch', fetchMock);
    const { handler } = await loadCreateWorkItem();

    const r = (await handler({ type: 'Task', title: 'X', confirmed: true })) as Record<
      string,
      unknown
    >;

    expect(r.requires_input).toBe(true);
    expect(r.created).toBe(false);
    expect(r.missingFields).toContainEqual({
      referenceName: 'Custom.TaskType',
      name: 'Task Type',
      allowedValues: ['Development', 'Analysis', 'Configuration'],
    });
  });

  it('reintento con el campo en `fields` crea el work item', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 202,
          fields: { 'System.Title': 'X', 'System.State': 'New' },
          _links: { html: { href: 'https://dev.azure.com/x/wi/202' } },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { handler } = await loadCreateWorkItem();

    const r = (await handler({
      type: 'Task',
      title: 'X',
      fields: { 'Custom.TaskType': 'Development' },
      confirmed: true,
    })) as Record<string, unknown>;

    expect(r).toMatchObject({ id: 202, url: 'https://dev.azure.com/x/wi/202' });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const patchDoc = JSON.parse(options.body as string) as Array<{ path: string; value: unknown }>;
    expect(patchDoc).toContainEqual({ op: 'add', path: '/fields/Custom.TaskType', value: 'Development' });
  });
});
