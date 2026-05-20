import 'react-native-url-polyfill/auto';
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

// eslint-disable-next-line import/first
import { createClient } from '@insforge/sdk';

const insforgeUrl = process.env.EXPO_PUBLIC_INSFORGE_URL;
const insforgeAnonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY;

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey
});

export async function uploadToInsForge(bucketName: string, path: string, selectedImage: { uri: string, size?: number }) {
  const httpClient = insforge.getHttpClient();
  const size = Math.max(selectedImage.size || 0, 10 * 1024 * 1024);
  const filename = path;
  const contentType = 'image/jpeg';
  
  console.log('[uploadToInsForge] Fetching strategy for:', filename, 'size:', size);
  
  let strategyResponse: any;
  try {
    strategyResponse = await httpClient.post(
      `/api/storage/buckets/${bucketName}/upload-strategy`,
      {
        filename,
        contentType,
        size
      }
    );
  } catch (strategyError: any) {
    console.error('[uploadToInsForge] Failed getting upload strategy:', strategyError);
    throw new Error(`Failed getting upload strategy: ${strategyError.message || strategyError}`);
  }

  console.log('[uploadToInsForge] Strategy response method:', strategyResponse.method);

  if (strategyResponse.method !== 'presigned') {
    throw new Error(`Unsupported upload method: ${strategyResponse.method}`);
  }

  // Build FormData
  const formData = new FormData();
  if (strategyResponse.fields) {
    Object.entries(strategyResponse.fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
  }

  // React Native format file payload
  const filePayload = {
    uri: selectedImage.uri,
    name: filename,
    type: contentType,
  } as any;

  formData.append('file', filePayload);

  console.log('[uploadToInsForge] Fetching S3 presigned URL:', strategyResponse.uploadUrl);

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(strategyResponse.uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (fetchError: any) {
    console.error('[uploadToInsForge] Network fetch error during S3 upload:', fetchError);
    throw new Error(`Network fetch to S3 failed: ${fetchError.message || fetchError}`);
  }

  console.log('[uploadToInsForge] S3 upload status:', uploadResponse.status, uploadResponse.statusText);

  if (!uploadResponse.ok) {
    let responseText = '';
    try {
      responseText = await uploadResponse.text();
    } catch {
      responseText = '(could not read response text)';
    }
    console.error('[uploadToInsForge] S3 upload rejected. Status:', uploadResponse.status, 'Response:', responseText);
    throw new Error(`S3 upload rejected (${uploadResponse.status}): ${responseText}`);
  }

  if (strategyResponse.confirmRequired && strategyResponse.confirmUrl) {
    console.log('[uploadToInsForge] Confirming upload at:', strategyResponse.confirmUrl);
    try {
      await httpClient.post(
        strategyResponse.confirmUrl,
        {
          size,
          contentType
        }
      );
      console.log('[uploadToInsForge] Confirm success');
      return {
        url: `${httpClient.baseUrl}/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(strategyResponse.key)}`
      };
    } catch (confirmError: any) {
      console.error('[uploadToInsForge] Confirmation failed:', confirmError);
      throw new Error(`Upload confirmation failed: ${confirmError.message || confirmError}`);
    }
  }

  return {
    url: `${httpClient.baseUrl}/api/storage/buckets/${bucketName}/objects/${encodeURIComponent(strategyResponse.key)}`
  };
}


