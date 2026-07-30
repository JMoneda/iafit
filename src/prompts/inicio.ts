import type { PromptModule } from './types.js';

export const inicio: PromptModule = {
  name: 'iafit-inicio',
  description:
    'Saludo inicial — confirma que IAFIT está activo y orienta al usuario sobre qué quiere hacer (desarrollar o migrar)',
  build: () => ({
    description: 'Saludo inicial de IAFIT',
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text:
            'El servidor MCP IAFIT está activo. Saluda al usuario con un mensaje breve pero innovador, en español, ' +
            'confirmando que las tools de IAFIT están disponibles (reglas de arquitectura y de migración, ' +
            'schemas de OpenSpec y Azure DevOps). Pregúntale qué quiere hacer hoy:\n' +
            '  1) Desarrollar (Frontend / Backend / Full Stack)\n' +
            '  2) Migrar / actualizar un proyecto existente\n' +
            '  3) Trabajar con especificaciones (SDD: OpenSpec / SpecKit)\n\n' +
            'Si elige desarrollar, usa el prompt "iafit-desarrollo" para conducir el onboarding: ' +
            'detecta el stack, confirma el contexto y carga las reglas aplicables antes de escribir código. ' +
            'Si elige migrar, usa el prompt "iafit-migracion" para conducir el onboarding. ' +
            'Si elige SDD (o pregunta por specs, OpenSpec, SpecKit, la constitución, o cómo cambiar de ' +
            'framework), usa el prompt "iafit-sdd": detecta el framework del proyecto y ofrece las ' +
            'opciones disponibles. ' +
            'Espera su respuesta antes de continuar.',
        },
      },
    ],
  }),
};
