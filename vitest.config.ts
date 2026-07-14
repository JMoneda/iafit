import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Cada archivo de test corre en su propio proceso: los módulos leen
    // process.env al importarse, así el entorno de un test no contamina otro.
    pool: 'forks',
    isolate: true,
  },
});
