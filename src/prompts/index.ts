import type { PromptModule } from './types.js';
import { inicio } from './inicio.js';
import { migracion } from './migracion.js';
import { desarrollo } from './desarrollo.js';
import { sdd } from './sdd.js';

export const prompts: PromptModule[] = [inicio, migracion, desarrollo, sdd];

export const promptMap = new Map(prompts.map(p => [p.name, p]));
