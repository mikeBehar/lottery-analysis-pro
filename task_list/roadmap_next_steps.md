
 
# Roadmap: Refactor and Modernize lottery-analysis-pro

## 1. Syntax Errors and Critical Issues

- [x] Move all nested functions (e.g., runAnalysis) to the top level of the IIFE. <!-- Completed: modularization step -->
- [x] Remove/consolidate duplicate function definitions (e.g., cancelAnalysis). <!-- Completed: modularization step -->
- [x] Remove unused functions and variables. <!-- Completed: modularization step -->
- [x] Fix linter errors (optional chaining, Promise rejection, array sort, etc.). <!-- Completed: modularization step -->
- [x] Ensure all event handlers reference the correct, single function. <!-- Completed: modularization step -->
- [x] Refactor code to avoid deep function nesting (especially in CSV parsing and callbacks). <!-- Completed: parseCSVWithPapaParse modularization -->
- [x] Refactor array sort operations inside case blocks to use toSorted or separate statements. <!-- Completed: modularization step -->

## 2. Code Organization & Modularization

- [x] Split app.js into logical modules:
	- [x] ui.js (UI rendering, DOM manipulation) <!-- Completed -->
	- [x] csv-parser.js (CSV parsing logic) <!-- Completed -->
	- [ ] state.js (application state management)
	- [ ] analysis.js (analysis and ML logic)
	- [ ] workers.js (web worker communication)
- [x] Centralize DOM element queries and creation in one place (initUIElements). <!-- Completed -->

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

- [x] Set up Playwright and E2E tests for core UI and CSV upload. <!-- Completed: 2025-08-29 -->
- [x] Add Playwright multi-browser config (Brave, Chrome, Firefox). <!-- Completed: 2025-08-29 -->
- [x] Confirm Playwright HTML report is generated and accessible. <!-- Completed: 2025-08-29 -->
- [ ] Set up ESLint and basic unit tests.
- [ ] Add JSDoc/type annotations and update documentation.

## 8. Accessibility and Performance

- [ ] Audit and improve accessibility (labels, ARIA, keyboard nav).
- [ ] Optimize any slow UI updates.

---

**Implementation will proceed in this order, grouping related items for efficiency and stability.**

---

**Current Status:**

- UI and CSV parsing logic are fully modularized.
- DOM queries and initialization are centralized.
- Linter and syntax errors are resolved.
- Playwright E2E tests and multi-browser config are complete and passing.
- The codebase is ready for server/browser testing and further feature work.
# Roadmap: Refactor and Modernize lottery-analysis-pro

## 1. Syntax Errors and Critical Issues
- [x] Move all nested functions (e.g., runAnalysis) to the top level of the IIFE. <!-- Completed: modularization step -->
- [x] Remove/consolidate duplicate function definitions (e.g., cancelAnalysis). <!-- Completed: modularization step -->
- [x] Remove unused functions and variables. <!-- Completed: modularization step -->
- [x] Fix linter errors (optional chaining, Promise rejection, array sort, etc.). <!-- Completed: modularization step -->
- [x] Ensure all event handlers reference the correct, single function. <!-- Completed: modularization step -->
- [x] Refactor code to avoid deep function nesting (especially in CSV parsing and callbacks). <!-- Completed: parseCSVWithPapaParse modularization -->
- [x] Refactor array sort operations inside case blocks to use toSorted or separate statements. <!-- Completed: modularization step -->

## 2. Code Organization & Modularization
- [x] Split app.js into logical modules:
	- [x] ui.js (UI rendering, DOM manipulation) <!-- Completed -->
	- [x] csv-parser.js (CSV parsing logic) <!-- Completed -->
	- [ ] state.js (application state management)
	- [ ] analysis.js (analysis and ML logic)
	- [ ] workers.js (web worker communication)
- [x] Centralize DOM element queries and creation in one place (initUIElements). <!-- Completed -->

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
- [x] Set up Playwright and E2E tests for core UI and CSV upload. <!-- Completed: 2025-08-29 -->
- [x] Add Playwright multi-browser config (Brave, Chrome, Firefox). <!-- Completed: 2025-08-29 -->
- [x] Confirm Playwright HTML report is generated and accessible. <!-- Completed: 2025-08-29 -->
- [ ] Set up ESLint and basic unit tests.
- [ ] Add JSDoc/type annotations and update documentation.

## 8. Accessibility and Performance
- [ ] Audit and improve accessibility (labels, ARIA, keyboard nav).
- [ ] Optimize any slow UI updates.

---

**Implementation will proceed in this order, grouping related items for efficiency and stability.**

---

**Current Status:**
- UI and CSV parsing logic are fully modularized.
- DOM queries and initialization are centralized.
- Linter and syntax errors are resolved.
- Playwright E2E tests and multi-browser config are complete and passing.
- The codebase is ready for server/browser testing and further feature work.
