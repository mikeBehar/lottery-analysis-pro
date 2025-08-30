// tests/state.test.js
// Unit tests for js/state.js pub/sub module
import state from '../js/state.js';

describe('PubSub state module', () => {
  afterEach(() => {
    state.clear();
  });

  test('subscribe and publish should call handler', () => {
    const handler = jest.fn();
    state.subscribe('testEvent', handler);
    state.publish('testEvent', 42);
    expect(handler).toHaveBeenCalledWith(42);
  });

  test('unsubscribe should remove handler', () => {
    const handler = jest.fn();
    const unsubscribe = state.subscribe('testEvent', handler);
    unsubscribe();
    state.publish('testEvent', 123);
    expect(handler).not.toHaveBeenCalled();
  });

  test('multiple handlers for same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    state.subscribe('multi', handler1);
    state.subscribe('multi', handler2);
    state.publish('multi', 'data');
    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  test('clear(event) removes only that event', () => {
    const handler = jest.fn();
    state.subscribe('a', handler);
    state.subscribe('b', handler);
    state.clear('a');
    state.publish('a', 1);
    state.publish('b', 2);
    expect(handler).toHaveBeenCalledWith(2);
    expect(handler).not.toHaveBeenCalledWith(1);
  });

  test('clear() removes all events', () => {
    const handler = jest.fn();
    state.subscribe('a', handler);
    state.subscribe('b', handler);
    state.clear();
    state.publish('a', 1);
    state.publish('b', 2);
    expect(handler).not.toHaveBeenCalled();
  });
});
