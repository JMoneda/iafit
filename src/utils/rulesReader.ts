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

export function searchRules(query: string, category?: Category): SearchMatch[] {
  const lower = query.toLowerCase();
  const categories = category ? [category] : VALID_CATEGORIES;
  const results: SearchMatch[] = [];

  for (const cat of categories) {
    for (const file of listMarkdownFiles(cat)) {
      try {
        const raw = fs.readFileSync(path.join(RULES_DIR, cat, file), 'utf8');
        const { data, content } = matter(raw);
        const fm = data as Partial<RuleFrontmatter>;
        const combined = `${fm.title ?? ''} ${content}`.toLowerCase();

        if (!combined.includes(lower)) continue;

        const idx = combined.indexOf(lower);
        const start = Math.max(0, idx - 80);
        const end = Math.min(combined.length, idx + query.length + 80);
        const excerpt = `...${combined.slice(start, end).trim()}...`;

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
