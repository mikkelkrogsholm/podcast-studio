export type EventMap = {
  'session:completed': {
    sessionId: string;
    status?: string;
    duration?: number;
    messageCount?: number;
    completedAt?: number;
  };
};

export type EventListener<T = any> = (data: T) => void;

export class EventEmitter<T extends Record<string, any> = EventMap> {
  private listeners: Record<string, EventListener[]> = {};

  on<K extends keyof T>(event: K, listener: EventListener<T[K]>): void {
    const eventKey = String(event);
    if (!this.listeners[eventKey]) {
      this.listeners[eventKey] = [];
    }
    this.listeners[eventKey].push(listener);
  }

  off<K extends keyof T>(event: K, listener: EventListener<T[K]>): void {
    const eventKey = String(event);
    const eventListeners = this.listeners[eventKey];
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
      if (eventListeners.length === 0) {
        delete this.listeners[eventKey];
      }
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventKey = String(event);
    const eventListeners = this.listeners[eventKey];
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          // Silent error handling in shared package
          // Consumers can handle errors in their own listeners
        }
      });
    }
  }
}

export function createNoOpSubscriber<T = any>(): EventListener<T> {
  return () => {
    // No-op function for testing or default scenarios
  };
}