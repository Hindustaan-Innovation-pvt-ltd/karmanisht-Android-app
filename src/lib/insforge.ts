import * as Crypto from 'expo-crypto';

// Polyfill Web Crypto API for React Native environment to support PKCE flows in InsForge SDK
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = (array: any) => {
    return Crypto.getRandomValues(array);
  };
}

if (typeof global.crypto.subtle === 'undefined') {
  Object.defineProperty(global.crypto, 'subtle', {
    value: {
      digest: async (algorithm: string, data: Uint8Array) => {
        if (algorithm === 'SHA-256') {
          // Convert the Uint8Array data (ASCII characters of the verifier string) back to a string
          const verifier = Array.from(data).map(c => String.fromCharCode(c)).join('');
          
          // Hash the verifier string using expo-crypto's SHA-256 algorithm
          const hexHash = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            verifier,
            { encoding: Crypto.CryptoEncoding.HEX }
          );
          
          // Convert the hex string back to an ArrayBuffer
          const len = hexHash.length;
          const buffer = new Uint8Array(len / 2);
          for (let i = 0; i < len; i += 2) {
            buffer[i / 2] = parseInt(hexHash.substring(i, i + 2), 16);
          }
          return buffer.buffer;
        }
        throw new Error(`Unsupported digest algorithm: ${algorithm}`);
      }
    },
    configurable: true,
    writable: true,
    enumerable: true
  });
}

// Polyfill globalThis.crypto as well for complete environment consistency
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = global.crypto;
}

import { createClient } from '@insforge/sdk';

const insforgeUrl = process.env.EXPO_PUBLIC_INSFORGE_URL;
const insforgeAnonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey
});

