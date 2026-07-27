declare module 'node:crypto' {
  interface NodeDigest {
    update(data: string, inputEncoding?: string): NodeDigest;
    digest(): Uint8Array;
    digest(encoding: 'hex'): string;
  }

  export function createHash(algorithm: string): NodeDigest;
  export function createHmac(algorithm: string, key: string | Uint8Array): NodeDigest;
}
