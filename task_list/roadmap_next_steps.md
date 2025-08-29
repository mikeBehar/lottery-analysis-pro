# Roadmap: Refactor and Modernize lottery-analysis-pro

## 1. Syntax Errors and Critical Issues
- [ ] Move all nested functions (e.g., runAnalysis) to the top level of the IIFE.
- [ ] Remove/consolidate duplicate function definitions (e.g., cancelAnalysis).
- [ ] Remove unused functions and variables.
- [ ] Fix linter errors (optional chaining, Promise rejection, array sort, etc.).
- [ ] Ensure all event handlers reference the correct, single function.
- [ ] Refactor code to avoid deep function nesting (especially in CSV parsing and callbacks).  <!-- TODO: See parseCSVWithPapaParse and related callbacks -->
- [ ] Refactor array sort operations inside case blocks to use toSorted or separate statements. <!-- TODO: See getPredictionForBacktest and similar -->

## 2. Code Organization & Modularization
- [ ] Split app.js into logical modules:
	- ui.js (UI rendering, DOM manipulation)
	- csv-parser.js (CSV parsing logic)
	- state.js (application state management)
	- analysis.js (analysis and ML logic)
	- workers.js (web worker communication)
- [ ] Centralize DOM element queries and creation in one place (initUIElements).

## 3. State Management
- [ ] Refactor state to use a simple pub/sub or observer pattern.
- [ ] Make state updates explicit and predictable.

## 4. Error Handling
- [ ] Replace alert() with a non-blocking notification area.
- [ ] Standardize error handling patterns (async/await + try/catch).

## 5. DOM Manipulation & Security
- [ ] Replace innerHTML with safer DOM APIs where possible.
- [ ] Ensure all dynamic content is sanitized or created via DOM methods.

## 6. Worker Communication
- [ ] Create a worker helper module for consistent, robust communication and error handling.

## 7. Linting, Testing, and Documentation
- [ ] Set up ESLint and basic unit tests.
- [ ] Add JSDoc/type annotations and update documentation.

## 8. Accessibility and Performance
- [ ] Audit and improve accessibility (labels, ARIA, keyboard nav).
- [ ] Optimize any slow UI updates.

---

**Implementation will proceed in this order, grouping related items for efficiency and stability.**
