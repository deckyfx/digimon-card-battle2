/**
 * Persistence abstraction. The game logic never touches browser APIs
 * directly — swap providers to move persistence to a server later.
 */
export interface StorageProvider {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Browser localStorage provider (survives refresh and restarts). */
export class LocalStorageProvider implements StorageProvider {
  get(key: string): string | null {
    return localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }
}

/** In-memory provider for headless use (tests, simulations). */
export class MemoryStorageProvider implements StorageProvider {
  private readonly data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}
