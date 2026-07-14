import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const RULES_DIR =
  process.env.IAFIT_RULES_DIR ?? path.join(__dirname, '../../rules');

export type Category =
  | 'architecture'
  | 'code-standards'
  | 'adrs'
  | 'security'
  | 'migration'
  | 'observabilidad'
  | 'pruebas'
  | 'cicd';

export const VALID_CATEGORIES: Category[] = [
  'architecture',
  'code-standards',
  'adrs',
  'security',
  'migration',
  'observabilidad',
  'pruebas',
  'cicd',
];

export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  architecture: 'Reglas de arquitectura por tipo de proyecto',
  'code-standards': 'Estándares de código por lenguaje o stack',
  adrs: 'Architecture Decision Records',
  security: 'Políticas de seguridad de desarrollo',
  migration: 'Reglas y matrices para migrar/actualizar proyectos entre versiones de framework',
  observabilidad: 'Logging, telemetría, auditoría y monitoreo',
  pruebas: 'Estándares de pruebas y calidad de código',
  cicd: 'CI/CD, DevOps e Infraestructura como Código',
};

export function isValidCategory(cat: string): cat is Category {
  return VALID_CATEGORIES.includes(cat as Category);
}

export interface RuleFrontmatter {
  title: string;
  category: string;
  slug: string;
  version?: string;
  last_updated?: string;
  applies_to?: string[];
  status?: 'active' | 'deprecated' | 'draft';
}

export interface RuleEntry {
  slug: string;
  title: string;
  applies_to: string[];
  status: string;
  last_updated: string;
}

export type RuleError = { error: string; message: string };

function listMarkdownFiles(category: Category): string[] {
  const dir = path.join(RULES_DIR, category);
  try {
    return fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.md') && f !== '_index.md');
  } catch {
    return [];
  }
}

function readFrontmatter(filePath: string): Partial<RuleFrontmatter> {
  try {
    const { data } = matter(fs.readFileSync(filePath, 'utf8'));
    return data as Partial<RuleFrontmatter>;
  } catch {
    return {};
  }
}

export function countRulesInCategory(category: Category): number {
  return listMarkdownFiles(category).length;
}

export function listRulesInCategory(category: Category): RuleEntry[] {
  return listMarkdownFiles(category).map(file => {
    const fm = readFrontmatter(path.join(RULES_DIR, category, file));
    return {
      slug: fm.slug ?? file.replace('.md', ''),
      title: fm.title ?? file,
      applies_to: fm.applies_to ?? ['all'],
      status: fm.status ?? 'active',
      last_updated: fm.last_updated ?? '',
    };
  });
}

export function getRule(
  category: Category,
  slug: string,
): { frontmatter: RuleFrontmatter; content: string } | RuleError {
  const dir = path.join(RULES_DIR, category);
  const files = listMarkdownFiles(category);

  const file = files.find(f => {
    const fm = readFrontmatter(path.join(dir, f));
    return fm.slug === slug || f === `${slug}.md`;
  });

  if (!file) {
    return {
      error: 'rule_not_found',
      message: `No existe regla con slug '${slug}' en categoría '${category}'.`,
    };
  }

  try {
    const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
    return { frontmatter: data as RuleFrontmatter, content };
  } catch {
    return {
      error: 'rule_not_found',
      message: `No se pudo leer la regla '${slug}' en categoría '${category}'.`,
    };
  }
}

export interface SearchMatch {
  category: Category;
  slug: string;
  title: string;
  excerpt: string;
}

/**
 * Pliega un code point para búsqueda: quita diacríticos (migración → migracion)
 * y pasa a minúsculas. Garantiza mapeo 1:1 en code points para que los índices
 * del texto plegado coincidan con los del texto original.
 */
function foldCodePoint(c: string): string {
  const folded = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const points = Array.from(folded);
  return points.length === 1 ? points[0] : c;
}

function foldToCodePoints(s: string): string[] {
  return Array.from(s).map(foldCodePoint);
}

/** indexOf de subsecuencia sobre arreglos de code points. */
function indexOfCodePoints(haystack: string[], needle: string[]): number {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

export function searchRules(query: string, category?: Category): SearchMatch[] {
  const foldedQuery = foldToCodePoints(query.trim());
  if (foldedQuery.length === 0) return [];

  const categories = category ? [category] : VALID_CATEGORIES;
  const results: SearchMatch[] = [];

  for (const cat of categories) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;

        const original = Array.from(`${fm.title ?? ''} ${content}`);
        const folded = original.map(foldCodePoint);

        const idx = indexOfCodePoints(folded, foldedQuery);
        if (idx === -1) continue;

        const start = Math.max(0, idx - 80);
        const end = Math.min(original.length, idx + foldedQuery.length + 80);
        const excerpt = `...${original.slice(start, end).join('').trim()}...`;

        results.push({
          category: cat,
          slug: fm.slug ?? file.replace('.md', ''),
          title: fm.title ?? file,
          excerpt,
        });
      } catch {
        // skip unreadable files
      }
    }
  }

  return results;
}
