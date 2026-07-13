import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TOKEN_DIR = process.env.IAFIT_DATA_DIR ?? path.join(os.homedir(), '.iafit');
const TOKEN_FILE = path.join(TOKEN_DIR, 'tokens.enc');
const SCRYPT_SALT = 'iafit-token-salt-v1';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function deriveKey(): Buffer {
  const machineId = `${os.hostname()}:${os.userInfo().username}`;
  return crypto.scryptSync(machineId, SCRYPT_SALT, 32);
}

function encrypt(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted: encrypted.toString('hex'),
    authTag: authTag.toString('hex'),
  });
}

function decrypt(raw: string): string {
  const key = deriveKey();
  const { iv, encrypted, authTag } = JSON.parse(raw) as {
    iv: string;
    encrypted: string;
    authTag: string;
  };
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return (
    decipher.update(Buffer.from(encrypted, 'hex')).toString('utf8') +
    decipher.final('utf8')
  );
}

export function saveTokens(tokens: TokenData): void {
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, encrypt(JSON.stringify(tokens)), 'utf8');
}

export function loadTokens(): TokenData | null {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8');
    return JSON.parse(decrypt(raw)) as TokenData;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  try {
    fs.unlinkSync(TOKEN_FILE);
  } catch {
    // no token file to clear
  }
}
