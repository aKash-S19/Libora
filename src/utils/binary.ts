const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Converts an ArrayBuffer to a clean base64 string without using React Native's native Blob store
 * or FileReader.readAsDataURL.
 * This completely avoids the "Response.blob() is using React Native's Blob" warning and memory overhead.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.length;

  if (typeof btoa === 'function') {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }

  // Pure JavaScript RFC 4648 Base64 fallback
  let base64 = '';
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    base64 += B64_CHARS[b0 >> 2];
    base64 += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < len ? B64_CHARS[b2 & 63] : '=';
  }
  return base64;
}
