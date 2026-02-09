import { EventEmitter } from 'events';

// Create a singleton event emitter for the app
class AppEventEmitter {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(20); // Increase max listeners to prevent warnings
  }

  emit(event: string, data?: any) {
    this.emitter.emit(event, data);
  }

  on(event: string, listener: (data?: any) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (data?: any) => void) {
    this.emitter.off(event, listener);
  }

  once(event: string, listener: (data?: any) => void) {
    this.emitter.once(event, listener);
  }
}

export const appEventEmitter = new AppEventEmitter();