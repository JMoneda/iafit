import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let tmpDir: string | null = null;

async function loadStore() {
  vi.resetModules();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iafit-tokens-'));
  process.env.IAFIT_DATA_DIR = tmpDir;
  return import('../src/auth/tokenStore.js');
}

afterEach(() => {
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
  delete process.env.IAFIT_DATA_DIR;
});

describe('tokenStore — cifrado y persistencia', () => {
  it('guarda y recupera tokens (roundtrip cifrado AES-256-GCM)', async () => {
    const m = await loadStore();
    const tokens = {
      accessToken: 'acceso-123',
      refreshToken: 'refresh-456',
      expiresAt: Date.now() + 3_600_000,
    };
    m.saveTokens(tokens);
    expect(m.loadTokens()).toEqual(tokens);
  });

  it('el archivo en disco NO contiene los tokens en claro', async () => {
    const m = await loadStore();
    m.saveTokens({
      accessToken: 'super-secreto-abc',
      refreshToken: 'refresh-xyz',
      expiresAt: 123,
    });
    const raw = fs.readFileSync(path.join(tmpDir!, 'tokens.enc'), 'utf8');
    expect(raw).not.toContain('super-secreto-abc');
    expect(raw).not.toContain('refresh-xyz');
    // estructura esperada del sobre cifrado
    const parsed = JSON.parse(raw) as Record<string, string>;
    expect(Object.keys(parsed).sort()).toEqual(['authTag', 'encrypted', 'iv']);
  });

  it('devuelve null si no hay archivo de tokens', async () => {
    const m = await loadStore();
    expect(m.loadTokens()).toBeNull();
  });

  it('devuelve null (sin lanzar) si el archivo fue alterado — GCM detecta manipulación', async () => {
    const m = await loadStore();
    m.saveTokens({ accessToken: 'a', refreshToken: 'b', expiresAt: 1 });
    const file = path.join(tmpDir!, 'tokens.enc');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
    // voltea un byte del ciphertext
    const bytes = Buffer.from(parsed.encrypted, 'hex');
    bytes[0] = bytes[0] ^ 0xff;
    parsed.encrypted = bytes.toString('hex');
    fs.writeFileSync(file, JSON.stringify(parsed), 'utf8');
    expect(m.loadTokens()).toBeNull();
  });

  it('clearTokens elimina el archivo y es idempotente', async () => {
    const m = await loadStore();
    m.saveTokens({ accessToken: 'a', refreshToken: 'b', expiresAt: 1 });
    m.clearTokens();
    expect(m.loadTokens()).toBeNull();
    expect(() => m.clearTokens()).not.toThrow();
  });
});
