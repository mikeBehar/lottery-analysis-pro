// js/state.js
// Simple pub/sub (event emitter) for app state management
// Usage: import state from './state.js';

class PubSub {
  constructor() {
    this.events = {};
  }

  subscribe(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(h => h !== handler);
    };
  }

  publish(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(handler => handler(data));
  }

  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

const state = new PubSub();
export default state;
