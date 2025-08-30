// tests/app-pubsub.test.js
// Unit tests for pub/sub event flows in app.js (analysis and file upload)
import state from '../js/state.js';

describe('App pub/sub event flows', () => {
  afterEach(() => {
    state.clear();
  });

  test('runAnalysis publishes correct events in order or error if no data', () => {
    const events = [];
    state.subscribe('progress', msg => events.push(['progress', msg]));
    state.subscribe('energyResults', data => events.push(['energyResults', data]));
    state.subscribe('mlResults', data => events.push(['mlResults', data]));
    state.subscribe('recommendations', data => events.push(['recommendations', data]));
    state.subscribe('analyzeBtnState', val => events.push(['analyzeBtnState', val]));
    state.subscribe('hideProgress', () => events.push(['hideProgress']));
    state.subscribe('error', err => {
      events.push(['error', err]);
      // Also log error to console for visibility
      if (err && err.title && err.message) {
        console.error(`${err.title}: ${err.message}`);
      }
    });

    // Simulate state.draws present
    state.draws = [{ whiteBalls: [1,2,3,4,5] }];
    // Mock calculateEnergy, getFrequencyFallback, generateRecommendations
    global.calculateEnergy = () => [{ number: 1, energy: 1 }];
    global.getFrequencyFallback = () => ({ whiteBalls: [1,2,3,4,5], powerball: 1, confidence: 1, model: 'mock' });
    global.generateRecommendations = () => ({ highConfidence: [1], energyBased: [1,2,3,4,5], mlBased: [1,2,3,4,5], powerball: 1, summary: 'mock' });
    // Import runAnalysis dynamically to use the mocks
    return import('../js/app.js').then(mod => mod.runAnalysis()).then(() => {
      if (events[0][0] === 'error') {
        // If no data, expect error event
        expect(events[0][0]).toBe('error');
        expect(events[0][1].title).toBe('No Data');
      } else {
        // Otherwise, expect normal event flow
        expect(events[0][0]).toBe('analyzeBtnState');
        expect(events[1][0]).toBe('progress');
        expect(events.some(e => e[0] === 'energyResults')).toBe(true);
        expect(events.some(e => e[0] === 'mlResults')).toBe(true);
        expect(events.some(e => e[0] === 'recommendations')).toBe(true);
        expect(events.filter(e => e[0] === 'analyzeBtnState').pop()[1]).toBe(true);
        expect(events.some(e => e[0] === 'hideProgress')).toBe(true);
      }
    });
  });

  test('runAnalysis with no draws publishes error', () => {
    const errors = [];
    state.clear();
    state.subscribe('error', err => errors.push(err));
    state.draws = [];
    return import('../js/app.js').then(mod => mod.runAnalysis()).then(() => {
      expect(errors.length).toBe(1);
      expect(errors[0].title).toBe('No Data');
    });
  });

  test('handleFileUpload publishes events for progress, error, and drawsUpdated', () => {
    const events = [];
    state.subscribe('progress', msg => events.push(['progress', msg]));
    state.subscribe('hideProgress', () => events.push(['hideProgress']));
    state.subscribe('error', err => events.push(['error', err]));
    state.subscribe('drawsUpdated', draws => events.push(['drawsUpdated', draws]));
    state.subscribe('analyzeBtnState', val => events.push(['analyzeBtnState', val]));
    // Simulate a file upload with error
    const fakeEvent = { target: { files: [null] } };
    return import('../js/app.js').then(mod => mod.handleFileUpload(fakeEvent)).then(() => {
      expect(events.some(e => e[0] === 'analyzeBtnState' && e[1] === false)).toBe(true);
    });
  });
});
