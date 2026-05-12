import * as SecureStore from 'expo-secure-store';

/** expo-secure-store limits values (~2KB on iOS). Chunk auth session JSON for Supabase. */
const CHUNK_SIZE = 1800;

function chunkKey(base: string, index: number) {
  return `${base}.chunk.${index}`;
}

export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    const head = await SecureStore.getItemAsync(chunkKey(key, 0));
    if (head == null) return null;
    if (head.length < CHUNK_SIZE) return head;
    let full = head;
    for (let i = 1; i < 32; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) break;
      full += part;
      if (part.length < CHUNK_SIZE) break;
    }
    return full;
  },

  async setItem(key: string, value: string): Promise<void> {
    await supabaseSecureStorage.removeItem(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(chunkKey(key, 0), value);
      return;
    }
    for (let i = 0, o = 0; o < value.length; i++, o += CHUNK_SIZE) {
      await SecureStore.setItemAsync(
        chunkKey(key, i),
        value.slice(o, o + CHUNK_SIZE)
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    for (let i = 0; i < 32; i++) {
      const k = chunkKey(key, i);
      const existing = await SecureStore.getItemAsync(k);
      if (existing == null) break;
      await SecureStore.deleteItemAsync(k);
    }
  },
};
