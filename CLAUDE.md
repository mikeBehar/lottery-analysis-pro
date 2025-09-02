# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building
- `npm run build` - Build the entire application (includes workers and main bundle)
- `npm run build:workers` - Build only the web workers (ML and backtest workers)
- Main bundle: `js/app.js` → `dist/bundle.js`
- Workers: `js/workers/*.js` → `dist/*.bundle.js`

### Testing
- `npm test` - Run Jest unit tests (located in `/tests/` directory)
- `npm run test:e2e` - Run Playwright E2E tests (requires build first via pretest:e2e)
- `npm run posttest:e2e` - Show Playwright test report after E2E tests
- E2E tests are in `/tests-e2e/` and use Python HTTP server on port 5500
- Unit tests use jsdom environment with Babel transpilation

### Linting
- `npm run lint` - Run ESLint on JavaScript files in `/js/` directory

### Development Server
- E2E tests automatically start Python HTTP server: `python -m http.server 5500`
- Base URL for testing: `http://127.0.0.1:5500`

## Architecture Overview

### Core Application Structure
This is a lottery analysis application built with vanilla JavaScript using ES modules and a pub/sub architecture for state management.

**Main Components:**
- `js/app.js` - Main application entry point and backtest integration
- `js/state.js` - Centralized pub/sub state management system
- `js/ui.js` - UI element management and initialization
- `js/utils.js` - Energy calculations and analytical utilities
- `js/ml.js` - Machine learning functions and predictions
- `js/analysis.js` - Data analysis functions
- `js/strategy.js` - Strategy building and configuration
- `js/csv-parser.js` - CSV file parsing for lottery data

### Web Workers
The application uses two dedicated web workers for heavy computational tasks:
- `js/workers/ml-worker.js` - Machine learning predictions and model training
- `js/workers/backtest-worker.js` - Backtesting strategies against historical data
- Workers are bundled separately and communicate via the main thread

### State Management
Uses a custom pub/sub system (`js/state.js`) for event-driven architecture:
- Components publish events: `state.publish('event', data)`
- Components subscribe to events: `state.subscribe('event', handler)`
- Returns unsubscribe function for cleanup
- Key events include: `progress`, `error`, `backtestResults`, `backtest:run`, `backtest:result`

### Data Flow
1. CSV lottery data uploaded via UI → parsed by `csv-parser.js`
2. Data stored in `state.draws` array
3. Analysis functions process draws for patterns and statistics
4. ML worker performs predictions on processed data
5. Backtest worker validates strategies against historical data
6. Results displayed through UI components

### Test Structure
- **Unit Tests**: Jest-based tests in `/tests/` covering all major modules
- **E2E Tests**: Playwright tests in `/tests-e2e/` for full application workflows
- **Test Utilities**: Custom utilities in `/test-utils/` for robust testing
- Uses jsdom for DOM simulation in unit tests

### Build System
Uses esbuild for bundling:
- Bundles ES modules into browser-compatible code
- Generates source maps for debugging
- Separate bundles for main app and web workers
- No TypeScript - pure JavaScript with ES2021+ features

### Key Dependencies
- **TensorFlow.js**: Machine learning capabilities
- **Jest**: Unit testing framework
- **Playwright**: E2E testing
- **ESLint**: Code linting with recommended rules
- **esbuild**: Fast JavaScript bundler