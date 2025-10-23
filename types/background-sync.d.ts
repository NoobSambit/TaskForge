// Type definitions for Background Sync API
// https://wicg.github.io/background-sync/spec/

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

interface ServiceWorkerGlobalScopeEventMap {
  sync: SyncEvent;
}
