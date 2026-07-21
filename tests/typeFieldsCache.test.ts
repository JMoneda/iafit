import { describe, it, expect, vi } from 'vitest';

/**
 * Verifica el beneficio de la cache de getTypeFields: ante dos creaciones del
 * mismo tipo que fallan por campo obligatorio, el GET de definición de campos
 * (…/fields?$expand=allowedValues) se hace UNA sola vez; la segunda usa cache.
 * (vi.resetModules NO se llama entre las dos creaciones: comparten instancia de
 * módulo y por tanto la cache module-level.)
 */
async function load() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_ORG = 'eafit-dinfo';
  process.env.AZURE_DEVOPS_PROJECT = 'SolucionesIA';
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  return import('../src/tools/azureDevOps/createWorkItem.js');
}

describe('cache de getTypeFields', () => {
  it('no repite el GET de campos para el mismo (proyecto, tipo)', async () => {
    const ruleBody = JSON.stringify({
      message: 'TF401320: Rule Error for field Task Type. Error code: Required.',
    });
    const fieldsBody = JSON.stringify({
      count: 1,
      value: [
        {
          referenceName: 'Custom.TaskType',
          name: 'Task Type',
          alwaysRequired: true,
          allowedValues: ['Development'],
        },
      ],
    });
    // Cada create: 1 POST (rechazado) + (si no hay cache) 1 GET de fields.
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/fields?')) {
        return Promise.resolve(new Response(fieldsBody, { status: 200 }));
      }
      return Promise.resolve(new Response(ruleBody, { status: 400 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { handler } = await load();

    await handler({ type: 'Task', title: 'A', confirmed: true });
    await handler({ type: 'Task', title: 'B', confirmed: true });

    const getFieldsCalls = fetchMock.mock.calls.filter(c => String(c[0]).includes('/fields?'));
    expect(getFieldsCalls.length).toBe(1); // la 2ª usó cache
    const postCalls = fetchMock.mock.calls.filter(c => String(c[0]).includes('/workitems/$'));
    expect(postCalls.length).toBe(2); // ambos POST sí se intentan
  });
});
