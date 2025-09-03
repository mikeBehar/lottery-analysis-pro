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
- `js/enhanced-recommendations.js` - Advanced multi-method recommendation engine (NEW)
- `js/confidence-predictor.js` - Position-based predictions with confidence intervals (NEW)

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

## Recent Enhancements (September 2025)

### Enhanced Recommendations System
The application now features a sophisticated multi-method recommendation engine that addresses the previous limitation of only showing 1 high-confidence number:

**Key Features:**
- **Multi-Method Consensus**: Combines Energy Analysis, ML Predictions, Position-Based Analysis, and Frequency Analysis
- **Tiered Confidence Levels**: High (≥80%), Medium (≥60%), and Alternative strategies
- **Position-Aware Analysis**: Statistical analysis of each ball position with confidence intervals
- **Alternative Selection Strategies**: 4 different approaches (Balanced Range, Hot/Cold Mix, Overdue Numbers, Pattern Avoidance)

**Technical Implementation:**
- `generateEnhancedRecommendations()` in `js/enhanced-recommendations.js`
- Integrated into main analysis workflow in `js/app.js`
- Uses bootstrap resampling and time-weighted confidence intervals
- Backward compatible with existing UI expectations

### Position-Based Predictions
Advanced statistical analysis treating each ball position independently:
- **Statistical Methods**: Bootstrap, Time-weighted, Normal approximation
- **Confidence Intervals**: 90%, 95%, 99% confidence levels
- **Position Constraints**: Ensures ball1 < ball2 < ball3 < ball4 < ball5
- **Comprehensive Statistics**: Mean, median, standard deviation for each position

### Documentation
- **USER-MANUAL.md**: Comprehensive 50+ page user guide with case studies
- **Case Studies**: 4 detailed scenarios for different user types
- **Troubleshooting Guide**: Common issues and solutions
- **FAQ Section**: Technical and strategy questions

## Prediction Methods Explained

### 1. AI Predictions (LSTM Neural Network)
- Treats entire draw as sequence: `[1, 15, 23, 35, 45]`
- Learns temporal patterns across complete draws
- Predicts coordinated number sets
- Better at complex inter-number relationships

### 2. Position-Based Predictions
- Treats each position independently (ball1, ball2, etc.)
- Uses statistical analysis with uncertainty quantification
- Provides confidence intervals for each prediction
- Enforces positional ordering constraints

### 3. Energy Signature Analysis
- Mathematical scoring based on number properties
- Weights: Prime (30%), Digital Root (20%), Mod5 (20%), Grid Position (30%)
- Identifies numbers with strong mathematical characteristics

### 4. Enhanced Recommendations (Combined Approach)
- Scores numbers across all methods (0-1.0 scale)
- High confidence: Numbers scoring ≥0.8 across multiple methods
- Medium confidence: Numbers scoring ≥0.6
- Alternative strategies for different playing styles