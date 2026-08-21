/**
 * Minimal typed event emitter. Framework free so the core can be used without
 * React or the DOM `EventTarget` API (which is awkward to type).
 */
export type PlotEventListener<T> = (detail: T) => void;

export class PlotEventEmitter<EventMap extends object> {
  private listeners = new Map<keyof EventMap, Set<PlotEventListener<never>>>();

  addEventListener<K extends keyof EventMap>(
    type: K,
    listener: PlotEventListener<EventMap[K]>
  ): void {
    let set = this.listeners.get(type);
    if (set == null) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as PlotEventListener<never>);
  }

  removeEventListener<K extends keyof EventMap>(
    type: K,
    listener: PlotEventListener<EventMap[K]>
  ): void {
    this.listeners.get(type)?.delete(listener as PlotEventListener<never>);
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  protected emit<K extends keyof EventMap>(type: K, detail: EventMap[K]): void {
    const set = this.listeners.get(type);
    if (set == null) {
      return;
    }
    // Copy so listeners may unsubscribe while being notified
    const snapshot = Array.from(set) as PlotEventListener<EventMap[K]>[];
    for (let i = 0; i < snapshot.length; i += 1) {
      snapshot[i](detail);
    }
  }
}

export default PlotEventEmitter;
