import type { PromptModule } from './types.js';
import { inicio } from './inicio.js';
import { migracion } from './migracion.js';

export const prompts: PromptModule[] = [inicio, migracion];

export const promptMap = new Map(prompts.map(p => [p.name, p]));
