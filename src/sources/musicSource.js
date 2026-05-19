export class EventEmitter {
  #listeners = new Map();

  on(type, handler) {
    const handlers = this.#listeners.get(type) ?? new Set();
    handlers.add(handler);
    this.#listeners.set(type, handlers);
    return () => handlers.delete(handler);
  }

  emit(type, payload) {
    for (const handler of this.#listeners.get(type) ?? []) {
      handler(payload);
    }
  }
}
