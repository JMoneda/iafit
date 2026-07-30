import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Integridad del contenido de schemas/, equivalente a lo que rulesContent.test.ts
 * hace con rules/. Sin esto, un schema con `template:` apuntando a un archivo que
 * no existe, o un `requires:` con un id mal escrito, se publica sin que nadie lo
 * note y falla en runtime del agente, cuando ya es tarde.
 *
 * El parseo es una máquina de estados línea a línea, NO regex sueltos: las viñetas
 * dentro de los bloques `instruction: >` tienen la misma indentación que las de
 * `requires:`, así que un `/^ {6}- (.+)$/m` global produce decenas de falsos
 * positivos. Solo cuentan las viñetas que siguen inmediatamente a un `requires:`.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

interface Artefacto {
  id: string;
  linea: number;
  generates?: string;
  template?: string;
  instruction: boolean;
  requires: string[];
}

interface SchemaParseado {
  name?: string;
  version?: string;
  description: boolean;
  artefactos: Artefacto[];
  applyRequires: string[];
  applyInstruction: boolean;
  tieneApply: boolean;
}

export function parsearSchema(yaml: string): SchemaParseado {
  const r: SchemaParseado = {
    description: false,
    artefactos: [],
    applyRequires: [],
    applyInstruction: false,
    tieneApply: false,
  };
  // 'artefacto' = leyendo requires de un artefacto; 'apply' = leyendo requires de apply
  let leyendoRequires: 'no' | 'artefacto' | 'apply' = 'no';
  let enApply = false;
  const lineas = yaml.split(/\r?\n/);

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    const actual = r.artefactos[r.artefactos.length - 1];

    if (leyendoRequires !== 'no') {
      const sangria = leyendoRequires === 'artefacto' ? 6 : 4;
      const item = l.match(new RegExp(`^ {${sangria}}- (.+)$`));
      if (item) {
        const valor = item[1].trim();
        if (leyendoRequires === 'artefacto' && actual) actual.requires.push(valor);
        else if (leyendoRequires === 'apply') r.applyRequires.push(valor);
        continue;
      }
      leyendoRequires = 'no';
    }

    if (/^name:\s*(.+)$/.test(l)) r.name = l.replace(/^name:\s*/, '').trim();
    else if (/^version:\s*(.+)$/.test(l)) r.version = l.replace(/^version:\s*/, '').trim();
    else if (/^description:/.test(l)) r.description = true;
    else if (/^apply:\s*$/.test(l)) {
      enApply = true;
      r.tieneApply = true;
    } else if (/^ {2}- id: (.+)$/.test(l)) {
      enApply = false;
      r.artefactos.push({
        id: l.replace(/^ {2}- id:\s*/, '').trim(),
        linea: i + 1,
        instruction: false,
        requires: [],
      });
    } else if (actual && !enApply && /^ {4}generates:\s*(.+)$/.test(l)) {
      actual.generates = l.replace(/^ {4}generates:\s*/, '').trim();
    } else if (actual && !enApply && /^ {4}template:\s*(.+)$/.test(l)) {
      actual.template = l.replace(/^ {4}template:\s*/, '').trim();
    } else if (actual && !enApply && /^ {4}instruction:/.test(l)) {
      actual.instruction = true;
    } else if (!enApply && /^ {4}requires:/.test(l)) {
      // `requires: []` en línea es una lista vacía válida, no abre bloque
      if (!/^ {4}requires:\s*\[\s*\]\s*$/.test(l)) leyendoRequires = 'artefacto';
    } else if (enApply && /^ {2}requires:/.test(l)) {
      if (!/^ {2}requires:\s*\[\s*\]\s*$/.test(l)) leyendoRequires = 'apply';
    } else if (enApply && /^ {2}instruction:/.test(l)) {
      r.applyInstruction = true;
    }
  }
  return r;
}

/** Devuelve la lista de problemas de un schema. Vacía = sano. */
export function analizarSchema(
  carpeta: string,
  yaml: string,
  plantillas: string[],
): string[] {
  const p: string[] = [];
  const s = parsearSchema(yaml);

  if (!s.name) p.push(`falta 'name'`);
  else if (s.name !== carpeta) p.push(`'name' es '${s.name}' pero la carpeta es '${carpeta}'`);
  if (!/^[a-z0-9-]+$/.test(carpeta)) {
    p.push(`la carpeta '${carpeta}' no es [a-z0-9-]: getSchema la rechazaría`);
  }
  if (!s.version) p.push(`falta 'version'`);
  if (!s.description) p.push(`falta 'description'`);
  if (s.artefactos.length === 0) p.push(`no declara ningún artefacto`);

  const ids = s.artefactos.map(a => a.id);
  const vistos = new Set<string>();
  for (const a of s.artefactos) {
    if (a.id === '') p.push(`artefacto en la línea ${a.linea} sin id`);
    if (vistos.has(a.id)) p.push(`id '${a.id}' duplicado`);
    vistos.add(a.id);
    if (!a.generates) p.push(`artefacto '${a.id}': falta 'generates'`);
    if (!a.instruction) p.push(`artefacto '${a.id}': falta 'instruction'`);
    if (a.template && !plantillas.includes(a.template)) {
      p.push(`artefacto '${a.id}': template '${a.template}' no existe en templates/`);
    }
    for (const req of a.requires) {
      if (req === a.id) p.push(`artefacto '${a.id}' se requiere a sí mismo`);
      else if (!ids.includes(req)) {
        p.push(`artefacto '${a.id}': requires '${req}' no es un id de este schema`);
      } else if (ids.indexOf(req) > ids.indexOf(a.id)) {
        p.push(`artefacto '${a.id}': requires '${req}', que se define DESPUÉS`);
      }
    }
  }

  // Una plantilla que nadie menciona es peso muerto: o se referencia desde un
  // artefacto, o al menos se nombra en el yaml (p. ej. la produce la fase apply).
  for (const t of plantillas) {
    if (!yaml.includes(t)) p.push(`plantilla '${t}' no se referencia en schema.yaml`);
  }

  if (s.tieneApply) {
    if (!s.applyInstruction) p.push(`el bloque apply no tiene 'instruction'`);
    for (const req of s.applyRequires) {
      if (!ids.includes(req)) p.push(`apply: requires '${req}' no es un id de este schema`);
    }
  }

  return p;
}

function carpetasDeSchemas(): string[] {
  return fs
    .readdirSync(SCHEMAS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(SCHEMAS_DIR, d.name, 'schema.yaml')))
    .map(d => d.name)
    .sort();
}

function plantillasDe(carpeta: string): string[] {
  try {
    return fs
      .readdirSync(path.join(SCHEMAS_DIR, carpeta, 'templates'))
      .filter(f => f.endsWith('.md'));
  } catch {
    return []; // schema sin plantillas: válido
  }
}

describe('parsearSchema — la máquina de estados no confunde viñetas', () => {
  const YAML_TRAMPA = `name: trampa
version: 1
description: prueba
artifacts:
  - id: uno
    generates: uno.md
    template: uno.md
    instruction: >
      Secciones:

      - esto es una viñeta DENTRO de instruction, no un requires

      - y esta también
    requires: []
  - id: dos
    generates: dos.md
    instruction: >
      Otra cosa.
    requires:
      - uno
apply:
  requires:
    - dos
  instruction: |
    Haz lo que toque.
`;

  it('no toma las viñetas de instruction como requires', () => {
    const s = parsearSchema(YAML_TRAMPA);
    expect(s.artefactos.map(a => a.id)).toEqual(['uno', 'dos']);
    expect(s.artefactos[0].requires).toEqual([]);
    expect(s.artefactos[1].requires).toEqual(['uno']);
    expect(s.applyRequires).toEqual(['dos']);
    expect(s.applyInstruction).toBe(true);
  });

  it('un schema bien formado no reporta problemas', () => {
    expect(analizarSchema('trampa', YAML_TRAMPA, ['uno.md', 'dos.md'])).toEqual([]);
  });
});

describe('analizarSchema — detecta los fallos que hoy pasarían inadvertidos', () => {
  const base = (extra: string) => `name: x
version: 1
description: d
artifacts:
  - id: a
    generates: a.md
    template: a.md
    instruction: >
      Algo.
    requires: []
${extra}`;

  it('template declarado que no existe en templates/', () => {
    const p = analizarSchema('x', base(''), []);
    expect(p.join('\n')).toContain(`template 'a.md' no existe`);
  });

  it('requires que apunta a un id inexistente', () => {
    const yaml = base(`  - id: b
    generates: b.md
    instruction: >
      Algo.
    requires:
      - typo
`);
    expect(analizarSchema('x', yaml, ['a.md']).join('\n')).toContain(
      `requires 'typo' no es un id`,
    );
  });

  it('requires que apunta a un artefacto definido después', () => {
    const yaml = `name: x
version: 1
description: d
artifacts:
  - id: a
    generates: a.md
    instruction: >
      Algo.
    requires:
      - b
  - id: b
    generates: b.md
    instruction: >
      Algo.
    requires: []
`;
    expect(analizarSchema('x', yaml, []).join('\n')).toContain('se define DESPUÉS');
  });

  it('nombre de carpeta que no coincide con name', () => {
    expect(analizarSchema('otra', base(''), ['a.md']).join('\n')).toContain(
      `'name' es 'x' pero la carpeta es 'otra'`,
    );
  });

  it('plantilla huérfana que nadie referencia', () => {
    expect(analizarSchema('x', base(''), ['a.md', 'sobra.md']).join('\n')).toContain(
      `plantilla 'sobra.md' no se referencia`,
    );
  });
});

describe('integridad del corpus real de schemas/', () => {
  it('hay al menos un schema y todos son legibles', () => {
    expect(fs.existsSync(SCHEMAS_DIR)).toBe(true);
    expect(carpetasDeSchemas().length).toBeGreaterThan(0);
  });

  it('todo schema es coherente: templates existen, requires resuelven, apply válido', () => {
    const violaciones: string[] = [];
    for (const carpeta of carpetasDeSchemas()) {
      const yaml = fs.readFileSync(path.join(SCHEMAS_DIR, carpeta, 'schema.yaml'), 'utf8');
      for (const p of analizarSchema(carpeta, yaml, plantillasDe(carpeta))) {
        violaciones.push(`${carpeta}: ${p}`);
      }
    }
    expect(violaciones, `\n${violaciones.join('\n')}`).toEqual([]);
  });
});
