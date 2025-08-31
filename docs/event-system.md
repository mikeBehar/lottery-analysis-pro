# Event System Documentation

This project uses a pub/sub (event emitter) pattern for all state changes and UI updates. Below is a list of standardized event names, their payloads, and typical publishers/subscribers.

## Event Names and Payloads

| Event Name           | Payload Type         | Publisher(s)         | Subscriber(s)         | Description |
|----------------------|---------------------|----------------------|-----------------------|-------------|
| `drawsUpdated`       | `Array<Draw>`       | File upload handler  | UI                    | Fired when lottery draws are loaded/updated. |
| `analyzeBtnState`    | `boolean`           | Analysis/File upload | UI                    | Enables/disables the Analyze button. |
| `progress`           | `string`            | Analysis/File upload | UI                    | Shows progress messages in the UI. |
| `hideProgress`       | `void`              | Analysis/File upload | UI                    | Hides the progress indicator. |
| `energyResults`      | `Array<EnergyData>` | Analysis             | UI                    | Publishes energy analysis results. |
| `mlResults`          | `MLPrediction`      | Analysis             | UI                    | Publishes ML prediction results. |
| `recommendations`    | `Recommendations`   | Analysis             | UI                    | Publishes recommended numbers. |
| `error`              | `{title, message}`  | Any                  | UI                    | Publishes error messages for display. |

## Example Usage

**Publishing an event:**
```js
state.publish('progress', 'Calculating energy signatures...');
```

**Subscribing to an event:**
```js
state.subscribe('progress', msg => showProgress(msg));
```

## Guidelines
- Always use the event system for cross-module communication.
- Add new events to this documentation.
- Use clear, descriptive event names (lowerCamelCase).
- Payloads should be serializable and documented.

---

_Last updated: August 30, 2025_
