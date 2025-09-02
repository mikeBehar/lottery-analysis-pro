# Prioritized Next-Step Tasks

This file tracks the current prioritized development tasks for the project. Each task is listed with a summary, description, and status.

---


## 1. Implement core analysis and ML module
**Status:** In progress
- `analysis.js` module created and integrated for core analytics/ML logic.
- Refactored analytical code into this module.
- Implemented advanced pattern mining: frequency, number pairing, and gap analysis (**done, unit tested**).
- Next: Add additional pattern/grouping logic and expose results for UI/worker integration.

## 2. Integrate advanced pattern analysis into UI
**Status:** Not started
- Pending: UI components for number pairing/grouping and gap analysis visualization.
- Pending: Controls for selecting/weighting prediction strategies.
- Pending: Display of new analytics outputs from `analysis.js`.

## 3. Finalize worker and state management modules
**Status:** Not started
- Complete the implementation of `workers.js` for offloading all heavy computations (ML training, backtesting) to web workers.
- Implement `state.js` to provide robust application state management using a pub/sub pattern.
- Ensure smooth communication between UI, state, and worker modules.

## 4. Standardize and improve error handling and validation
**Status:** Not started
- Replace all `alert()` calls with a non-blocking notification area in the UI.
- Standardize error handling patterns throughout the codebase using async/await and try/catch.
- Strengthen CSV and input validation to ensure only high-quality data is analyzed.

## 5. Increase automated and unit test coverage
**Status:** Not started
- Use the new test-utils to rapidly expand unit and integration test coverage, focusing on ML, analysis, and CSV handling modules.
- Add tests for new analytical features and worker/state integration.
- Use Playwright for E2E testing and confirm multi-browser coverage.

## 6. Begin parameter optimization automation
**Status:** Not started
- Start developing local automation (hybrid API or scripts) to optimize predictive parameters for analytical models.
- Prepare for future expansion to server-side API as needed.
- Document approaches and expose controls for optimization in the UI.

## 7. Add advanced backtesting visualization
**Status:** Not started
- Integrate visualization libraries like Chart.js or D3.js to display backtesting and prediction performance metrics.
- Allow users to compare different strategies visually.
- Ensure visualizations are accessible and performant.

## 8. Implement export and data management features
**Status:** Not started
- Add functionality to export analytical results and strategies as CSV or PDF.
- Provide UI controls for import/export and ensure all exported data matches the structure/quality of analyzed results.

## 9. Audit accessibility and optimize performance
**Status:** Not started
- Review and improve accessibility (labels, ARIA, keyboard navigation) in all UI components.
- Profile and optimize performance, especially for large datasets and heavy UI updates.

---

*Update the status of each task as work progresses. Completed tasks should be marked accordingly.*
