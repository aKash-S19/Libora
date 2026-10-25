/**
 * Deeply sanitizes objects and arrays for Cloud Firestore.
 * Cloud Firestore throws `FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined`
 * whenever any field in a document payload is `undefined`.
 *
 * This function recursively strips any keys whose values are `undefined`,
 * leaving valid primitives, objects, arrays, and nulls intact.
 */
export function removeUndefined<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as any;
  }
  return data;
}
