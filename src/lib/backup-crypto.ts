import { BackupError } from "./backup";

/**
 * Optional password protection for backups: AES-256-GCM with a PBKDF2-SHA-256 key.
 *
 *   "DOCUTILE-ENCRYPT\n"  17 bytes magic
 *   uint32 big-endian     header length
 *   JSON header           { v, kdf, iterations, salt, iv, chunkSize, plainSize }
 *   ciphertext            the plain backup in chunks, each encrypted separately (16-byte tag each)
 *
 * Each chunk uses its own IV (the base IV with the chunk number mixed in) and authenticates its position and
 * whether it is the last chunk, so chunks cannot be reordered, dropped or truncated without detection.
 * A forgotten password cannot be recovered.
 */
export const ENC_MAGIC = "DOCUTILE-ENCRYPT\n";
const TAG_BYTES = 16;
export const DEFAULT_ITERATIONS = 600_000;
const MIN_ITERATIONS = 1_000;
const MAX_ITERATIONS = 10_000_000;
export const DEFAULT_CHUNK = 4 * 1024 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;

export class BackupPasswordError extends BackupError {
  constructor(message = "That password is wrong, or the backup file is damaged.") {
    super(message);
    this.name = "BackupPasswordError";
  }
}

/** Thrown when an encrypted backup is opened without a password. */
export class BackupPasswordRequired extends BackupError {
  constructor() {
    super("This backup is password-protected. Enter its password to import it.");
    this.name = "BackupPasswordRequired";
  }
}

interface EncHeader {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  chunkSize: number;
  plainSize: number;
}

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function isEncryptedBackup(file: Blob): Promise<boolean> {
  if (file.size < ENC_MAGIC.length) return false;
  return (await file.slice(0, ENC_MAGIC.length).text()) === ENC_MAGIC;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Per-chunk IV: base IV with the chunk number XORed into its last four bytes. */
function chunkIv(base: Uint8Array, index: number): Uint8Array {
  const iv = base.slice();
  const view = new DataView(iv.buffer);
  view.setUint32(8, (view.getUint32(8, false) ^ index) >>> 0, false);
  return iv;
}

/** Authenticated data for a chunk: its number and whether it is the final one. */
function chunkAad(index: number, last: boolean): Uint8Array {
  const aad = new Uint8Array(5);
  new DataView(aad.buffer).setUint32(0, index, false);
  aad[4] = last ? 1 : 0;
  return aad;
}

export async function encryptBlob(plain: Blob, password: string, opts: { iterations?: number; chunkSize?: number } = {}): Promise<Blob> {
  if (!password) throw new BackupError("Enter a password to encrypt the backup.");
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS;
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iterations);

  const header: EncHeader = { v: 1, kdf: "PBKDF2-SHA256", iterations, salt: b64(salt), iv: b64(iv), chunkSize, plainSize: plain.size };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, headerBytes.length, false);

  const parts: BlobPart[] = [ENC_MAGIC, len, headerBytes as BufferSource];
  const chunks = Math.max(1, Math.ceil(plain.size / chunkSize));
  for (let i = 0; i < chunks; i++) {
    const data = await plain.slice(i * chunkSize, (i + 1) * chunkSize).arrayBuffer();
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: chunkIv(iv, i) as BufferSource, additionalData: chunkAad(i, i === chunks - 1) as BufferSource },
      key,
      data,
    );
    parts.push(ct);
  }
  return new Blob(parts, { type: "application/octet-stream" });
}

function readHeader(h: unknown): EncHeader {
  const o = h as Partial<EncHeader>;
  if (!o || o.v !== 1 || o.kdf !== "PBKDF2-SHA256" || typeof o.salt !== "string" || typeof o.iv !== "string" ||
      !Number.isInteger(o.iterations) || !Number.isInteger(o.chunkSize) || !Number.isInteger(o.plainSize)) {
    throw new BackupError("The encrypted backup is damaged (its header is invalid).");
  }
  const e = o as EncHeader;
  if (e.iterations < MIN_ITERATIONS || e.iterations > MAX_ITERATIONS || e.chunkSize < 1 || e.chunkSize > MAX_CHUNK || e.plainSize < 0) {
    throw new BackupError("The encrypted backup is damaged (unsupported settings).");
  }
  if (unb64(e.iv).length !== 12 || unb64(e.salt).length < 8) throw new BackupError("The encrypted backup is damaged (bad key material).");
  return e;
}

export async function decryptBlob(enc: Blob, password: string): Promise<Blob> {
  const m = ENC_MAGIC.length;
  if (!(await isEncryptedBackup(enc)) || enc.size < m + 4) throw new BackupError("This is not an encrypted Docutile backup.");
  const hLen = new DataView(await enc.slice(m, m + 4).arrayBuffer()).getUint32(0, false);
  if (hLen === 0 || hLen > 4096 || m + 4 + hLen > enc.size) throw new BackupError("The encrypted backup is damaged (its header is invalid).");
  let header: EncHeader;
  try {
    header = readHeader(JSON.parse(await enc.slice(m + 4, m + 4 + hLen).text()));
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError("The encrypted backup is damaged (its header cannot be read).");
  }
  const chunks = Math.max(1, Math.ceil(header.plainSize / header.chunkSize));
  const expected = header.plainSize + chunks * TAG_BYTES;
  const start = m + 4 + hLen;
  if (enc.size - start !== expected) throw new BackupError("The encrypted backup is damaged or incomplete (its size does not match).");

  const key = await deriveKey(password, unb64(header.salt), header.iterations);
  const iv = unb64(header.iv);
  const out: BlobPart[] = [];
  for (let i = 0; i < chunks; i++) {
    const plainLen = i === chunks - 1 ? header.plainSize - i * header.chunkSize : header.chunkSize;
    const from = start + i * (header.chunkSize + TAG_BYTES);
    const data = await enc.slice(from, from + plainLen + TAG_BYTES).arrayBuffer();
    try {
      out.push(await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: chunkIv(iv, i) as BufferSource, additionalData: chunkAad(i, i === chunks - 1) as BufferSource },
        key,
        data,
      ));
    } catch {
      throw new BackupPasswordError();
    }
  }
  return new Blob(out);
}
