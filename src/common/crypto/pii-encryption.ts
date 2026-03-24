import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = 'PIIv1:';

function getKey(): Buffer {
  const keyBase64 = process.env.PII_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error(
      'PII_ENCRYPTION_KEY is required for PII encryption. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('PII_ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
  }
  return key;
}

/**
 * 주문자명, 주소, 연락처, 이메일 등 개인정보를 AES-256-GCM으로 암호화합니다.
 * null/빈 문자열은 그대로 반환합니다.
 */
export function encryptPii(plain: string | null | undefined): string | null {
  // ORM에서 nullable 컬럼을 undefined로 전달하는 경우가 있어, null로 정규화해 암호화 예외를 방지합니다.
  if (plain === undefined || plain === null || plain === '') return plain ?? null;
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, enc]);
  return PREFIX + combined.toString('base64');
}

/**
 * 암호화된 개인정보를 복호화합니다.
 * PIIv1: 접두사가 없으면 기존 평문 데이터로 간주하여 그대로 반환합니다.
 */
export function decryptPii(cipher: string | null | undefined): string | null {
  if (cipher === undefined || cipher === null || cipher === '') return cipher ?? null;
  if (!cipher.startsWith(PREFIX)) return cipher; // 기존 평문 데이터 호환
  const key = getKey();
  const combined = Buffer.from(cipher.slice(PREFIX.length), 'base64');
  const iv = combined.subarray(0, IV_LEN);
  const tag = combined.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = combined.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}

export const piiTransformer = {
  to: (value: string | null | undefined) => encryptPii(value),
  from: (value: string | null | undefined) => decryptPii(value),
};
