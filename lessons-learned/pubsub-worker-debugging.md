
# Lessons Learned from Debugging Pub/Sub and Worker Integration

## 1. Test Isolation and Mocking

- UI modules and side effects can interfere with logic tests. Mocking or isolating these dependencies is crucial for reliable unit tests.
- Always mock UI and external dependencies in unit/integration tests to focus on business logic and event flows.

## 2. Consistent Shared State

- Inconsistent or duplicated state (e.g., draw data) leads to subtle bugs and test failures.
- Use a single, well-defined source of truth for application state. Refactor code to avoid state duplication.

## 3. Event-Driven Architecture

- Event-driven code (pub/sub, workers) is powerful but can be tricky to test. Manual event triggering or direct worker mock calls may be needed in tests.
- Design event flows to be testable, and provide hooks or utilities for simulating events in tests.

## 4. Debugging Strategy

- Incremental debugging—adding logs, increasing timeouts, and isolating test failures—helps pinpoint the root cause.
- When a test fails, break down the problem, add targeted logs, and test each component in isolation before integrating.

## 5. Test Feedback Loop

- Fast, reliable tests provide confidence for refactoring and feature development.
- Maintain a robust test suite and run it frequently during development.

## 6. Documentation and Communication

- Documenting the debugging process and changes made helps future maintenance and onboarding.
- Keep a changelog or notes on major debugging sessions and architectural decisions.

---

**How to apply these lessons:**

- Prioritize testability and modularity in new features.
- Mock or isolate all side-effectful modules in tests.
- Use a single, shared state for all core data.
- Design event flows with testing in mind.
- Maintain clear documentation of fixes and design choices.
