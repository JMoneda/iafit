import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Contrato del catálogo de tools: nombres únicos, inputSchema como raw shape de zod
 * bien formado y el flag `confirmed` obligatorio en TODAS las tools de escritura.
 * Este test protege contra regresiones al agregar tools nuevas.
 *
 * Tras la migración a McpServer + registerTool, `inputSchema` es un ZodRawShape
 * (objeto plano de validadores zod), no un JSON Schema. Un campo es REQUERIDO si su
 * validador no es opcional: lo comprobamos con safeParse(undefined) — un opcional
 * acepta undefined; uno requerido lo rechaza.
 */
async function loadAllTools() {
  vi.resetModules();
  process.env.AZURE_DEVOPS_PAT = 'pat-de-prueba';
  const modules = await Promise.all([
    import('../src/tools/rules/listRuleCategories.js'),
    import('../src/tools/rules/listRules.js'),
    import('../src/tools/rules/getRule.js'),
    import('../src/tools/rules/searchRules.js'),
    import('../src/tools/rules/getApplicableRules.js'),
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

/** Un campo del raw shape es requerido si su validador rechaza `undefined`. */
function isRequired(field: unknown): boolean {
  return !(field as z.ZodTypeAny).safeParse(undefined).success;
}

describe('catálogo de tools — contrato', () => {
  it('expone 14 tools con nombres únicos', async () => {
    const tools = await loadAllTools();
    const nombres = tools.map(t => t.definition.name);
    expect(nombres).toHaveLength(14);
    expect(new Set(nombres).size).toBe(14);
  });

  it('toda tool tiene descripción, inputSchema raw shape de zod y handler función', async () => {
    const tools = await loadAllTools();
    for (const t of tools) {
      const d = t.definition;
      expect(d.description, `${d.name} sin descripción`).toBeTruthy();
      // inputSchema es un objeto plano (ZodRawShape); puede ser {} para tools sin args.
      expect(typeof d.inputSchema).toBe('object');
      expect(d.inputSchema).not.toBeNull();
      for (const [campo, validador] of Object.entries(d.inputSchema)) {
        expect(validador instanceof z.ZodType, `${d.name}.${campo} no es un validador zod`).toBe(true);
      }
      expect(typeof t.handler).toBe('function');
    }
  });

  it('toda tool de escritura exige `confirmed` como parámetro requerido', async () => {
    const tools = await loadAllTools();
    for (const nombre of TOOLS_DE_ESCRITURA) {
      const tool = tools.find(t => t.definition.name === nombre)!;
      const shape = tool.definition.inputSchema;
      expect(shape.confirmed, `${nombre} debe declarar confirmed`).toBeDefined();
      expect(isRequired(shape.confirmed), `${nombre} debe requerir confirmed`).toBe(true);
      expect(tool.definition.description).toMatch(/CONFIRMACIÓN EXPLÍCITA/);
    }
  });

  it('ninguna tool de lectura pide `confirmed` (no fricciona lecturas)', async () => {
    const tools = await loadAllTools();
    for (const t of tools) {
      if (TOOLS_DE_ESCRITURA.includes(t.definition.name)) continue;
      expect(t.definition.inputSchema.confirmed, `${t.definition.name} no debe pedir confirmed`).toBeUndefined();
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
