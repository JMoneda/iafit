import { describe, it, expect, vi } from 'vitest';

/**
 * Contrato del catálogo de tools: nombres únicos, schemas bien formados y
 * el flag `confirmed` obligatorio en TODAS las tools de escritura.
 * Este test protege contra regresiones al agregar tools nuevas.
 */
async function loadAllTools() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  const modules = await Promise.all([
    import('../src/tools/rules/listRuleCategories.js'),
    import('../src/tools/rules/listRules.js'),
    import('../src/tools/rules/getRule.js'),
    import('../src/tools/rules/searchRules.js'),
    import('../src/tools/schemas/listSchemas.js'),
    import('../src/tools/schemas/getSchema.js'),
    import('../src/tools/azureDevOps/getWorkItem.js'),
    import('../src/tools/azureDevOps/queryWorkItems.js'),
    import('../src/tools/azureDevOps/listPullRequests.js'),
    import('../src/tools/azureDevOps/getPrThreads.js'),
    import('../src/tools/azureDevOps/createWorkItem.js'),
    import('../src/tools/azureDevOps/updateWorkItem.js'),
    import('../src/tools/azureDevOps/addPrComment.js'),
  ]);
  return modules;
}

const TOOLS_DE_ESCRITURA = ['create_work_item', 'update_work_item', 'add_pr_comment'];

describe('catálogo de tools — contrato', () => {
  it('expone 13 tools con nombres únicos', async () => {
    const tools = await loadAllTools();
    const nombres = tools.map(t => t.definition.name);
    expect(nombres).toHaveLength(13);
    expect(new Set(nombres).size).toBe(13);
  });

  it('toda tool tiene descripción, inputSchema tipo object y handler función', async () => {
    const tools = await loadAllTools();
    for (const t of tools) {
      const d = t.definition;
      expect(d.description, `${d.name} sin descripción`).toBeTruthy();
      expect((d.inputSchema as { type: string }).type).toBe('object');
      expect(typeof t.handler).toBe('function');
    }
  });

  it('toda tool de escritura exige `confirmed` como parámetro requerido', async () => {
    const tools = await loadAllTools();
    for (const nombre of TOOLS_DE_ESCRITURA) {
      const tool = tools.find(t => t.definition.name === nombre)!;
      const schema = tool.definition.inputSchema as {
        required?: string[];
        properties?: Record<string, unknown>;
      };
      expect(schema.required, `${nombre} debe requerir confirmed`).toContain('confirmed');
      expect(schema.properties?.confirmed).toBeDefined();
      expect(tool.definition.description).toMatch(/CONFIRMACIÓN EXPLÍCITA/);
    }
  });

  it('ninguna tool de lectura pide `confirmed` (no fricciona lecturas)', async () => {
    const tools = await loadAllTools();
    for (const t of tools) {
      if (TOOLS_DE_ESCRITURA.includes(t.definition.name)) continue;
      const schema = t.definition.inputSchema as { required?: string[] };
      expect(schema.required ?? []).not.toContain('confirmed');
    }
  });
});

describe('handlers de reglas — validación de categoría', () => {
  it('list_rules, get_rule y search_rules rechazan categorías inválidas con error estructurado', async () => {
    vi.resetModules();
    const listRules = await import('../src/tools/rules/listRules.js');
    const getRule = await import('../src/tools/rules/getRule.js');
    const searchRules = await import('../src/tools/rules/searchRules.js');

    expect(listRules.handler({ category: 'nope' })).toMatchObject({
      error: 'invalid_category',
    });
    expect(getRule.handler({ category: 'nope', slug: 'x' })).toMatchObject({
      error: 'invalid_category',
    });
    expect(searchRules.handler({ query: 'x', category: 'nope' })).toMatchObject({
      error: 'invalid_category',
    });
    // search sin categoría es válido
    const r = searchRules.handler({ query: 'zzz-sin-resultados' }) as { total: number };
    expect(r.total).toBe(0);
  });
});
