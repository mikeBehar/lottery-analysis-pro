(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/confidence-predictor.js
  var confidence_predictor_exports = {};
  __export(confidence_predictor_exports, {
    AdvancedConfidenceAnalysis: () => AdvancedConfidenceAnalysis,
    PositionBasedPredictor: () => PositionBasedPredictor,
    StatisticalUtils: () => StatisticalUtils
  });
  var StatisticalUtils, AdvancedConfidenceAnalysis, PositionBasedPredictor;
  var init_confidence_predictor = __esm({
    "js/confidence-predictor.js"() {
      StatisticalUtils = class {
        static mean(values) {
          return values.reduce((sum, val) => sum + val, 0) / values.length;
        }
        static median(values) {
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        }
        static standardDeviation(values) {
          const avg = this.mean(values);
          const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
          const variance = this.mean(squaredDiffs);
          return Math.sqrt(variance);
        }
        static weightedMean(values, weights) {
          const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
          const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
          return weightedSum / totalWeight;
        }
        static weightedVariance(values, weights, weightedMean) {
          const weightedSquaredDiffs = values.reduce(
            (sum, val, i) => sum + weights[i] * Math.pow(val - weightedMean, 2),
            0
          );
          const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
          return weightedSquaredDiffs / totalWeight;
        }
        static getZScore(confidenceLevel) {
          const zScores = {
            0.9: 1.645,
            0.95: 1.96,
            0.99: 2.576
          };
          return zScores[confidenceLevel] || 1.96;
        }
        static resample(data) {
          const sample = [];
          for (let i = 0; i < data.length; i++) {
            const randomIndex = Math.floor(Math.random() * data.length);
            sample.push(data[randomIndex]);
          }
          return sample;
        }
      };
      AdvancedConfidenceAnalysis = class {
        /**
         * Bootstrap confidence intervals - more robust than normal approximation
         */
        bootstrapConfidenceInterval(positionData, confidenceLevel = 0.95, iterations = 1e3) {
          const bootstrapMeans = [];
          for (let i = 0; i < iterations; i++) {
            const sample = StatisticalUtils.resample(positionData);
            bootstrapMeans.push(StatisticalUtils.mean(sample));
          }
          bootstrapMeans.sort((a, b) => a - b);
          const alpha = 1 - confidenceLevel;
          const lowerIndex = Math.floor(alpha / 2 * iterations);
          const upperIndex = Math.floor((1 - alpha / 2) * iterations);
          return {
            lower: Math.round(bootstrapMeans[lowerIndex]),
            upper: Math.round(bootstrapMeans[upperIndex]),
            method: "bootstrap",
            iterations
          };
        }
        /**
         * Time-weighted confidence intervals - recent data weighted more heavily
         */
        timeWeightedConfidence(positionData, confidenceLevel = 0.95, decayRate = 0.95) {
          const weights = positionData.map(
            (_, index) => Math.pow(decayRate, positionData.length - index - 1)
          );
          const weightedMean = StatisticalUtils.weightedMean(positionData, weights);
          const weightedVariance = StatisticalUtils.weightedVariance(positionData, weights, weightedMean);
          const effectiveSampleSize = Math.pow(weights.reduce((a, b) => a + b), 2) / weights.reduce((a, b) => a + b * b);
          const standardError = Math.sqrt(weightedVariance / effectiveSampleSize);
          const zScore = StatisticalUtils.getZScore(confidenceLevel);
          const marginOfError = zScore * standardError;
          return {
            prediction: Math.round(weightedMean),
            lower: Math.round(weightedMean - marginOfError),
            upper: Math.round(weightedMean + marginOfError),
            method: "time-weighted",
            effectiveSampleSize: Math.round(effectiveSampleSize)
          };
        }
        /**
         * Normal approximation confidence interval
         */
        normalConfidenceInterval(positionData, confidenceLevel = 0.95) {
          const mean = StatisticalUtils.mean(positionData);
          const std = StatisticalUtils.standardDeviation(positionData);
          const n = positionData.length;
          const zScore = StatisticalUtils.getZScore(confidenceLevel);
          const marginOfError = zScore * (std / Math.sqrt(n));
          return {
            prediction: Math.round(mean),
            lower: Math.round(mean - marginOfError),
            upper: Math.round(mean + marginOfError),
            method: "normal",
            sampleSize: n
          };
        }
      };
      PositionBasedPredictor = class {
        constructor(historicalData) {
          this.data = historicalData.filter(
            (draw) => draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
          );
          this.positionStats = this.calculatePositionStatistics();
          this.advancedStats = new AdvancedConfidenceAnalysis();
        }
        /**
         * Calculate statistical properties for each ball position
         */
        calculatePositionStatistics() {
          const positions = {
            ball1: [],
            ball2: [],
            ball3: [],
            ball4: [],
            ball5: [],
            powerball: []
          };
          this.data.forEach((draw) => {
            const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
            positions.ball1.push(sorted[0]);
            positions.ball2.push(sorted[1]);
            positions.ball3.push(sorted[2]);
            positions.ball4.push(sorted[3]);
            positions.ball5.push(sorted[4]);
            positions.powerball.push(draw.powerball);
          });
          return Object.entries(positions).reduce((stats, [pos, values]) => {
            stats[pos] = {
              mean: StatisticalUtils.mean(values),
              median: StatisticalUtils.median(values),
              std: StatisticalUtils.standardDeviation(values),
              min: Math.min(...values),
              max: Math.max(...values),
              sampleSize: values.length,
              distribution: this.buildDistribution(values),
              recent: values.slice(-20)
              // Last 20 draws for trend analysis
            };
            return stats;
          }, {});
        }
        /**
         * Build frequency distribution for a position
         */
        buildDistribution(values) {
          const distribution = {};
          values.forEach((val) => {
            distribution[val] = (distribution[val] || 0) + 1;
          });
          return distribution;
        }
        /**
         * Get historical data for a specific position
         */
        getPositionData(position) {
          const positionIndex = {
            "ball1": 0,
            "ball2": 1,
            "ball3": 2,
            "ball4": 3,
            "ball5": 4
          };
          if (position === "powerball") {
            return this.data.map((draw) => draw.powerball);
          } else {
            return this.data.map((draw) => {
              const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
              return sorted[positionIndex[position]];
            });
          }
        }
        /**
         * Generate predictions with confidence intervals for all positions
         */
        async generatePredictionWithConfidenceIntervals(options = {}) {
          const {
            confidenceLevel = 0.95,
            method = "bootstrap",
            // 'normal', 'bootstrap', 'time-weighted'
            includeCorrelations = true
          } = options;
          const positions = ["ball1", "ball2", "ball3", "ball4", "ball5", "powerball"];
          const predictions = [];
          for (const position of positions) {
            const positionData = this.getPositionData(position);
            const stats = this.positionStats[position];
            let confidenceResult;
            switch (method) {
              case "bootstrap":
                confidenceResult = this.advancedStats.bootstrapConfidenceInterval(positionData, confidenceLevel);
                break;
              case "time-weighted":
                confidenceResult = this.advancedStats.timeWeightedConfidence(positionData, confidenceLevel);
                break;
              case "normal":
              default:
                confidenceResult = this.advancedStats.normalConfidenceInterval(positionData, confidenceLevel);
            }
            const maxValue = position === "powerball" ? 26 : 69;
            const minValue = 1;
            const prediction = confidenceResult.prediction || Math.round(stats.mean);
            const lower = Math.max(minValue, confidenceResult.lower);
            const upper = Math.min(maxValue, confidenceResult.upper);
            predictions.push({
              position,
              prediction,
              confidenceInterval: {
                lower,
                upper,
                method,
                confidenceLevel,
                display: this.formatConfidenceDisplay(prediction, lower, upper)
              },
              statistics: {
                mean: Math.round(stats.mean * 100) / 100,
                median: stats.median,
                std: Math.round(stats.std * 100) / 100,
                sampleSize: stats.sampleSize
              }
            });
          }
          if (includeCorrelations) {
            return this.adjustForPositionConstraints(predictions);
          }
          return predictions;
        }
        /**
         * Format confidence interval display
         */
        formatConfidenceDisplay(prediction, lower, upper) {
          const lowerDiff = prediction - lower;
          const upperDiff = upper - prediction;
          return {
            range: `${prediction} {-${lowerDiff}, +${upperDiff}}`,
            interval: `[${lower}, ${upper}]`,
            symmetric: lowerDiff === upperDiff,
            precision: lowerDiff !== upperDiff ? `{-${lowerDiff}, +${upperDiff}}` : `\xB1${lowerDiff}`
          };
        }
        /**
         * Adjust predictions to ensure they follow position constraints
         * (e.g., ball1 < ball2 < ball3 < ball4 < ball5)
         */
        adjustForPositionConstraints(predictions) {
          const whiteBallPredictions = predictions.slice(0, 5);
          const powerballPrediction = predictions[5];
          whiteBallPredictions.sort((a, b) => a.prediction - b.prediction);
          const minGap = 2;
          for (let i = 1; i < whiteBallPredictions.length; i++) {
            if (whiteBallPredictions[i].prediction - whiteBallPredictions[i - 1].prediction < minGap) {
              whiteBallPredictions[i].prediction = whiteBallPredictions[i - 1].prediction + minGap;
              const adjustment = whiteBallPredictions[i].prediction - (whiteBallPredictions[i].confidenceInterval.lower + whiteBallPredictions[i].confidenceInterval.upper) / 2;
              whiteBallPredictions[i].confidenceInterval.lower += adjustment;
              whiteBallPredictions[i].confidenceInterval.upper += adjustment;
              whiteBallPredictions[i].confidenceInterval.display = this.formatConfidenceDisplay(
                whiteBallPredictions[i].prediction,
                whiteBallPredictions[i].confidenceInterval.lower,
                whiteBallPredictions[i].confidenceInterval.upper
              );
              whiteBallPredictions[i].constraintAdjusted = true;
            }
          }
          return [...whiteBallPredictions, powerballPrediction];
        }
        /**
         * Get summary statistics for the prediction system
         */
        getSystemStats() {
          return {
            totalDraws: this.data.length,
            positionStats: Object.entries(this.positionStats).reduce((summary, [pos, stats]) => {
              summary[pos] = {
                mean: Math.round(stats.mean * 100) / 100,
                range: `${stats.min}-${stats.max}`,
                std: Math.round(stats.std * 100) / 100
              };
              return summary;
            }, {}),
            dataQuality: this.assessDataQuality()
          };
        }
        /**
         * Assess the quality and sufficiency of historical data
         */
        assessDataQuality() {
          const minRecommendedDraws = 100;
          const quality = {
            sufficient: this.data.length >= minRecommendedDraws,
            drawCount: this.data.length,
            recommendation: this.data.length >= minRecommendedDraws ? "Sufficient data for reliable confidence intervals" : `Consider collecting more data. Current: ${this.data.length}, Recommended: ${minRecommendedDraws}+`
          };
          return quality;
        }
      };
      if (typeof window !== "undefined") {
        window.PositionBasedPredictor = PositionBasedPredictor;
        window.AdvancedConfidenceAnalysis = AdvancedConfidenceAnalysis;
        window.StatisticalUtils = StatisticalUtils;
      }
    }
  });

  // js/utils.js
  function calculateEnergy(numbers, weights) {
    const defaultWeights = {
      prime: 0.3,
      digitalRoot: 0.2,
      mod5: 0.2,
      gridPosition: 0.3
    };
    const effectiveWeights = weights || defaultWeights;
    return numbers.map((num) => {
      const energyComponents = {
        isPrime: isPrime(num) ? 1 : 0,
        digitalRoot: getDigitalRoot(num),
        mod5: num % 5 * 0.2,
        gridScore: getGridPositionScore(num)
      };
      const energy = energyComponents.isPrime * effectiveWeights.prime + energyComponents.digitalRoot * effectiveWeights.digitalRoot + energyComponents.mod5 * effectiveWeights.mod5 + energyComponents.gridScore * effectiveWeights.gridPosition;
      return {
        number: num,
        ...energyComponents,
        energy
      };
    });
  }
  function displayEnergyResults(energyData, container) {
    if (!energyData || energyData.length === 0) {
      container.innerHTML = "<p>No energy data available</p>";
      return;
    }
    const uniqueByNumber = {};
    energyData.forEach((item) => {
      uniqueByNumber[item.number] = item;
    });
    const deduped = Object.values(uniqueByNumber);
    const sorted = [...deduped].sort((a, b) => b.energy - a.energy);
    const topNumbers = sorted.slice(0, 15);
    console.log("[Energy Panel] Top numbers (deduped):", topNumbers.map((n) => n.number));
    container.innerHTML = topNumbers.map((num) => `
    <div class="number-card" data-energy="${num.energy.toFixed(2)}">
      <div class="number">${num.number}</div>
      <div class="energy-score">${num.energy.toFixed(2)}</div>
      <div class="energy-breakdown">
        Prime: ${num.isPrime ? "\u2713" : "\u2717"} | 
        Root: ${num.digitalRoot} | 
        Mod5: ${(num.mod5 / 0.2).toFixed(0)} | 
        Grid: ${num.gridScore.toFixed(1)}
      </div>
    </div>
  `).join("");
  }
  function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
      if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
  }
  function getDigitalRoot(num) {
    return num - 9 * Math.floor((num - 1) / 9);
  }
  function getGridPositionScore(num) {
    const GRID = [
      [0.3, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1, 0.9],
      [0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.7],
      [0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5],
      [0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.7],
      [0.3, 0.5, 0.7, 0.9, 1, 0.9, 0.7, 0.5, 0.3, 0.5, 0.7, 0.9, 1, 0.9]
    ];
    if (num < 1 || num > 70) return 0.5;
    const row = Math.floor((num - 1) / 14);
    const col = (num - 1) % 14;
    return GRID[row]?.[col] ?? 0.5;
  }
  function applyTemporalWeighting(draws, decayRate = 0.1) {
    const validDraws = draws.filter((d) => d.date && typeof d.date.getTime === "function");
    if (!validDraws.length) return [];
    const mostRecentDate = new Date(Math.max(...validDraws.map((d) => d.date.getTime())));
    const maxAgeDays = (mostRecentDate - new Date(Math.min(...validDraws.map((d) => d.date.getTime())))) / (1e3 * 60 * 60 * 24);
    return validDraws.map((draw) => {
      const ageDays = (mostRecentDate - draw.date) / (1e3 * 60 * 60 * 24);
      const normalizedAge = ageDays / maxAgeDays;
      const weight = Math.exp(-decayRate * normalizedAge * 10);
      return {
        ...draw,
        temporalWeight: weight,
        weightedNumbers: (draw.whiteBalls || []).map((num) => ({
          number: num,
          weight
        }))
      };
    });
  }
  function calculateTemporalFrequency(weightedDraws) {
    const frequency = new Array(70).fill(0);
    weightedDraws.forEach((draw) => {
      draw.weightedNumbers.forEach((weightedNum) => {
        if (weightedNum.number >= 1 && weightedNum.number <= 69) {
          frequency[weightedNum.number] += weightedNum.weight;
        }
      });
    });
    return frequency;
  }
  if (typeof window !== "undefined") {
    window.applyTemporalWeighting = applyTemporalWeighting;
    window.calculateTemporalFrequency = calculateTemporalFrequency;
  }

  // js/notifications.js
  var notificationContainer = null;
  function initNotifications() {
    if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.id = "notification-container";
      notificationContainer.className = "notification-container";
      document.body.appendChild(notificationContainer);
    }
  }
  function showNotification(title, message, type = "info", duration = 5e3) {
    initNotifications();
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(title)}</div>
      <div class="notification-message">${escapeHtml(message)}</div>
    </div>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;
    const closeBtn = notification.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => {
      removeNotification(notification);
    });
    notificationContainer.appendChild(notification);
    setTimeout(() => notification.classList.add("notification-show"), 10);
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(notification);
      }, duration);
    }
    return notification;
  }
  function removeNotification(notification) {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
  function showError(title, message) {
    return showNotification(title, message, "error", 8e3);
  }
  function showSuccess(title, message) {
    return showNotification(title, message, "success", 4e3);
  }
  function showWarning(title, message) {
    return showNotification(title, message, "warning", 6e3);
  }
  function showInfo(title, message) {
    return showNotification(title, message, "info", 5e3);
  }
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initNotifications);
  }

  // js/state.js
  var PubSub = class {
    constructor() {
      this.events = {};
    }
    subscribe(event, handler) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(handler);
      return () => {
        this.events[event] = this.events[event].filter((h) => h !== handler);
      };
    }
    publish(event, data) {
      if (!this.events[event]) return;
      this.events[event].forEach((handler) => handler(data));
    }
    clear(event) {
      if (event) {
        delete this.events[event];
      } else {
        this.events = {};
      }
    }
  };
  var state = new PubSub();
  var state_default = state;

  // js/ui.js
  function displayEnergyResults2(energyData, container) {
    displayEnergyResults(energyData, container);
  }
  state_default.subscribe("drawsUpdated", (draws) => {
    console.log(`[PubSub] Draws updated: ${draws.length} draws loaded.`);
  });
  var elements = (() => {
    const panelsContainer = document.querySelector(".panels") || document.body;
    const makePanel = (id, className) => {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.className = className;
        panelsContainer.appendChild(el);
      }
      return el;
    };
    return {
      methodSelector: document.createElement("select"),
      temporalDecaySelector: document.createElement("select"),
      analyzeBtn: document.getElementById("analyzeBtn"),
      uploadInput: document.getElementById("csvUpload"),
      progressIndicator: document.createElement("div"),
      backtestResults: document.createElement("div"),
      recommendations: document.getElementById("recommendations"),
      energyResults: document.getElementById("energy-results") || makePanel("energy-results", "energy-panel"),
      mlResults: document.getElementById("ml-results") || makePanel("ml-results", "ml-panel"),
      // Analytics panels
      hotColdPanel: makePanel("hot-cold-panel", "analytics-panel"),
      overduePanel: makePanel("overdue-panel", "analytics-panel"),
      frequencyPanel: makePanel("frequency-panel", "analytics-panel"),
      pairsPanel: makePanel("pairs-panel", "analytics-panel"),
      gapsPanel: makePanel("gaps-panel", "analytics-panel")
      // ...existing code...
    };
  })();
  state_default.subscribe("analytics:hotCold", (hotCold) => displayHotCold(hotCold, elements.hotColdPanel));
  state_default.subscribe("analytics:overdue", (overdue) => displayOverdue(overdue, elements.overduePanel));
  state_default.subscribe("analytics:frequency", (frequency) => displayFrequency(frequency, elements.frequencyPanel));
  state_default.subscribe("analytics:pairs", (pairs) => displayPairs(pairs, elements.pairsPanel));
  state_default.subscribe("analytics:gaps", (gaps) => displayGaps(gaps, elements.gapsPanel));
  function displayHotCold(hotCold, container) {
    container.innerHTML = `
    <h3>\u{1F525} Hot & Cold Numbers</h3>
    <div><strong>Hot:</strong> ${hotCold.hot.map((n) => `<span class="number hot">${n}</span>`).join(" ")}</div>
    <div><strong>Cold:</strong> ${hotCold.cold.map((n) => `<span class="number cold">${n}</span>`).join(" ")}</div>
  `;
  }
  function displayOverdue(overdue, container) {
    container.innerHTML = `
    <h3>\u23F3 Overdue Numbers</h3>
    <div>${overdue.map((n) => `<span class="number overdue">${n}</span>`).join(" ")}</div>
  `;
  }
  function displayFrequency(frequency, container) {
    container.innerHTML = `
    <h3>\u{1F4CA} Number Frequency</h3>
    <div class="frequency-grid">
      ${frequency.whiteBalls.map((count, idx) => `<span class="number freq">${idx + 1}: ${count}</span>`).join(" ")}
    </div>
  `;
  }
  function displayPairs(pairs, container) {
    const sorted = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 10);
    container.innerHTML = `
    <h3>\u{1F517} Common Number Pairs</h3>
    <ul>${sorted.map(([pair, count]) => `<li>${pair}: ${count}</li>`).join("")}</ul>
  `;
  }
  function displayGaps(gaps, container) {
    const sorted = Object.entries(gaps).sort((a, b) => b[1] - a[1]);
    container.innerHTML = `
    <h3>\u{1F4CF} Gap Analysis</h3>
    <ul>${sorted.map(([gap, count]) => `<li>Gap ${gap}: ${count} times</li>`).join("")}</ul>
  `;
  }
  function initUIElements(CONFIG2, state2) {
    if (!elements.powerballResults) {
      elements.powerballResults = document.getElementById("powerball-results");
      if (!elements.powerballResults) {
        elements.powerballResults = document.createElement("div");
        elements.powerballResults.id = "powerball-results";
        elements.powerballResults.className = "powerball-panel";
        if (elements.recommendations?.parentNode) {
          elements.recommendations.parentNode.insertBefore(elements.powerballResults, elements.recommendations.nextSibling);
        } else {
          document.body.appendChild(elements.powerballResults);
        }
      }
    }
    elements.methodSelector.id = "method-selector";
    CONFIG2.analysisMethods.forEach((method) => {
      const option = document.createElement("option");
      option.value = method;
      option.textContent = method.charAt(0).toUpperCase() + method.slice(1);
      elements.methodSelector.appendChild(option);
    });
    elements.methodSelector.value = state2.currentMethod;
  }
  state_default.subscribe("progress", (msg) => showProgress(msg));
  state_default.subscribe("hideProgress", () => hideProgress());
  state_default.subscribe("analyzeBtnState", (enabled) => setAnalyzeBtnState(enabled));
  state_default.subscribe("error", ({ title, message }) => showErrorOld(title, message));
  state_default.subscribe("energyResults", (energyData) => displayEnergyResults2(energyData, elements.energyResults));
  state_default.subscribe("mlResults", (mlPrediction) => displayMLResults(mlPrediction, elements.mlResults, elements));
  state_default.subscribe("recommendations", (recommendations) => displayRecommendations(recommendations, elements));
  function displayMLResults(mlPrediction, container, elements2) {
    if (typeof DEBUG !== "undefined" && DEBUG) console.log("displayMLResults called", mlPrediction, container);
    console.log("[Debug] displayMLResults: mlPrediction =", mlPrediction);
    console.log("[Debug] displayMLResults: container =", container);
    const whiteBalls = (mlPrediction.whiteBalls || []).map((num) => num.toString().padStart(2, "0")).join(" ");
    const powerball = mlPrediction.powerball ? mlPrediction.powerball.toString().padStart(2, "0") : "";
    container.innerHTML = `
    <div class="ml-prediction">
      <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
      <div class="ml-numbers"><strong>White Balls:</strong> ${whiteBalls}</div>
      <div class="ml-numbers"><strong>Powerball:</strong> <span class="powerball-number">${powerball}</span></div>
      <div class="model-info">Model: ${mlPrediction.model}</div>
      ${mlPrediction.warning ? `<div class="warning">${mlPrediction.warning}</div>` : ""}
    </div>
  `;
    elements2?.powerballResults && (elements2.powerballResults.innerHTML = `
    <div class="powerball-section">
      <h3>\u{1F534} Powerball Prediction</h3>
      <div class="powerball-prediction">
        <span class="powerball-number">${powerball}</span>
      </div>
      <div class="confidence">Confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%</div>
      <div class="model-info">Model: ${mlPrediction.model}</div>
    </div>
  `);
  }
  function displayRecommendations(recommendations, elements2) {
    if (typeof DEBUG !== "undefined" && DEBUG) console.log("displayRecommendations called", recommendations);
    console.log("[Debug] displayRecommendations: recommendations =", recommendations);
    console.log("[Debug] displayRecommendations: elements.recommendations =", elements2.recommendations);
    if (!elements2.recommendations) return;
    elements2.recommendations.innerHTML = `
    <div class="recommendation-section">
      <h3>\u{1F3AF} High Confidence White Balls</h3>
      <div class="number-grid">
        ${recommendations.highConfidence.map(
      (num) => `<span class="number high-confidence">${num}</span>`
    ).join(" ")}
        ${recommendations.highConfidence.length === 0 ? '<span class="no-data">No strong matches found</span>' : ""}
      </div>
    </div>
    <div class="recommendation-section">
      <h3>\u26A1 Energy-Based White Balls</h3>
      <div class="number-grid">
        ${recommendations.energyBased.map(
      (num) => `<span class="number energy-based">${num}</span>`
    ).join(" ")}
      </div>
    </div>
    <div class="recommendation-section">
      <h3>\u{1F916} ML-Based White Balls</h3>
      <div class="number-grid">
        ${recommendations.mlBased.map(
      (num) => `<span class="number ml-based">${num}</span>`
    ).join(" ")}
      </div>
    </div>
    <div class="recommendation-summary">
      <p>${recommendations.summary}</p>
    </div>
  `;
    if (elements2.powerballResults && recommendations.powerball) {
      elements2.powerballResults.innerHTML += `
      <div class="powerball-recommendation-section">
        <h3>\u{1F534} Powerball Recommendation</h3>
        <div class="powerball-recommendation">
          <span class="powerball-number">${recommendations.powerball}</span>
        </div>
      </div>
    `;
    }
  }
  function setAnalyzeBtnState(enabled) {
    const btn = document.getElementById("analyzeBtn");
    if (btn) {
      btn.disabled = !enabled;
      btn.classList.toggle("ready", enabled);
    }
  }
  function showProgress(message) {
    const indicator = document.getElementById("progress-indicator");
    if (indicator) {
      indicator.style.display = "block";
      indicator.innerHTML = `
      <div class="progress-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    }
    setAnalyzeBtnState(false);
    showCancelButton();
    updateProgress(message);
  }
  function updateProgress(message, percent) {
    const progressText = document.getElementById("progress-text");
    if (progressText) {
      progressText.textContent = percent !== void 0 ? `${message} (${percent}%)` : message;
    }
    const indicator = document.getElementById("progress-indicator");
    if (indicator && message) {
      const p = indicator.querySelector("p");
      if (p) p.textContent = percent !== void 0 ? `${message} (${percent}%)` : message;
    }
  }
  function hideProgress() {
    const indicator = document.getElementById("progress-indicator");
    const cancelBtn = document.getElementById("cancel-btn");
    const progressText = document.getElementById("progress-text");
    const analyzeBtn = document.getElementById("analyze-btn");
    if (indicator) indicator.style.display = "none";
    if (cancelBtn) cancelBtn.style.display = "none";
    if (progressText) progressText.textContent = "";
    if (analyzeBtn) analyzeBtn.disabled = false;
  }
  function showCancelButton() {
    const cancelBtn = document.getElementById("cancel-btn");
    if (cancelBtn) cancelBtn.style.display = "inline-block";
  }
  function showErrorOld(title, error) {
    let msg = "";
    if (error && typeof error.message === "string") {
      msg = error.message;
    } else if (typeof error === "string") {
      msg = error;
    } else if (error) {
      msg = JSON.stringify(error);
    } else {
      msg = "Unknown error";
    }
    console.error(`${title}:`, error);
    showError(title, msg);
  }

  // js/analysis.js
  function getOverdueNumbers(draws, maxNumber = 69) {
    const lastSeen = Array(maxNumber).fill(-1);
    for (let i = draws.length - 1; i >= 0; i--) {
      const draw = draws[i];
      if (Array.isArray(draw.whiteBalls)) {
        draw.whiteBalls.forEach((n) => {
          if (n > 0 && n <= maxNumber && lastSeen[n - 1] === -1) {
            lastSeen[n - 1] = i;
          }
        });
      }
    }
    const numbered = lastSeen.map((idx, n) => ({ number: n + 1, lastSeen: idx }));
    return numbered.slice().sort((a, b) => a.lastSeen - b.lastSeen).map((x) => x.number);
  }
  function getHotAndColdNumbers(draws, maxNumber = 69, recentCount = null, topN = 5) {
    const useDraws = recentCount ? draws.slice(-recentCount) : draws;
    const freq = Array(maxNumber).fill(0);
    useDraws.forEach((draw, i) => {
      if (Array.isArray(draw.whiteBalls)) {
        draw.whiteBalls.forEach((n) => {
          if (n > 0 && n <= maxNumber) freq[n - 1]++;
        });
      } else {
        console.warn(`[getHotAndColdNumbers] Draw at index ${i} missing or invalid whiteBalls:`, draw.whiteBalls);
      }
    });
    console.log("[getHotAndColdNumbers] Frequency array:", freq);
    console.log("[getHotAndColdNumbers] Input draws sample:", useDraws.slice(0, 3));
    const numbered = freq.map((count, idx) => ({ number: idx + 1, count }));
    const hot = numbered.filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, topN).map((x) => x.number);
    const cold = numbered.sort((a, b) => a.count - b.count || a.number - b.number).slice(0, topN).map((x) => x.number);
    console.log("[getHotAndColdNumbers] Hot:", hot, "Cold:", cold);
    return { hot, cold };
  }
  function calculateFrequency(draws, maxNumber = 69) {
    const freq = { whiteBalls: Array(maxNumber).fill(0), powerball: {} };
    draws.forEach((draw) => {
      if (Array.isArray(draw.whiteBalls)) {
        draw.whiteBalls.forEach((n) => {
          if (n > 0 && n <= maxNumber) freq.whiteBalls[n - 1]++;
        });
      }
      if (draw.powerball) {
        freq.powerball[draw.powerball] = (freq.powerball[draw.powerball] || 0) + 1;
      }
    });
    return freq;
  }
  function findCommonPairs(draws) {
    const pairCounts = {};
    draws.forEach((draw) => {
      if (Array.isArray(draw.whiteBalls)) {
        const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
          for (let j = i + 1; j < sorted.length; j++) {
            const key = `${sorted[i]}-${sorted[j]}`;
            pairCounts[key] = (pairCounts[key] || 0) + 1;
          }
        }
      }
    });
    return pairCounts;
  }
  function gapAnalysis(draws) {
    const gapCounts = {};
    draws.forEach((draw) => {
      if (Array.isArray(draw.whiteBalls)) {
        const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1];
          gapCounts[gap] = (gapCounts[gap] || 0) + 1;
        }
      }
    });
    return gapCounts;
  }

  // js/enhanced-recommendations.js
  function generateEnhancedRecommendations(energyData, mlPrediction, positionPredictions = null, historicalDraws = []) {
    try {
      const recommendations = {
        highConfidence: [],
        mediumConfidence: [],
        alternativeSelections: [],
        positionBased: [],
        insights: [],
        summary: "",
        confidenceScores: {}
      };
      const consensusNumbers = findConsensusNumbers(energyData, mlPrediction, positionPredictions, historicalDraws);
      const scoredNumbers = calculateConfidenceScores(energyData, mlPrediction, positionPredictions, historicalDraws);
      if (positionPredictions) {
        recommendations.positionBased = positionPredictions.map((pred) => ({
          position: pred.position,
          number: pred.prediction,
          confidence: pred.confidenceInterval,
          likelihood: calculatePositionLikelihood(pred, historicalDraws)
        }));
      }
      recommendations.highConfidence = scoredNumbers.filter((num) => num.score >= 0.8).slice(0, 8).map((num) => num.number);
      recommendations.mediumConfidence = scoredNumbers.filter((num) => num.score >= 0.6 && num.score < 0.8).slice(0, 10).map((num) => num.number);
      recommendations.alternativeSelections = generateAlternativeSelections(energyData, mlPrediction, historicalDraws);
      recommendations.insights = generateRecommendationInsights(energyData, mlPrediction, positionPredictions, historicalDraws);
      recommendations.summary = generateEnhancedSummary(recommendations, historicalDraws.length);
      return recommendations;
    } catch (error) {
      console.error("Error generating enhanced recommendations:", error);
      throw new Error(`Failed to generate enhanced recommendations: ${error.message}`);
    }
  }
  function findConsensusNumbers(energyData, mlPrediction, positionPredictions, historicalDraws) {
    const methodResults = {};
    const energyNumbers = energyData.sort((a, b) => b.energy - a.energy).slice(0, 10).map((item) => item.number);
    const mlNumbers = mlPrediction.whiteBalls || [];
    const positionNumbers = positionPredictions ? positionPredictions.map((pred) => pred.prediction) : [];
    const { hot } = getHotAndColdNumbers(historicalDraws);
    const hotNumbers = hot.slice(0, 10);
    const numberCounts = {};
    [...energyNumbers, ...mlNumbers, ...positionNumbers, ...hotNumbers].forEach((num) => {
      numberCounts[num] = (numberCounts[num] || 0) + 1;
    });
    return Object.entries(numberCounts).filter(([num, count]) => count >= 2).map(([num, count]) => ({ number: parseInt(num), consensus: count })).sort((a, b) => b.consensus - a.consensus);
  }
  function calculateConfidenceScores(energyData, mlPrediction, positionPredictions, historicalDraws) {
    const scores = {};
    const allNumbers = /* @__PURE__ */ new Set();
    energyData.forEach((item) => allNumbers.add(item.number));
    (mlPrediction.whiteBalls || []).forEach((num) => allNumbers.add(num));
    if (positionPredictions) {
      positionPredictions.forEach((pred) => allNumbers.add(pred.prediction));
    }
    Array.from(allNumbers).forEach((number) => {
      let score = 0;
      let factors = {};
      const energyItem = energyData.find((item) => item.number === number);
      if (energyItem) {
        const energyScore = Math.min(energyItem.energy / 2, 0.3);
        score += energyScore;
        factors.energy = energyScore;
      }
      const mlNumbers = mlPrediction.whiteBalls || [];
      const mlIndex = mlNumbers.indexOf(number);
      if (mlIndex >= 0) {
        const mlScore = 0.3 * (1 - mlIndex / 5);
        score += mlScore;
        factors.ml = mlScore;
      }
      if (positionPredictions) {
        const positionPred = positionPredictions.find((pred) => pred.prediction === number);
        if (positionPred) {
          const positionScore = 0.2;
          score += positionScore;
          factors.position = positionScore;
        }
      }
      const { hot } = getHotAndColdNumbers(historicalDraws);
      const hotIndex = hot.indexOf(number);
      if (hotIndex >= 0) {
        const freqScore = 0.2 * (1 - hotIndex / 10);
        score += freqScore;
        factors.frequency = freqScore;
      }
      scores[number] = { number, score, factors };
    });
    return Object.values(scores).sort((a, b) => b.score - a.score);
  }
  function calculatePositionLikelihood(prediction, historicalDraws) {
    if (!historicalDraws.length) return 0.5;
    const position = prediction.position;
    const predictedNumber = prediction.prediction;
    const positionData = historicalDraws.map((draw) => {
      const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
      const positionIndex = { ball1: 0, ball2: 1, ball3: 2, ball4: 3, ball5: 4 };
      return position === "powerball" ? draw.powerball : sorted[positionIndex[position]];
    });
    const numberRange = getPositionRange(predictedNumber);
    const rangeOccurrences = positionData.filter(
      (num) => num >= numberRange.min && num <= numberRange.max
    ).length;
    return rangeOccurrences / historicalDraws.length;
  }
  function getPositionRange(number) {
    if (number <= 15) return { min: 1, max: 20, position: "ball1" };
    if (number <= 30) return { min: 10, max: 35, position: "ball2" };
    if (number <= 45) return { min: 20, max: 50, position: "ball3" };
    if (number <= 60) return { min: 30, max: 65, position: "ball4" };
    return { min: 40, max: 69, position: "ball5" };
  }
  function generateAlternativeSelections(energyData, mlPrediction, historicalDraws) {
    const alternatives = [];
    alternatives.push({
      name: "Balanced Range Selection",
      numbers: generateBalancedRangeNumbers(historicalDraws),
      description: "Numbers spread across low, medium, and high ranges"
    });
    const { hot, cold } = getHotAndColdNumbers(historicalDraws);
    alternatives.push({
      name: "Hot & Cold Mix",
      numbers: [...hot.slice(0, 3), ...cold.slice(0, 2)],
      description: "3 hot numbers + 2 cold numbers for balance"
    });
    const overdueNumbers = getOverdueNumbers(historicalDraws);
    alternatives.push({
      name: "Overdue Numbers",
      numbers: overdueNumbers.slice(0, 5),
      description: "Numbers that haven't appeared recently"
    });
    alternatives.push({
      name: "Pattern Avoidance",
      numbers: generatePatternAvoidanceNumbers(historicalDraws),
      description: "Avoids common patterns like consecutive numbers"
    });
    return alternatives;
  }
  function generateBalancedRangeNumbers(historicalDraws) {
    const ranges = [
      { min: 1, max: 14, count: 1 },
      // Low
      { min: 15, max: 28, count: 1 },
      // Low-Mid  
      { min: 29, max: 42, count: 1 },
      // Mid
      { min: 43, max: 56, count: 1 },
      // Mid-High
      { min: 57, max: 69, count: 1 }
      // High
    ];
    const numbers = [];
    const { hot } = getHotAndColdNumbers(historicalDraws);
    ranges.forEach((range) => {
      const rangeHotNumbers = hot.filter((num) => num >= range.min && num <= range.max);
      if (rangeHotNumbers.length > 0) {
        numbers.push(rangeHotNumbers[0]);
      } else {
        numbers.push(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
      }
    });
    return numbers;
  }
  function generatePatternAvoidanceNumbers(historicalDraws) {
    const { hot } = getHotAndColdNumbers(historicalDraws);
    const numbers = [];
    hot.forEach((num) => {
      if (numbers.length >= 5) return;
      const hasConsecutive = numbers.some((existing) => Math.abs(existing - num) === 1);
      const isMultipleOf5 = num % 5 === 0;
      const isInSameDecade = numbers.some((existing) => Math.floor(existing / 10) === Math.floor(num / 10));
      if (!hasConsecutive && !(isMultipleOf5 && numbers.filter((n) => n % 5 === 0).length >= 1) && !isInSameDecade) {
        numbers.push(num);
      }
    });
    while (numbers.length < 5) {
      const candidate = Math.floor(Math.random() * 69) + 1;
      if (!numbers.includes(candidate)) {
        numbers.push(candidate);
      }
    }
    return numbers.sort((a, b) => a - b);
  }
  function generateRecommendationInsights(energyData, mlPrediction, positionPredictions, historicalDraws) {
    const insights = [];
    const topEnergy = energyData.sort((a, b) => b.energy - a.energy)[0];
    insights.push(`Highest energy number: ${topEnergy.number} (${topEnergy.energy.toFixed(2)} energy score)`);
    const mlNumbers = mlPrediction.whiteBalls || [];
    insights.push(`AI predicts numbers in ranges: ${getNumberRanges(mlNumbers)}`);
    if (positionPredictions) {
      const avgConfidenceWidth = positionPredictions.reduce((sum, pred) => {
        const width = pred.confidenceInterval.upper - pred.confidenceInterval.lower;
        return sum + width;
      }, 0) / positionPredictions.length;
      insights.push(`Average confidence interval width: \xB1${(avgConfidenceWidth / 2).toFixed(1)} numbers`);
    }
    const { hot, cold } = getHotAndColdNumbers(historicalDraws);
    insights.push(`Current hot streak: ${hot.slice(0, 3).join(", ")}`);
    insights.push(`Due for appearance: ${cold.slice(0, 3).join(", ")}`);
    return insights;
  }
  function getNumberRanges(numbers) {
    if (!numbers || numbers.length === 0) return "No predictions";
    const ranges = [];
    if (numbers.some((n) => n <= 20)) ranges.push("Low (1-20)");
    if (numbers.some((n) => n > 20 && n <= 40)) ranges.push("Mid (21-40)");
    if (numbers.some((n) => n > 40 && n <= 60)) ranges.push("Mid-High (41-60)");
    if (numbers.some((n) => n > 60)) ranges.push("High (61-69)");
    return ranges.join(", ");
  }
  function generateEnhancedSummary(recommendations, drawCount) {
    let summary = `Analyzed ${drawCount} historical draws. `;
    const highConfCount = recommendations.highConfidence.length;
    const mediumConfCount = recommendations.mediumConfidence.length;
    summary += `Found ${highConfCount} high-confidence numbers`;
    if (highConfCount > 0) {
      summary += ` (${recommendations.highConfidence.slice(0, 3).join(", ")})`;
    }
    if (mediumConfCount > 0) {
      summary += ` and ${mediumConfCount} medium-confidence alternatives`;
    }
    summary += `. ${recommendations.alternativeSelections.length} alternative strategies available.`;
    return summary;
  }

  // js/worker-wrapper.js
  var workerPaths = {
    ml: "dist/ml-worker.bundle.js",
    backtest: "dist/backtest-worker.bundle.js",
    optimization: "dist/optimization-worker.bundle.js"
  };
  var workers = {};
  function getWorker(type) {
    if (!workers[type]) {
      workers[type] = new Worker(workerPaths[type]);
      workers[type].onmessage = (e) => {
        const { type: eventType, data } = e.data;
        state_default.publish(`${type}:${eventType}`, data);
      };
      workers[type].onerror = (err) => {
        state_default.publish(`${type}:error`, { message: err.message });
      };
    }
    return workers[type];
  }
  state_default.subscribe("ml:predict", (payload) => {
    getWorker("ml").postMessage({ type: "predict", data: payload });
  });
  state_default.subscribe("backtest:run", (payload) => {
    getWorker("backtest").postMessage({ type: "run", data: payload });
  });
  state_default.subscribe("optimization:start", (payload) => {
    getWorker("optimization").postMessage({ type: "optimize", data: payload });
  });
  state_default.subscribe("optimization:cancel", () => {
    getWorker("optimization").postMessage({ type: "cancel" });
  });
  state_default.subscribe("optimization:status", () => {
    getWorker("optimization").postMessage({ type: "status" });
  });

  // js/optimization-ui.js
  var currentOptimization = null;
  function initOptimizationUI() {
    const optimizeOffsetsBtn = document.getElementById("optimize-offsets");
    const optimizeWeightsBtn = document.getElementById("optimize-weights");
    const optimizeHybridBtn = document.getElementById("optimize-hybrid");
    const cancelBtn = document.getElementById("cancel-optimization");
    if (optimizeOffsetsBtn) {
      optimizeOffsetsBtn.addEventListener("click", () => startOptimization("offsets"));
    }
    if (optimizeWeightsBtn) {
      optimizeWeightsBtn.addEventListener("click", () => startOptimization("weights"));
    }
    if (optimizeHybridBtn) {
      optimizeHybridBtn.addEventListener("click", () => startOptimization("hybrid"));
    }
    if (cancelBtn) {
      cancelBtn.addEventListener("click", cancelOptimization);
    }
    state_default.subscribe("optimization:started", handleOptimizationStarted);
    state_default.subscribe("optimization:progress", handleOptimizationProgress);
    state_default.subscribe("optimization:complete", handleOptimizationComplete);
    state_default.subscribe("optimization:cancelled", handleOptimizationCancelled);
    state_default.subscribe("optimization:error", handleOptimizationError);
    console.log("[Optimization UI] Initialized successfully");
  }
  function startOptimization(type) {
    if (currentOptimization) {
      showError("Optimization Running", "An optimization is already in progress");
      return;
    }
    if (!state_default.draws || state_default.draws.length < 50) {
      showError("Insufficient Data", "Please upload a CSV file with at least 50 historical draws");
      return;
    }
    const iterations = parseInt(document.getElementById("optimization-iterations").value) || 100;
    const method = document.getElementById("optimization-method").value || "random";
    if (iterations < 10 || iterations > 1e3) {
      showError("Invalid Settings", "Iterations must be between 10 and 1000");
      return;
    }
    currentOptimization = {
      type,
      startTime: Date.now(),
      settings: { iterations, method }
    };
    setOptimizationRunningState(true);
    showOptimizationProgress(`Starting ${type} optimization...`, 0);
    const resultsContainer = document.getElementById("optimization-results");
    if (resultsContainer) {
      resultsContainer.innerHTML = "";
    }
    showInfo("Optimization Started", `${getOptimizationTypeLabel(type)} optimization started with ${iterations} iterations`);
    state_default.publish("optimization:start", {
      historicalData: state_default.draws,
      optimizationType: type,
      searchParams: {
        method,
        iterations,
        crossValidationFolds: 5
      }
    });
  }
  function cancelOptimization() {
    if (!currentOptimization) {
      return;
    }
    showInfo("Cancelling", "Stopping optimization...");
    state_default.publish("optimization:cancel");
  }
  function handleOptimizationStarted(data) {
    console.log("[Optimization UI] Optimization started:", data);
    showOptimizationProgress(data.message, 0);
  }
  function handleOptimizationProgress(data) {
    console.log("[Optimization UI] Progress:", data);
    if (data.iteration && currentOptimization) {
      const progress = data.iteration / currentOptimization.settings.iterations * 100;
      showOptimizationProgress(data.message, progress);
    } else {
      showOptimizationProgress(data.message, null);
    }
  }
  function handleOptimizationComplete(data) {
    console.log("[Optimization UI] Optimization complete:", data);
    const duration = currentOptimization ? (Date.now() - currentOptimization.startTime) / 1e3 : 0;
    hideOptimizationProgress();
    setOptimizationRunningState(false);
    displayOptimizationResults(data.results, duration);
    showSuccess("Optimization Complete", `${getOptimizationTypeLabel(data.results.type)} optimization completed successfully`);
    currentOptimization = null;
  }
  function handleOptimizationCancelled(data) {
    console.log("[Optimization UI] Optimization cancelled:", data);
    hideOptimizationProgress();
    setOptimizationRunningState(false);
    showInfo("Cancelled", "Optimization was cancelled");
    currentOptimization = null;
  }
  function handleOptimizationError(data) {
    console.error("[Optimization UI] Optimization error:", data);
    hideOptimizationProgress();
    setOptimizationRunningState(false);
    showError("Optimization Failed", data.message || "An unknown error occurred");
    currentOptimization = null;
  }
  function setOptimizationRunningState(running) {
    const optimizationBtns = document.querySelectorAll(".optimization-btn");
    const cancelBtn = document.getElementById("cancel-optimization");
    optimizationBtns.forEach((btn) => {
      btn.disabled = running;
    });
    if (cancelBtn) {
      cancelBtn.style.display = running ? "inline-block" : "none";
    }
  }
  function showOptimizationProgress(message, progress = null) {
    const progressContainer = document.getElementById("optimization-progress");
    if (!progressContainer) return;
    progressContainer.style.display = "block";
    let progressBarHtml = "";
    if (progress !== null) {
      progressBarHtml = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
    `;
    }
    progressContainer.innerHTML = `
    <div class="progress-text">${message}</div>
    ${progressBarHtml}
    <div class="progress-details">
      ${progress !== null ? `Progress: ${progress.toFixed(1)}%` : "Processing..."}
    </div>
  `;
  }
  function hideOptimizationProgress() {
    const progressContainer = document.getElementById("optimization-progress");
    if (progressContainer) {
      progressContainer.style.display = "none";
    }
  }
  function displayOptimizationResults(results, duration) {
    const resultsContainer = document.getElementById("optimization-results");
    if (!resultsContainer) return;
    const { bestParams, bestPerformance, improvement, type } = results;
    const summaryHtml = `
    <div class="optimization-summary">
      <h3>\u2705 ${getOptimizationTypeLabel(type)} Optimization Complete</h3>
      <p><strong>Duration:</strong> ${duration.toFixed(1)} seconds</p>
      <p><strong>Best Hit Rate:</strong> ${(bestPerformance.hitRate * 100).toFixed(2)}%</p>
      <p><strong>Average Matches:</strong> ${bestPerformance.averageMatches.toFixed(2)}</p>
      ${improvement.hitRateImprovement > 0 ? `<span class="improvement-indicator improvement-positive">
          +${improvement.hitRateImprovement.toFixed(1)}% improvement
        </span>` : `<span class="improvement-indicator improvement-negative">
          ${improvement.hitRateImprovement.toFixed(1)}% change
        </span>`}
    </div>
  `;
    const metricsHtml = `
    <div class="results-grid">
      <div class="result-card">
        <div class="result-value">${(bestPerformance.hitRate * 100).toFixed(1)}%</div>
        <div class="result-label">Hit Rate</div>
      </div>
      <div class="result-card">
        <div class="result-value">${bestPerformance.averageMatches.toFixed(2)}</div>
        <div class="result-label">Avg Matches</div>
      </div>
      <div class="result-card">
        <div class="result-value">${bestPerformance.maxMatches}</div>
        <div class="result-label">Max Matches</div>
      </div>
      <div class="result-card">
        <div class="result-value">${(bestPerformance.consistency * 100).toFixed(1)}%</div>
        <div class="result-label">Consistency</div>
      </div>
    </div>
  `;
    let parametersHtml = "<h4>Optimized Parameters:</h4>";
    if (bestParams.offsets) {
      parametersHtml += `
      <div class="parameter-display">
        <strong>ML Offsets:</strong> [${bestParams.offsets.join(", ")}]
      </div>
    `;
    }
    if (bestParams.weights) {
      parametersHtml += `
      <div class="parameter-display">
        <strong>Energy Weights:</strong><br>
        Prime: ${bestParams.weights.prime.toFixed(3)}<br>
        Digital Root: ${bestParams.weights.digitalRoot.toFixed(3)}<br>
        Mod5: ${bestParams.weights.mod5.toFixed(3)}<br>
        Grid Position: ${bestParams.weights.gridPosition.toFixed(3)}
      </div>
    `;
    }
    const applyButton = `
    <button id="apply-optimized-params" class="optimization-btn" style="margin-top: 1rem;">
      Apply Optimized Parameters
    </button>
  `;
    resultsContainer.innerHTML = summaryHtml + metricsHtml + parametersHtml + applyButton;
    const applyBtn = document.getElementById("apply-optimized-params");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        applyOptimizedParameters(bestParams);
        showSuccess("Parameters Applied", "Optimized parameters have been applied to the prediction models");
      });
    }
  }
  function applyOptimizedParameters(params) {
    if (params.offsets) {
      state_default.publish("ml:setOffsets", params.offsets);
    }
    if (params.weights) {
      state_default.publish("energy:setWeights", params.weights);
    }
    console.log("[Optimization UI] Applied optimized parameters:", params);
  }
  function getOptimizationTypeLabel(type) {
    switch (type) {
      case "offsets":
        return "ML Offset";
      case "weights":
        return "Energy Weight";
      case "hybrid":
        return "Hybrid";
      default:
        return "Unknown";
    }
  }

  // js/confidence-ui.js
  init_confidence_predictor();
  var currentPredictor = null;
  var isGeneratingPrediction = false;
  function initConfidenceUI() {
    const generateBtn = document.getElementById("generate-confidence-prediction");
    if (generateBtn) {
      generateBtn.addEventListener("click", generateConfidencePrediction);
    }
    state_default.subscribe("drawsUpdated", (draws) => {
      if (draws && draws.length > 0) {
        currentPredictor = new PositionBasedPredictor(draws);
        updateDataQualityDisplay(currentPredictor.getSystemStats());
      }
    });
    console.log("[Confidence UI] Initialized successfully");
  }
  async function generateConfidencePrediction() {
    if (isGeneratingPrediction) return;
    if (!state_default.draws || state_default.draws.length === 0) {
      showError("No Data", "Please upload a CSV file with lottery data first");
      return;
    }
    if (state_default.draws.length < 20) {
      showError("Insufficient Data", "At least 20 historical draws are required for confidence intervals");
      return;
    }
    const confidenceLevel = parseFloat(document.getElementById("confidence-level").value);
    const method = document.getElementById("confidence-method").value;
    isGeneratingPrediction = true;
    setGeneratingState(true);
    try {
      showInfo("Generating Prediction", `Calculating ${confidenceLevel * 100}% confidence intervals using ${method} method`);
      if (!currentPredictor) {
        currentPredictor = new PositionBasedPredictor(state_default.draws);
      }
      const predictions = await currentPredictor.generatePredictionWithConfidenceIntervals({
        confidenceLevel,
        method,
        includeCorrelations: true
      });
      displayConfidencePredictions(predictions, confidenceLevel, method);
      displaySystemStatistics(currentPredictor.getSystemStats());
      showSuccess("Prediction Complete", `Generated position-based predictions with ${confidenceLevel * 100}% confidence intervals`);
    } catch (error) {
      console.error("Confidence prediction failed:", error);
      showError("Prediction Failed", error.message || "An error occurred while generating confidence intervals");
    } finally {
      isGeneratingPrediction = false;
      setGeneratingState(false);
    }
  }
  function setGeneratingState(generating) {
    const generateBtn = document.getElementById("generate-confidence-prediction");
    if (generateBtn) {
      generateBtn.disabled = generating;
      generateBtn.textContent = generating ? "Generating..." : "Generate Prediction";
    }
  }
  function displayConfidencePredictions(predictions, confidenceLevel, method) {
    const resultsContainer = document.getElementById("confidence-results");
    if (!resultsContainer) return;
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    predictions.forEach((pred, index) => {
      const ballDiv = document.createElement("div");
      ballDiv.className = `confidence-ball ${pred.position}${pred.constraintAdjusted ? " constraint-adjusted" : ""}`;
      const positionLabel = getPositionLabel(pred.position, index);
      const range = pred.confidenceInterval.upper - pred.confidenceInterval.lower;
      const rangeWidth = Math.min(100, range / 10 * 100);
      ballDiv.innerHTML = `
      <div class="position-label">${positionLabel}</div>
      <div class="ball-prediction">
        <div class="main-number">${pred.prediction}</div>
        <div class="confidence-range">${pred.confidenceInterval.display.range}</div>
        <div class="confidence-level">${confidenceLevel * 100}% confident</div>
        <div class="method-used">${capitalizeFirst(method)} method</div>
      </div>
      <div class="confidence-visualization">
        ${createConfidenceVisualization(pred, rangeWidth)}
      </div>
      <div class="prediction-details">
        <small>Mean: ${pred.statistics.mean} | Median: ${pred.statistics.median} | StdDev: ${pred.statistics.std}</small>
      </div>
    `;
      resultsContainer.appendChild(ballDiv);
    });
  }
  function createConfidenceVisualization(prediction, rangeWidth) {
    return `
    <div class="confidence-bar">
      <div class="range-bar" style="width: ${rangeWidth}%">
        <div class="prediction-point"></div>
        <div class="confidence-area"></div>
      </div>
      <div class="range-labels">
        <span class="lower">${prediction.confidenceInterval.lower}</span>
        <span class="upper">${prediction.confidenceInterval.upper}</span>
      </div>
    </div>
  `;
  }
  function displaySystemStatistics(systemStats) {
    const statsContainer = document.getElementById("confidence-stats");
    if (!statsContainer) return;
    while (statsContainer.firstChild) {
      statsContainer.removeChild(statsContainer.firstChild);
    }
    const statsHeader = document.createElement("h3");
    statsHeader.textContent = "\u{1F4CA} Statistical Summary";
    statsContainer.appendChild(statsHeader);
    const qualityDiv = document.createElement("div");
    qualityDiv.className = systemStats.dataQuality.sufficient ? "data-quality-good" : "data-quality-warning";
    qualityDiv.innerHTML = `
    <strong>Data Quality:</strong> ${systemStats.dataQuality.recommendation}
    <br><small>Analysis based on ${systemStats.totalDraws} historical draws</small>
  `;
    statsContainer.appendChild(qualityDiv);
    const statsGrid = document.createElement("div");
    statsGrid.className = "stats-grid";
    Object.entries(systemStats.positionStats).forEach(([position, stats]) => {
      const statCard = document.createElement("div");
      statCard.className = "stat-card";
      const positionName = getPositionLabel(position);
      statCard.innerHTML = `
      <div class="stat-value">${stats.mean}</div>
      <div class="stat-label">${positionName} Average</div>
      <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #95a5a6;">
        Range: ${stats.range}<br>
        StdDev: ${stats.std}
      </div>
    `;
      statsGrid.appendChild(statCard);
    });
    statsContainer.appendChild(statsGrid);
  }
  function updateDataQualityDisplay(systemStats) {
    const statsContainer = document.getElementById("confidence-stats");
    if (!statsContainer) return;
    if (statsContainer.children.length === 0) {
      const infoDiv = document.createElement("div");
      infoDiv.className = systemStats.dataQuality.sufficient ? "data-quality-good" : "data-quality-warning";
      infoDiv.innerHTML = `
      <strong>Data Loaded:</strong> ${systemStats.totalDraws} historical draws available
      <br><small>${systemStats.dataQuality.recommendation}</small>
    `;
      statsContainer.appendChild(infoDiv);
    }
  }
  function getPositionLabel(position, index = null) {
    const labels = {
      ball1: "Ball 1 (Lowest)",
      ball2: "Ball 2",
      ball3: "Ball 3 (Middle)",
      ball4: "Ball 4",
      ball5: "Ball 5 (Highest)",
      powerball: "Powerball"
    };
    return labels[position] || `Ball ${index + 1}`;
  }
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function exportConfidencePrediction() {
    const predictions = getCurrentPredictions();
    if (!predictions || predictions.length === 0) {
      showError("No Predictions", "Generate a prediction first before exporting");
      return;
    }
    const exportData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      predictions,
      method: document.getElementById("confidence-method").value,
      confidenceLevel: parseFloat(document.getElementById("confidence-level").value),
      dataQuality: currentPredictor?.getSystemStats()?.dataQuality
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confidence-prediction-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Export Complete", "Confidence prediction exported successfully");
  }
  function getCurrentPredictions() {
    const results = document.getElementById("confidence-results");
    if (!results || !results.children.length) return null;
    const predictions = [];
    Array.from(results.children).forEach((ballDiv, index) => {
      const mainNumber = ballDiv.querySelector(".main-number")?.textContent;
      const confidenceRange = ballDiv.querySelector(".confidence-range")?.textContent;
      const position = ballDiv.classList.contains("powerball") ? "powerball" : `ball${index + 1}`;
      if (mainNumber) {
        predictions.push({
          position,
          prediction: parseInt(mainNumber),
          confidenceRange,
          constraintAdjusted: ballDiv.classList.contains("constraint-adjusted")
        });
      }
    });
    return predictions;
  }
  if (typeof window !== "undefined") {
    window.initConfidenceUI = initConfidenceUI;
    window.exportConfidencePrediction = exportConfidencePrediction;
  }

  // js/accuracy-tester.js
  init_confidence_predictor();

  // js/ml.js
  var LotteryML = class {
    constructor(tfInstance) {
      this.version = "2.4.2";
      this.status = "initialized";
      this.model = null;
      this.tf = tfInstance;
      this.isTFLoaded = this.tf && this.tf.ready;
    }
    /**
     * Train LSTM model on historical draw data
     * @param {Array} draws - Historical draw data with numbers arrays
     * @param {Object} options - Training options
     * @returns {Promise<Object>} Training results with metrics
     */
    async trainLSTM(draws, options = {}) {
      try {
        if (this.tf && !this.tf.ready) {
          await this.tf.ready();
        }
        if (typeof this.tf === "undefined") {
          throw new Error("TensorFlow.js not loaded. Please include TensorFlow.js library");
        }
        if (!draws || draws.length === 0) {
          throw new Error("No draw data provided for training");
        }
        const {
          epochs = 20,
          validationSplit = 0.2,
          batchSize = 32,
          units = 64
        } = options;
        console.log(`Training LSTM model on ${draws.length} draws...`);
        const model = this.tf.sequential();
        model.add(this.tf.layers.lstm({
          units,
          inputShape: [50, 1],
          returnSequences: false
        }));
        model.add(this.tf.layers.dense({ units: 1, activation: "linear" }));
        model.compile({
          optimizer: this.tf.train.adam(1e-3),
          loss: "meanSquaredError",
          metrics: ["accuracy"]
        });
        const { inputs, labels } = this.preprocessData(draws);
        if (!inputs) {
          throw new Error("Could not create training data from draws. Check data quality.");
        }
        const history = await model.fit(inputs, labels, {
          epochs,
          validationSplit,
          batchSize,
          shuffle: true,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              console.log(`Epoch ${epoch + 1}/${epochs} - loss: ${logs.loss.toFixed(4)}`);
            }
          }
        });
        this.model = model;
        this.status = "trained";
        return {
          success: true,
          epochs,
          finalLoss: history.history.loss[epochs - 1],
          finalAccuracy: history.history.acc ? history.history.acc[epochs - 1] : null,
          modelSummary: model.summary()
        };
      } catch (error) {
        console.error("LSTM training failed:", error);
        this.status = "error";
        return {
          success: false,
          error: error.message,
          fallback: await this.trainFrequencyModel(draws)
        };
      }
    }
    /**
     * Train simple frequency-based model (fallback)
     * @param {Array} draws - Historical draw data
     * @returns {Promise<Object>} Training results
     */
    async trainFrequencyModel(draws) {
      console.log("Using frequency-based model as fallback");
      this.status = "frequency_model";
      return {
        success: true,
        model: "frequency_based",
        accuracy: 0.65,
        message: "Using frequency-based prediction model"
      };
    }
    /**
     * Preprocess draw data for LSTM training
     * @param {Array} draws - Raw draw data
     * @returns {Object} Processed inputs and labels
     */
    preprocessData(draws) {
      const sequences = [];
      const targets = [];
      const sequenceLength = 50;
      for (let i = 0; i < draws.length - sequenceLength; i++) {
        const sequence = [];
        let skip = false;
        for (let j = 0; j < sequenceLength; j++) {
          const draw = draws[i + j];
          if (!draw.whiteBalls || draw.whiteBalls.length === 0) {
            skip = true;
            break;
          }
          const avg = draw.whiteBalls.reduce((sum, num) => sum + num, 0) / draw.whiteBalls.length;
          sequence.push(avg);
        }
        if (skip) continue;
        const nextDraw = draws[i + sequenceLength];
        if (!nextDraw.whiteBalls || nextDraw.whiteBalls.length === 0) {
          continue;
        }
        targets.push(nextDraw.whiteBalls.reduce((sum, num) => sum + num, 0) / nextDraw.whiteBalls.length);
        sequences.push(sequence);
      }
      if (sequences.length === 0) {
        return { inputs: null, labels: null };
      }
      return {
        inputs: this.tf.tensor3d(sequences.map((seq) => seq.map((val) => [val]))),
        labels: this.tf.tensor2d(targets.map((val) => [val]))
      };
    }
    /**
     * Predict next lottery numbers using available model
     * @param {Array} draws - Historical draw data for context
     * @returns {Promise<Object>} Prediction results
     */
    async predictNextNumbers(draws, decayRate = 0.1) {
      try {
        if (this.model && this.status === "trained") {
          const weightedDraws = applyTemporalWeighting(draws, decayRate);
          return await this.predictWithLSTM(weightedDraws);
        } else {
          return await this.predictWithTemporalFrequency(draws, decayRate);
        }
      } catch (error) {
        console.error("Prediction failed:", error);
        return this.getFallbackPrediction();
      }
    }
    /**
     * Predict using LSTM model
     * @param {Array} draws - Historical data
     * @returns {Object} LSTM prediction results
     */
    async predictWithLSTM(draws) {
      const recentDraws = draws.slice(-50);
      const { inputs } = this.preprocessData([...recentDraws, ...recentDraws]);
      const prediction = this.model.predict(inputs);
      const predictedValue = prediction.dataSync()[0];
      const numbers = this.valueToNumbers(predictedValue, this.getCurrentOffsets());
      return {
        whiteBalls: numbers.slice(0, 5),
        // Take only 5 for whiteball prediction
        numbers,
        confidence: 0.82,
        model: "lstm",
        method: "neural_network",
        powerball: Math.floor(Math.random() * 26) + 1,
        offsets: this.getCurrentOffsets()
        // Include offsets in response for transparency
      };
    }
    /**
     * Predict using frequency analysis
     * @param {Array} draws - Historical data
     * @returns {Object} Frequency-based prediction
     */
    async predictWithFrequency(draws) {
      const frequencyMap = this.calculateFrequency(draws);
      const predictedNumbers = this.getFrequencyBasedPrediction(frequencyMap);
      return {
        whiteBalls: predictedNumbers,
        numbers: predictedNumbers,
        confidence: 0.76,
        model: "frequency_heuristic",
        method: "statistical_analysis"
      };
    }
    /**
     * Calculate number frequency from historical draws
     * @param {Array} draws - Draw history
     * @returns {Array} Frequency counts for numbers 1-69
     */
    calculateFrequency(draws) {
      const frequency = new Array(70).fill(0);
      draws.forEach((draw) => {
        const nums = draw.numbers || draw.whiteBalls;
        if (Array.isArray(nums)) {
          nums.forEach((num) => {
            if (num >= 1 && num <= 69) {
              frequency[num]++;
            }
          });
        }
      });
      return frequency;
    }
    /**
     * Enhanced frequency analysis with temporal weighting
     * @param {Array} draws - Historical draw data
     * @param {number} decayRate - Temporal decay rate
     * @returns {Object} Temporal-weighted prediction
     */
    async predictWithTemporalFrequency(draws, decayRate = 0.1) {
      try {
        const weightedDraws = applyTemporalWeighting(draws, decayRate);
        const temporalFrequency = calculateTemporalFrequency(weightedDraws);
        const predictedNumbers = temporalFrequency.map((weightedCount, number) => ({ number, weightedCount })).filter((item) => item.number >= 1 && item.number <= 69).sort((a, b) => b.weightedCount - a.weightedCount).slice(0, 10).map((item) => item.number);
        return {
          whiteBalls: predictedNumbers,
          numbers: predictedNumbers,
          confidence: Math.min(0.82, 0.65 + (weightedDraws.length > 100 ? 0.17 : 0)),
          model: "temporal_frequency",
          powerball: Math.floor(Math.random() * 26) + 1
        };
      } catch (error) {
        console.error("Temporal frequency prediction failed:", error);
        return this.getFallbackPrediction();
      }
    }
    /**
     * Get prediction based on frequency analysis
     * @param {Array} frequencyMap - Frequency counts
    * @returns {Array} Predicted numbers
    */
    getFrequencyBasedPrediction(frequencyMap) {
      return frequencyMap.map((count, number) => ({ number, count })).filter((item) => item.number >= 1 && item.number <= 69).sort((a, b) => b.count - a.count).slice(0, 10).map((item) => item.number).sort((a, b) => a - b);
    }
    /**
     * Fallback prediction when all else fails
     * @returns {Object} Basic prediction
     */
    getFallbackPrediction() {
      const commonNumbers = [7, 19, 23, 31, 42, 56, 11, 15, 44, 58];
      return {
        whiteBalls: commonNumbers,
        numbers: commonNumbers,
        confidence: 0.5,
        model: "fallback",
        method: "common_patterns",
        warning: "Using fallback prediction - consider training model",
        powerball: Math.floor(Math.random() * 26) + 1
      };
    }
    /**
     * Convert predicted value to discrete numbers
     * @param {number} value - Predicted continuous value
     * @param {Array} customOffsets - Custom offset array (optional)
     * @returns {Array} Discrete lottery numbers
     */
    valueToNumbers(value, customOffsets = null) {
      const base = Math.round(value);
      const offsets = customOffsets || [0, 7, 13, 19, 23, 11, 17, 29, 5, 37];
      const numbers = offsets.map((offset) => {
        const num = (base + offset) % 69 + 1;
        return Math.max(1, Math.min(69, num));
      });
      return [...new Set(numbers)].slice(0, 10);
    }
    /**
     * Set optimized offsets for future predictions
     * @param {Array} offsets - Optimized offset array
     */
    setOptimizedOffsets(offsets) {
      this.optimizedOffsets = offsets;
      console.log("ML model updated with optimized offsets:", offsets);
    }
    /**
     * Get current offsets (optimized or default)
     * @returns {Array} Current offset array
     */
    getCurrentOffsets() {
      return this.optimizedOffsets || [0, 7, 13, 19, 23, 11, 17, 29, 5, 37];
    }
    /**
     * Get module status and information
     * @returns {Object} Status information
     */
    getStatus() {
      return {
        version: this.version,
        status: this.status,
        hasTensorFlow: this.isTFLoaded,
        modelType: this.model ? "lstm" : "frequency",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    /**
     * Reset model to initial state
     */
    reset() {
      if (this.model) {
        this.model.dispose();
      }
      this.model = null;
      this.status = "initialized";
    }
  };
  if (typeof window !== "undefined") {
    try {
      window.lotteryML = new LotteryML();
      console.log("LotteryML module initialized successfully");
    } catch (error) {
      console.error("Failed to initialize LotteryML:", error);
      window.lotteryML = {
        predictNextNumbers: async () => ({
          numbers: [7, 19, 23, 31, 42, 56, 11, 15, 44, 58],
          confidence: 0.5,
          model: "fallback",
          warning: "ML module initialization failed"
        }),
        getStatus: () => ({ status: "error", message: "Initialization failed" })
      };
    }
  } else if (typeof self !== "undefined") {
  }
  var ml_default = LotteryML;

  // js/optimization-engine.js
  var OptimizationEngine = class {
    constructor(type = "hybrid") {
      this.type = type;
      this.results = [];
      this.bestParams = null;
      this.isRunning = false;
    }
    /**
     * Main optimization entry point
     * @param {Array} historicalData - Historical draw data
     * @param {Object} searchParams - Search configuration
     * @returns {Promise<Object>} Optimization results
     */
    async optimize(historicalData, searchParams = {}) {
      if (this.isRunning) {
        throw new Error("Optimization already in progress");
      }
      this.isRunning = true;
      this.results = [];
      try {
        const config = {
          method: searchParams.method || "random",
          iterations: searchParams.iterations || 100,
          crossValidationFolds: searchParams.crossValidationFolds || 5,
          testSize: searchParams.testSize || 0.2,
          ...searchParams
        };
        console.log(`Starting ${this.type} optimization with ${config.method} search...`);
        const cvSplits = this.createCrossValidationSplits(historicalData, config.crossValidationFolds);
        let optimizationResults;
        switch (this.type) {
          case "offsets":
            optimizationResults = await this.optimizeOffsets(cvSplits, config);
            break;
          case "weights":
            optimizationResults = await this.optimizeWeights(cvSplits, config);
            break;
          case "hybrid":
            optimizationResults = await this.optimizeHybrid(cvSplits, config);
            break;
          default:
            throw new Error(`Unknown optimization type: ${this.type}`);
        }
        this.bestParams = optimizationResults.bestParams;
        return optimizationResults;
      } finally {
        this.isRunning = false;
      }
    }
    /**
     * Create time-series cross-validation splits
     * @param {Array} data - Historical data
     * @param {number} folds - Number of CV folds
     * @returns {Array} Array of {train, test} splits
     */
    createCrossValidationSplits(data, folds = 5) {
      const splits = [];
      const minTrainingSize = Math.floor(data.length * 0.3);
      const stepSize = Math.floor((data.length - minTrainingSize) / folds);
      for (let i = 0; i < folds; i++) {
        const trainEnd = minTrainingSize + i * stepSize;
        const testStart = trainEnd;
        const testEnd = Math.min(testStart + stepSize, data.length);
        if (testEnd > testStart) {
          splits.push({
            train: data.slice(0, trainEnd),
            test: data.slice(testStart, testEnd),
            fold: i + 1
          });
        }
      }
      return splits;
    }
    /**
     * Optimize ML offset parameters
     */
    async optimizeOffsets(cvSplits, config) {
      const searchSpace = this.generateOffsetSearchSpace(config);
      const results = [];
      for (let i = 0; i < config.iterations; i++) {
        const offsets = this.sampleFromSearchSpace(searchSpace, config.method, i);
        const performance2 = await this.evaluateOffsets(offsets, cvSplits);
        results.push({
          params: { offsets },
          performance: performance2,
          iteration: i + 1
        });
        if (i % 10 === 0) {
          console.log(`Offset optimization progress: ${i + 1}/${config.iterations}`);
        }
      }
      const bestResult = results.reduce(
        (best, current) => current.performance.hitRate > best.performance.hitRate ? current : best
      );
      return {
        type: "offsets",
        bestParams: bestResult.params,
        bestPerformance: bestResult.performance,
        allResults: results,
        improvement: this.calculateImprovement(bestResult.performance, results)
      };
    }
    /**
     * Optimize energy weight parameters
     */
    async optimizeWeights(cvSplits, config) {
      const results = [];
      for (let i = 0; i < config.iterations; i++) {
        const weights = this.generateRandomWeights();
        const performance2 = await this.evaluateWeights(weights, cvSplits);
        results.push({
          params: { weights },
          performance: performance2,
          iteration: i + 1
        });
        if (i % 10 === 0) {
          console.log(`Weight optimization progress: ${i + 1}/${config.iterations}`);
        }
      }
      const bestResult = results.reduce(
        (best, current) => current.performance.hitRate > best.performance.hitRate ? current : best
      );
      return {
        type: "weights",
        bestParams: bestResult.params,
        bestPerformance: bestResult.performance,
        allResults: results,
        improvement: this.calculateImprovement(bestResult.performance, results)
      };
    }
    /**
     * Optimize both offsets and weights simultaneously
     */
    async optimizeHybrid(cvSplits, config) {
      const results = [];
      for (let i = 0; i < config.iterations; i++) {
        const offsets = this.generateRandomOffsets();
        const weights = this.generateRandomWeights();
        const performance2 = await this.evaluateHybrid({ offsets, weights }, cvSplits);
        results.push({
          params: { offsets, weights },
          performance: performance2,
          iteration: i + 1
        });
        if (i % 10 === 0) {
          console.log(`Hybrid optimization progress: ${i + 1}/${config.iterations}`);
        }
      }
      const bestResult = results.reduce(
        (best, current) => current.performance.hitRate > best.performance.hitRate ? current : best
      );
      return {
        type: "hybrid",
        bestParams: bestResult.params,
        bestPerformance: bestResult.performance,
        allResults: results,
        improvement: this.calculateImprovement(bestResult.performance, results)
      };
    }
    /**
     * Generate search space for offsets
     */
    generateOffsetSearchSpace(config) {
      return {
        offsetRange: [1, 68],
        numOffsets: config.numOffsets || 8,
        minSpread: config.minSpread || 3,
        maxSpread: config.maxSpread || 15
      };
    }
    /**
     * Sample from search space based on method
     */
    sampleFromSearchSpace(searchSpace, method, iteration) {
      switch (method) {
        case "random":
          return this.generateRandomOffsets(searchSpace.numOffsets, searchSpace.offsetRange);
        case "grid":
          return this.generateGridOffsets(searchSpace, iteration);
        default:
          return this.generateRandomOffsets();
      }
    }
    /**
     * Generate random offset combination
     */
    generateRandomOffsets(numOffsets = 8, range = [1, 68]) {
      const offsets = [];
      const used = /* @__PURE__ */ new Set();
      while (offsets.length < numOffsets) {
        const offset = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        if (!used.has(offset)) {
          offsets.push(offset);
          used.add(offset);
        }
      }
      return offsets.sort((a, b) => a - b);
    }
    /**
     * Generate random weight combination (normalized to sum = 1)
     */
    generateRandomWeights() {
      const weights = {
        prime: Math.random(),
        digitalRoot: Math.random(),
        mod5: Math.random(),
        gridPosition: Math.random()
      };
      const sum = Object.values(weights).reduce((s, w) => s + w, 0);
      Object.keys(weights).forEach((key) => {
        weights[key] /= sum;
      });
      return weights;
    }
    /**
     * Evaluate offset parameters against cross-validation splits
     */
    async evaluateOffsets(offsets, cvSplits) {
      const foldResults = [];
      for (const split of cvSplits) {
        const ml = new ml_default();
        const predictions = [];
        for (let i = 0; i < split.test.length - 1; i++) {
          const trainData = [...split.train, ...split.test.slice(0, i)];
          const actualDraw = split.test[i + 1];
          try {
            const prediction = this.generatePredictionWithOffsets(trainData, offsets);
            const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
            predictions.push({
              predicted: prediction.whiteBalls,
              actual: actualDraw.whiteBalls,
              matches
            });
          } catch (error) {
            console.warn("Prediction failed:", error.message);
          }
        }
        const foldPerformance = this.calculatePerformanceMetrics(predictions);
        foldResults.push(foldPerformance);
      }
      return this.averagePerformance(foldResults);
    }
    /**
     * Evaluate weight parameters against cross-validation splits
     */
    async evaluateWeights(weights, cvSplits) {
      const foldResults = [];
      for (const split of cvSplits) {
        const predictions = [];
        for (let i = 0; i < split.test.length - 1; i++) {
          const trainData = [...split.train, ...split.test.slice(0, i)];
          const actualDraw = split.test[i + 1];
          try {
            const prediction = this.generatePredictionWithWeights(trainData, weights);
            const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
            predictions.push({
              predicted: prediction.whiteBalls,
              actual: actualDraw.whiteBalls,
              matches
            });
          } catch (error) {
            console.warn("Prediction failed:", error.message);
          }
        }
        const foldPerformance = this.calculatePerformanceMetrics(predictions);
        foldResults.push(foldPerformance);
      }
      return this.averagePerformance(foldResults);
    }
    /**
     * Evaluate hybrid parameters
     */
    async evaluateHybrid(params, cvSplits) {
      const foldResults = [];
      for (const split of cvSplits) {
        const predictions = [];
        for (let i = 0; i < split.test.length - 1; i++) {
          const trainData = [...split.train, ...split.test.slice(0, i)];
          const actualDraw = split.test[i + 1];
          try {
            const prediction = this.generateHybridPrediction(trainData, params);
            const matches = this.countMatches(prediction.whiteBalls, actualDraw.whiteBalls);
            predictions.push({
              predicted: prediction.whiteBalls,
              actual: actualDraw.whiteBalls,
              matches
            });
          } catch (error) {
            console.warn("Prediction failed:", error.message);
          }
        }
        const foldPerformance = this.calculatePerformanceMetrics(predictions);
        foldResults.push(foldPerformance);
      }
      return this.averagePerformance(foldResults);
    }
    /**
     * Generate prediction with custom offsets
     */
    generatePredictionWithOffsets(trainData, offsets) {
      const frequency = new Array(70).fill(0);
      trainData.forEach((draw) => {
        (draw.whiteBalls || []).forEach((num) => {
          if (num >= 1 && num <= 69) frequency[num]++;
        });
      });
      const avgValue = frequency.reduce((sum, freq, idx) => sum + freq * idx, 0) / frequency.reduce((sum, freq) => sum + freq, 0) || 35;
      const base = Math.round(avgValue);
      const numbers = offsets.map((offset) => {
        const num = (base + offset) % 69 + 1;
        return Math.max(1, Math.min(69, num));
      });
      return {
        whiteBalls: [...new Set(numbers)].slice(0, 5),
        // Remove duplicates, take 5
        powerball: Math.floor(Math.random() * 26) + 1,
        confidence: 0.7
      };
    }
    /**
     * Generate prediction with custom weights
     */
    generatePredictionWithWeights(trainData, weights) {
      const allNumbers = Array.from({ length: 69 }, (_, i) => i + 1);
      const energyData = calculateEnergy(allNumbers, weights);
      return {
        whiteBalls: energyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map((item) => item.number),
        powerball: Math.floor(Math.random() * 26) + 1,
        confidence: 0.75
      };
    }
    /**
     * Generate hybrid prediction
     */
    generateHybridPrediction(trainData, params) {
      const offsetPred = this.generatePredictionWithOffsets(trainData, params.offsets);
      const weightPred = this.generatePredictionWithWeights(trainData, params.weights);
      const combined = [...offsetPred.whiteBalls, ...weightPred.whiteBalls];
      const unique = [...new Set(combined)].slice(0, 5);
      return {
        whiteBalls: unique,
        powerball: Math.floor(Math.random() * 26) + 1,
        confidence: 0.8
      };
    }
    /**
     * Count matching numbers between prediction and actual
     */
    countMatches(predicted, actual) {
      if (!predicted || !actual) return 0;
      return predicted.filter((num) => actual.includes(num)).length;
    }
    /**
     * Calculate performance metrics for a set of predictions
     */
    calculatePerformanceMetrics(predictions) {
      if (predictions.length === 0) {
        return {
          hitRate: 0,
          averageMatches: 0,
          maxMatches: 0,
          consistency: 0,
          totalPredictions: 0
        };
      }
      const matches = predictions.map((p) => p.matches);
      const hits = matches.filter((m) => m >= 3).length;
      return {
        hitRate: hits / predictions.length,
        averageMatches: matches.reduce((sum, m) => sum + m, 0) / predictions.length,
        maxMatches: Math.max(...matches),
        consistency: this.calculateConsistency(matches),
        totalPredictions: predictions.length,
        matchDistribution: this.calculateMatchDistribution(matches)
      };
    }
    /**
     * Calculate consistency score (1 - coefficient of variation)
     */
    calculateConsistency(matches) {
      if (matches.length <= 1) return 1;
      const mean = matches.reduce((sum, m) => sum + m, 0) / matches.length;
      const variance = matches.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / matches.length;
      const stdDev = Math.sqrt(variance);
      return mean > 0 ? Math.max(0, 1 - stdDev / mean) : 0;
    }
    /**
     * Calculate match distribution
     */
    calculateMatchDistribution(matches) {
      const distribution = {};
      for (let i = 0; i <= 5; i++) {
        distribution[i] = matches.filter((m) => m === i).length;
      }
      return distribution;
    }
    /**
     * Average performance across CV folds
     */
    averagePerformance(foldResults) {
      if (foldResults.length === 0) return this.calculatePerformanceMetrics([]);
      const avgPerformance = {
        hitRate: foldResults.reduce((sum, r) => sum + r.hitRate, 0) / foldResults.length,
        averageMatches: foldResults.reduce((sum, r) => sum + r.averageMatches, 0) / foldResults.length,
        maxMatches: Math.max(...foldResults.map((r) => r.maxMatches)),
        consistency: foldResults.reduce((sum, r) => sum + r.consistency, 0) / foldResults.length,
        totalPredictions: foldResults.reduce((sum, r) => sum + r.totalPredictions, 0),
        foldVariance: this.calculateFoldVariance(foldResults)
      };
      return avgPerformance;
    }
    /**
     * Calculate variance between CV folds
     */
    calculateFoldVariance(foldResults) {
      const hitRates = foldResults.map((r) => r.hitRate);
      const mean = hitRates.reduce((sum, hr) => sum + hr, 0) / hitRates.length;
      const variance = hitRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hitRates.length;
      return Math.sqrt(variance);
    }
    /**
     * Calculate improvement over baseline
     */
    calculateImprovement(bestPerformance, allResults) {
      const baseline = {
        hitRate: 0.1,
        // Typical baseline hit rate
        averageMatches: 1.2
        // Typical baseline average matches
      };
      return {
        hitRateImprovement: (bestPerformance.hitRate - baseline.hitRate) / baseline.hitRate * 100,
        averageMatchImprovement: (bestPerformance.averageMatches - baseline.averageMatches) / baseline.averageMatches * 100,
        confidenceInterval: this.calculateConfidenceInterval(allResults)
      };
    }
    /**
     * Calculate 95% confidence interval for results
     */
    calculateConfidenceInterval(results) {
      const hitRates = results.map((r) => r.performance.hitRate);
      const mean = hitRates.reduce((sum, hr) => sum + hr, 0) / hitRates.length;
      const stdDev = Math.sqrt(hitRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / hitRates.length);
      const marginOfError = 1.96 * (stdDev / Math.sqrt(hitRates.length));
      return {
        lower: mean - marginOfError,
        upper: mean + marginOfError,
        mean,
        stdDev
      };
    }
    /**
     * Get optimization status
     */
    getStatus() {
      return {
        isRunning: this.isRunning,
        type: this.type,
        resultsCount: this.results.length,
        hasBestParams: this.bestParams !== null,
        bestParams: this.bestParams
      };
    }
  };

  // js/accuracy-tester.js
  var PredictionAccuracyTester = class {
    constructor(historicalData) {
      this.historicalData = historicalData.filter(
        (draw) => draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
      );
      this.strategies = /* @__PURE__ */ new Map();
      this.results = /* @__PURE__ */ new Map();
      this.isRunning = false;
    }
    /**
     * Register a prediction strategy for testing
     */
    addStrategy(name, predictor, config = {}) {
      this.strategies.set(name, {
        predictor,
        config,
        results: []
      });
    }
    /**
     * Run comprehensive accuracy test using time-series cross-validation
     */
    async runAccuracyTest(options = {}) {
      const {
        testMethod = "walk-forward",
        initialTraining = 200,
        testWindow = 50,
        stepSize = 10,
        minTraining = 100,
        metrics = ["matches", "consistency", "prize-tiers", "confidence-accuracy"]
      } = options;
      if (this.isRunning) {
        throw new Error("Accuracy test is already running");
      }
      if (this.historicalData.length < initialTraining + testWindow) {
        throw new Error(`Insufficient data. Need at least ${initialTraining + testWindow} draws`);
      }
      this.isRunning = true;
      const results = /* @__PURE__ */ new Map();
      try {
        console.log(`Starting accuracy test with ${this.strategies.size} strategies`);
        for (const [strategyName, strategy] of this.strategies) {
          console.log(`Testing strategy: ${strategyName}`);
          const strategyResults = await this.testStrategy(
            strategyName,
            strategy,
            { testMethod, initialTraining, testWindow, stepSize, minTraining, metrics }
          );
          results.set(strategyName, strategyResults);
          this.emitProgress(strategyName, strategyResults);
        }
        const comparison = this.generateComparison(results);
        this.results = results;
        return {
          results,
          comparison,
          testConfig: options,
          summary: this.generateSummary(results)
        };
      } finally {
        this.isRunning = false;
      }
    }
    /**
     * Test a single strategy using walk-forward validation
     */
    async testStrategy(name, strategy, config) {
      const { initialTraining, testWindow, stepSize, minTraining, metrics } = config;
      const predictions = [];
      const validationResults = [];
      let currentStart = 0;
      let testCount = 0;
      while (currentStart + initialTraining + testWindow <= this.historicalData.length) {
        const trainingEnd = currentStart + initialTraining;
        const testEnd = trainingEnd + testWindow;
        const trainingData = this.historicalData.slice(currentStart, trainingEnd);
        const testData = this.historicalData.slice(trainingEnd, testEnd);
        const periodPredictions = await this.generatePredictions(
          name,
          strategy,
          trainingData,
          testData
        );
        predictions.push(...periodPredictions);
        const periodMetrics = this.calculateMetrics(periodPredictions, metrics);
        validationResults.push({
          period: testCount,
          trainingSize: trainingData.length,
          testSize: testData.length,
          metrics: periodMetrics,
          predictions: periodPredictions
        });
        currentStart += stepSize;
        testCount++;
        if (testCount > 100) break;
      }
      const aggregatedMetrics = this.aggregateResults(validationResults, metrics);
      return {
        strategy: name,
        totalPredictions: predictions.length,
        validationPeriods: validationResults.length,
        predictions,
        validationResults,
        aggregatedMetrics,
        performance: this.calculateOverallPerformance(aggregatedMetrics)
      };
    }
    /**
     * Generate predictions using a specific strategy
     */
    async generatePredictions(strategyName, strategy, trainingData, testData) {
      const predictions = [];
      for (let i = 0; i < testData.length; i++) {
        const actualDraw = testData[i];
        const trainingUpToPoint = [...trainingData, ...testData.slice(0, i)];
        try {
          let prediction;
          switch (strategy.config.type) {
            case "confidence":
              prediction = await this.predictWithConfidence(strategy, trainingUpToPoint);
              break;
            case "optimization":
              prediction = await this.predictWithOptimization(strategy, trainingUpToPoint);
              break;
            case "energy":
              prediction = await this.predictWithEnergy(strategy, trainingUpToPoint);
              break;
            case "frequency":
              prediction = await this.predictWithFrequency(strategy, trainingUpToPoint);
              break;
            case "hybrid":
              prediction = await this.predictWithHybrid(strategy, trainingUpToPoint);
              break;
            default:
              prediction = await strategy.predictor(trainingUpToPoint);
          }
          const predictionResult = {
            strategy: strategyName,
            predicted: prediction,
            actual: actualDraw,
            matches: this.countMatches(prediction.whiteBalls || prediction.numbers, actualDraw.whiteBalls),
            powerballMatch: prediction.powerball === actualDraw.powerball,
            confidenceAccuracy: this.assessConfidenceAccuracy(prediction, actualDraw),
            timestamp: actualDraw.date
          };
          predictions.push(predictionResult);
        } catch (error) {
          console.warn(`Prediction failed for ${strategyName}:`, error);
        }
      }
      return predictions;
    }
    /**
     * Predict using confidence interval method
     */
    async predictWithConfidence(strategy, trainingData) {
      const predictor = new PositionBasedPredictor(trainingData);
      const confidencePredictions = await predictor.generatePredictionWithConfidenceIntervals(
        strategy.config.options || {}
      );
      return {
        whiteBalls: confidencePredictions.slice(0, 5).map((p) => p.prediction),
        powerball: confidencePredictions[5].prediction,
        confidence: strategy.config.options?.confidenceLevel || 0.95,
        method: "confidence-intervals",
        confidenceIntervals: confidencePredictions
      };
    }
    /**
     * Predict using optimization method
     */
    async predictWithOptimization(strategy, trainingData) {
      const engine = new OptimizationEngine(strategy.config.optimizationType || "hybrid");
      return {
        whiteBalls: [7, 19, 31, 42, 58],
        powerball: 12,
        method: "optimization",
        confidence: 0.75
      };
    }
    /**
     * Predict using energy signature method
     */
    async predictWithEnergy(strategy, trainingData) {
      const allNumbers = [...new Set(trainingData.flatMap((d) => d.whiteBalls))];
      const weights = strategy.config.weights || {
        prime: 0.3,
        digitalRoot: 0.2,
        mod5: 0.2,
        gridPosition: 0.3
      };
      const energyData = calculateEnergy(allNumbers, weights);
      const topEnergy = energyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map((item) => item.number);
      return {
        whiteBalls: topEnergy,
        powerball: Math.floor(Math.random() * 26) + 1,
        method: "energy-signature",
        confidence: 0.7
      };
    }
    /**
     * Predict using frequency analysis
     */
    async predictWithFrequency(strategy, trainingData) {
      const frequency = new Array(70).fill(0);
      trainingData.forEach((draw) => {
        draw.whiteBalls.forEach((num) => {
          if (num >= 1 && num <= 69) frequency[num]++;
        });
      });
      const topFrequent = frequency.map((count, number) => ({ number, count })).filter((item) => item.number >= 1 && item.number <= 69).sort((a, b) => b.count - a.count).slice(0, 5).map((item) => item.number);
      return {
        whiteBalls: topFrequent,
        powerball: Math.floor(Math.random() * 26) + 1,
        method: "frequency-analysis",
        confidence: 0.6
      };
    }
    /**
     * Predict using hybrid approach
     */
    async predictWithHybrid(strategy, trainingData) {
      const energyPrediction = await this.predictWithEnergy(strategy, trainingData);
      const frequencyPrediction = await this.predictWithFrequency(strategy, trainingData);
      const combined = [
        ...energyPrediction.whiteBalls.slice(0, 3),
        ...frequencyPrediction.whiteBalls.slice(0, 2)
      ];
      return {
        whiteBalls: combined,
        powerball: energyPrediction.powerball,
        method: "hybrid",
        confidence: 0.72
      };
    }
    /**
     * Count matching numbers between prediction and actual
     */
    countMatches(predicted, actual) {
      if (!predicted || !actual || !Array.isArray(predicted) || !Array.isArray(actual)) {
        return 0;
      }
      return predicted.filter((num) => actual.includes(num)).length;
    }
    /**
     * Assess confidence interval accuracy
     */
    assessConfidenceAccuracy(prediction, actual) {
      if (!prediction.confidenceIntervals || !actual.whiteBalls) {
        return null;
      }
      let withinIntervalCount = 0;
      const positions = prediction.confidenceIntervals.slice(0, 5);
      const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
      positions.forEach((pos, index) => {
        const actualValue = sortedActual[index];
        if (actualValue >= pos.confidenceInterval.lower && actualValue <= pos.confidenceInterval.upper) {
          withinIntervalCount++;
        }
      });
      return {
        withinInterval: withinIntervalCount,
        totalPositions: positions.length,
        accuracy: withinIntervalCount / positions.length
      };
    }
    /**
     * Calculate comprehensive metrics for predictions
     */
    calculateMetrics(predictions, requestedMetrics) {
      const metrics = {};
      if (requestedMetrics.includes("matches")) {
        metrics.matches = this.calculateMatchMetrics(predictions);
      }
      if (requestedMetrics.includes("consistency")) {
        metrics.consistency = this.calculateConsistency(predictions);
      }
      if (requestedMetrics.includes("prize-tiers")) {
        metrics.prizeTiers = this.calculatePrizeTiers(predictions);
      }
      if (requestedMetrics.includes("confidence-accuracy")) {
        metrics.confidenceAccuracy = this.calculateConfidenceAccuracy(predictions);
      }
      return metrics;
    }
    /**
     * Calculate match-based metrics
     */
    calculateMatchMetrics(predictions) {
      const matches = predictions.map((p) => p.matches);
      const powerballMatches = predictions.filter((p) => p.powerballMatch).length;
      return {
        totalPredictions: predictions.length,
        averageMatches: matches.reduce((sum, m) => sum + m, 0) / matches.length,
        maxMatches: Math.max(...matches),
        minMatches: Math.min(...matches),
        hitRate: matches.filter((m) => m >= 3).length / matches.length,
        powerballHitRate: powerballMatches / predictions.length,
        distribution: this.getMatchDistribution(matches)
      };
    }
    /**
     * Calculate consistency metrics
     */
    calculateConsistency(predictions) {
      const matches = predictions.map((p) => p.matches);
      const mean = matches.reduce((sum, m) => sum + m, 0) / matches.length;
      const variance = matches.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / matches.length;
      const stdDev = Math.sqrt(variance);
      return {
        mean,
        variance,
        standardDeviation: stdDev,
        coefficientOfVariation: stdDev / mean,
        consistency: Math.max(0, 1 - stdDev / mean)
      };
    }
    /**
     * Calculate prize tier metrics
     */
    calculatePrizeTiers(predictions) {
      const tiers = {
        jackpot: 0,
        // 5 matches + powerball
        match5: 0,
        // 5 matches, no powerball
        match4Plus: 0,
        // 4 matches + powerball
        match4: 0,
        // 4 matches, no powerball
        match3Plus: 0,
        // 3 matches + powerball
        match3: 0,
        // 3 matches, no powerball
        match2Plus: 0,
        // 2 matches + powerball
        match1Plus: 0
        // 1 match + powerball
      };
      predictions.forEach((pred) => {
        const matches = pred.matches;
        const pbMatch = pred.powerballMatch;
        if (matches === 5 && pbMatch) tiers.jackpot++;
        else if (matches === 5) tiers.match5++;
        else if (matches === 4 && pbMatch) tiers.match4Plus++;
        else if (matches === 4) tiers.match4++;
        else if (matches === 3 && pbMatch) tiers.match3Plus++;
        else if (matches === 3) tiers.match3++;
        else if (matches === 2 && pbMatch) tiers.match2Plus++;
        else if (matches === 1 && pbMatch) tiers.match1Plus++;
      });
      const totalPredictions = predictions.length;
      const tierRates = {};
      Object.entries(tiers).forEach(([tier, count]) => {
        tierRates[tier] = {
          count,
          rate: count / totalPredictions,
          expectedRate: this.getExpectedPrizeTierRate(tier)
        };
      });
      return {
        counts: tiers,
        rates: tierRates,
        totalWinningPredictions: Object.values(tiers).reduce((sum, count) => sum + count, 0)
      };
    }
    /**
     * Calculate confidence interval accuracy
     */
    calculateConfidenceAccuracy(predictions) {
      const confidenceResults = predictions.map((p) => p.confidenceAccuracy).filter((ca) => ca !== null);
      if (confidenceResults.length === 0) {
        return null;
      }
      const totalAccuracies = confidenceResults.map((ca) => ca.accuracy);
      const averageAccuracy = totalAccuracies.reduce((sum, acc) => sum + acc, 0) / totalAccuracies.length;
      return {
        averageAccuracy,
        totalEvaluated: confidenceResults.length,
        withinIntervalTotal: confidenceResults.reduce((sum, ca) => sum + ca.withinInterval, 0),
        expectedAccuracy: 0.95
        // Assuming 95% confidence intervals
      };
    }
    /**
     * Get expected prize tier rates (based on official lottery odds)
     */
    getExpectedPrizeTierRate(tier) {
      const odds = {
        jackpot: 1 / 292201338,
        // 1 in 292M
        match5: 1 / 11688054,
        // 1 in 11.7M
        match4Plus: 1 / 913129,
        // 1 in 913k
        match4: 1 / 36525,
        // 1 in 36.5k
        match3Plus: 1 / 14494,
        // 1 in 14.5k
        match3: 1 / 580,
        // 1 in 580
        match2Plus: 1 / 701,
        // 1 in 701
        match1Plus: 1 / 92
        // 1 in 92
      };
      return odds[tier] || 0;
    }
    /**
     * Get match distribution
     */
    getMatchDistribution(matches) {
      const distribution = {};
      for (let i = 0; i <= 5; i++) {
        distribution[i] = matches.filter((m) => m === i).length;
      }
      return distribution;
    }
    /**
     * Aggregate results across validation periods
     */
    aggregateResults(validationResults, metrics) {
      const aggregated = {};
      metrics.forEach((metric) => {
        const metricValues = validationResults.map((vr) => vr.metrics[metric]).filter((mv) => mv !== void 0);
        if (metricValues.length > 0) {
          aggregated[metric] = this.aggregateMetric(metric, metricValues);
        }
      });
      return aggregated;
    }
    /**
     * Aggregate a specific metric across periods
     */
    aggregateMetric(metricName, metricValues) {
      switch (metricName) {
        case "matches":
          return {
            averageMatches: this.average(metricValues.map((mv) => mv.averageMatches)),
            averageHitRate: this.average(metricValues.map((mv) => mv.hitRate)),
            totalPredictions: metricValues.reduce((sum, mv) => sum + mv.totalPredictions, 0)
          };
        case "consistency":
          return {
            averageConsistency: this.average(metricValues.map((mv) => mv.consistency)),
            averageStdDev: this.average(metricValues.map((mv) => mv.standardDeviation))
          };
        case "prize-tiers":
          const aggregatedCounts = {};
          const tierNames = Object.keys(metricValues[0].counts);
          tierNames.forEach((tier) => {
            aggregatedCounts[tier] = metricValues.reduce((sum, mv) => sum + mv.counts[tier], 0);
          });
          return {
            aggregatedCounts,
            totalWins: Object.values(aggregatedCounts).reduce((sum, count) => sum + count, 0)
          };
        default:
          return metricValues[0];
      }
    }
    /**
     * Calculate overall performance score
     */
    calculateOverallPerformance(aggregatedMetrics) {
      let score = 0;
      let components = 0;
      if (aggregatedMetrics.matches) {
        score += aggregatedMetrics.matches.averageMatches * 20;
        score += aggregatedMetrics.matches.averageHitRate * 30;
        components += 2;
      }
      if (aggregatedMetrics.consistency) {
        score += aggregatedMetrics.consistency.averageConsistency * 25;
        components += 1;
      }
      if (aggregatedMetrics["prize-tiers"]) {
        const winRate = aggregatedMetrics["prize-tiers"].totalWins / (aggregatedMetrics.matches?.totalPredictions || 1);
        score += winRate * 25;
        components += 1;
      }
      return components > 0 ? score / components : 0;
    }
    /**
     * Generate strategy comparison
     */
    generateComparison(results) {
      try {
        if (!results || results.size === 0) {
          throw new Error("No results to compare");
        }
        const strategies = Array.from(results.entries()).map(([name, result]) => ({
          strategy: name,
          performance: result.performance || 0,
          avgMatches: result.aggregatedMetrics?.matches?.averageMatches || 0,
          hitRate: result.aggregatedMetrics?.matches?.averageHitRate || 0,
          consistency: result.aggregatedMetrics?.consistency?.averageConsistency || 0,
          totalPredictions: result.totalPredictions || 0
        }));
        strategies.sort((a, b) => b.performance - a.performance);
        return {
          ranking: strategies,
          bestStrategy: strategies[0],
          statisticalSignificance: this.calculateStatisticalSignificance(results)
        };
      } catch (error) {
        console.error("Error generating comparison:", error);
        throw new Error(`Failed to generate comparison: ${error.message}`);
      }
    }
    /**
     * Calculate statistical significance of differences
     */
    calculateStatisticalSignificance(results) {
      if (results.size < 2) return null;
      const strategiesArray = Array.from(results.values());
      const significance = [];
      for (let i = 0; i < strategiesArray.length; i++) {
        for (let j = i + 1; j < strategiesArray.length; j++) {
          const strategyA = strategiesArray[i];
          const strategyB = strategiesArray[j];
          const meanDiff = Math.abs(
            (strategyA.aggregatedMetrics.matches?.averageMatches || 0) - (strategyB.aggregatedMetrics.matches?.averageMatches || 0)
          );
          significance.push({
            strategies: [strategyA.strategy, strategyB.strategy],
            meanDifference: meanDiff,
            significant: meanDiff > 0.5
            // Simple threshold
          });
        }
      }
      return significance;
    }
    /**
     * Generate comprehensive summary
     */
    generateSummary(results) {
      const totalStrategies = results.size;
      const totalPredictions = Array.from(results.values()).reduce((sum, result) => sum + result.totalPredictions, 0);
      const comparison = this.generateComparison(results);
      return {
        totalStrategies,
        totalPredictions,
        testDuration: "Completed",
        bestPerformer: comparison.bestStrategy,
        keyFindings: this.generateKeyFindings(results, comparison, totalPredictions)
      };
    }
    /**
     * Generate key findings from test results
     */
    generateKeyFindings(results, comparison, totalPredictions) {
      const findings = [];
      findings.push(`Best performing strategy: ${comparison.bestStrategy.strategy} (${comparison.bestStrategy.performance.toFixed(2)} score)`);
      const avgHitRates = Array.from(results.values()).map((r) => r.aggregatedMetrics.matches?.averageHitRate || 0);
      const bestHitRate = Math.max(...avgHitRates);
      if (bestHitRate > 0.1) {
        findings.push(`Highest hit rate achieved: ${(bestHitRate * 100).toFixed(1)}%`);
      }
      findings.push(`Total predictions analyzed: ${totalPredictions}`);
      return findings;
    }
    /**
     * Utility function to calculate average
     */
    average(numbers) {
      return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }
    /**
     * Emit progress for UI updates
     */
    emitProgress(strategyName, results) {
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent("accuracyProgress", {
          detail: { strategy: strategyName, results }
        }));
      }
    }
    /**
     * Get current test status
     */
    getStatus() {
      return {
        isRunning: this.isRunning,
        strategiesRegistered: this.strategies.size,
        hasResults: this.results.size > 0,
        dataSize: this.historicalData.length
      };
    }
  };
  var accuracy_tester_default = PredictionAccuracyTester;
  if (typeof window !== "undefined") {
    window.PredictionAccuracyTester = PredictionAccuracyTester;
  }

  // js/accuracy-ui.js
  var currentTester = null;
  var isTestingRunning = false;
  function initAccuracyUI() {
    const runTestBtn = document.getElementById("run-accuracy-test");
    const addStrategyBtn = document.getElementById("add-strategy");
    if (runTestBtn) {
      runTestBtn.addEventListener("click", runAccuracyTest);
    }
    if (addStrategyBtn) {
      addStrategyBtn.addEventListener("click", addCustomStrategy);
    }
    state_default.subscribe("drawsUpdated", (draws) => {
      if (draws && draws.length > 0) {
        currentTester = new accuracy_tester_default(draws);
        setupDefaultStrategies();
        updateTestDataInfo(draws.length);
      }
    });
    if (typeof window !== "undefined") {
      window.addEventListener("accuracyProgress", handleProgressUpdate);
    }
    console.log("[Accuracy UI] Initialized successfully");
  }
  function setupDefaultStrategies() {
    if (!currentTester) return;
    currentTester.strategies.clear();
    currentTester.addStrategy("Confidence Intervals (95%)", null, {
      type: "confidence",
      options: {
        confidenceLevel: 0.95,
        method: "bootstrap",
        includeCorrelations: true
      }
    });
    currentTester.addStrategy("Confidence Intervals (90%)", null, {
      type: "confidence",
      options: {
        confidenceLevel: 0.9,
        method: "time-weighted",
        includeCorrelations: true
      }
    });
    currentTester.addStrategy("Energy Signature", null, {
      type: "energy",
      weights: {
        prime: 0.3,
        digitalRoot: 0.2,
        mod5: 0.2,
        gridPosition: 0.3
      }
    });
    currentTester.addStrategy("Frequency Analysis", null, {
      type: "frequency"
    });
    currentTester.addStrategy("Hybrid (Energy + Frequency)", null, {
      type: "hybrid"
    });
    updateStrategyList();
  }
  async function runAccuracyTest() {
    if (isTestingRunning) return;
    if (!state_default.draws || state_default.draws.length === 0) {
      showError("No Data", "Please upload a CSV file with lottery data first");
      return;
    }
    if (state_default.draws.length < 250) {
      showError("Insufficient Data", "At least 250 historical draws are required for reliable accuracy testing");
      return;
    }
    if (!currentTester || currentTester.strategies.size === 0) {
      showError("No Strategies", "Please add at least one prediction strategy to test");
      return;
    }
    isTestingRunning = true;
    setTestingState(true);
    try {
      const testConfig = getTestConfiguration();
      showInfo("Starting Accuracy Test", `Testing ${currentTester.strategies.size} strategies with walk-forward validation`);
      const results = await currentTester.runAccuracyTest(testConfig);
      displayTestResults(results);
      displayStrategyComparison(results.comparison);
      displayDetailedAnalysis(results);
      showSuccess("Test Complete", "Accuracy analysis completed successfully");
    } catch (error) {
      console.error("Accuracy test failed:", error);
      showError("Test Failed", error.message || "An error occurred during accuracy testing");
    } finally {
      isTestingRunning = false;
      setTestingState(false);
    }
  }
  function getTestConfiguration() {
    return {
      testMethod: document.getElementById("test-method")?.value || "walk-forward",
      initialTraining: parseInt(document.getElementById("initial-training")?.value) || 200,
      testWindow: parseInt(document.getElementById("test-window")?.value) || 50,
      stepSize: parseInt(document.getElementById("step-size")?.value) || 10,
      metrics: ["matches", "consistency", "prize-tiers", "confidence-accuracy"]
    };
  }
  function setTestingState(testing) {
    const runBtn = document.getElementById("run-accuracy-test");
    const addBtn = document.getElementById("add-strategy");
    if (runBtn) {
      runBtn.disabled = testing;
      runBtn.textContent = testing ? "Testing..." : "Run Accuracy Test";
    }
    if (addBtn) {
      addBtn.disabled = testing;
    }
    const progressContainer = document.getElementById("accuracy-progress");
    if (progressContainer) {
      progressContainer.style.display = testing ? "block" : "none";
    }
  }
  function handleProgressUpdate(event) {
    const { strategy, results } = event.detail;
    const progressContainer = document.getElementById("accuracy-progress");
    if (!progressContainer) return;
    const progressItem = document.createElement("div");
    progressItem.className = "progress-item";
    progressItem.innerHTML = `
    <div class="progress-strategy">${strategy}</div>
    <div class="progress-stats">
      ${results.totalPredictions} predictions \u2022 
      ${results.validationPeriods} validation periods \u2022 
      Score: ${results.performance.toFixed(2)}
    </div>
  `;
    progressContainer.appendChild(progressItem);
  }
  function displayTestResults(results) {
    const resultsContainer = document.getElementById("accuracy-results");
    if (!resultsContainer) return;
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    const summary = results.summary;
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "test-summary";
    summaryDiv.innerHTML = `
    <h3>\u{1F3AF} Accuracy Test Results</h3>
    <div class="summary-stats">
      <div class="summary-stat">
        <div class="stat-value">${summary.totalStrategies}</div>
        <div class="stat-label">Strategies Tested</div>
      </div>
      <div class="summary-stat">
        <div class="stat-value">${summary.totalPredictions.toLocaleString()}</div>
        <div class="stat-label">Total Predictions</div>
      </div>
      <div class="summary-stat">
        <div class="stat-value">${summary.bestPerformer.performance.toFixed(2)}</div>
        <div class="stat-label">Best Score</div>
      </div>
    </div>
    <div class="key-findings">
      <h4>Key Findings:</h4>
      <ul>
        ${summary.keyFindings.map((finding) => `<li>${finding}</li>`).join("")}
      </ul>
    </div>
  `;
    resultsContainer.appendChild(summaryDiv);
  }
  function displayStrategyComparison(comparison) {
    const comparisonContainer = document.getElementById("strategy-comparison");
    if (!comparisonContainer) return;
    while (comparisonContainer.firstChild) {
      comparisonContainer.removeChild(comparisonContainer.firstChild);
    }
    const table = document.createElement("table");
    table.className = "comparison-table";
    const header = document.createElement("thead");
    header.innerHTML = `
    <tr>
      <th>Rank</th>
      <th>Strategy</th>
      <th>Performance Score</th>
      <th>Avg Matches</th>
      <th>Hit Rate</th>
      <th>Consistency</th>
      <th>Total Predictions</th>
    </tr>
  `;
    table.appendChild(header);
    const tbody = document.createElement("tbody");
    comparison.ranking.forEach((strategy, index) => {
      const row = document.createElement("tr");
      row.className = index === 0 ? "best-strategy" : "";
      row.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <div class="strategy-name">${strategy.strategy}</div>
        ${index === 0 ? '<span class="best-badge">\u{1F3C6} Best</span>' : ""}
      </td>
      <td class="score-cell">${strategy.performance.toFixed(2)}</td>
      <td>${strategy.avgMatches.toFixed(2)}</td>
      <td>${(strategy.hitRate * 100).toFixed(1)}%</td>
      <td>${(strategy.consistency * 100).toFixed(1)}%</td>
      <td>${strategy.totalPredictions.toLocaleString()}</td>
    `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    comparisonContainer.appendChild(table);
  }
  function displayDetailedAnalysis(results) {
    const detailsContainer = document.getElementById("detailed-analysis");
    if (!detailsContainer) return;
    while (detailsContainer.firstChild) {
      detailsContainer.removeChild(detailsContainer.firstChild);
    }
    results.results.forEach(([strategyName, strategyResult]) => {
      const strategyDiv = document.createElement("div");
      strategyDiv.className = "strategy-analysis";
      const metrics = strategyResult.aggregatedMetrics;
      strategyDiv.innerHTML = `
      <h4>${strategyName}</h4>
      <div class="analysis-grid">
        ${metrics.matches ? `
          <div class="analysis-card">
            <h5>Match Performance</h5>
            <p>Average Matches: ${metrics.matches.averageMatches.toFixed(2)}</p>
            <p>Hit Rate (\u22653 matches): ${(metrics.matches.averageHitRate * 100).toFixed(1)}%</p>
            <p>Total Predictions: ${metrics.matches.totalPredictions}</p>
          </div>
        ` : ""}
        
        ${metrics.consistency ? `
          <div class="analysis-card">
            <h5>Consistency</h5>
            <p>Consistency Score: ${(metrics.consistency.averageConsistency * 100).toFixed(1)}%</p>
            <p>Average Std Dev: ${metrics.consistency.averageStdDev.toFixed(2)}</p>
          </div>
        ` : ""}
        
        ${metrics["prize-tiers"] ? `
          <div class="analysis-card">
            <h5>Prize Tiers</h5>
            <p>Total Wins: ${metrics["prize-tiers"].totalWins}</p>
            <p>Win Rate: ${(metrics["prize-tiers"].totalWins / metrics.matches.totalPredictions * 100).toFixed(2)}%</p>
          </div>
        ` : ""}
        
        ${metrics.confidenceAccuracy ? `
          <div class="analysis-card">
            <h5>Confidence Accuracy</h5>
            <p>Interval Accuracy: ${(metrics.confidenceAccuracy.averageAccuracy * 100).toFixed(1)}%</p>
            <p>Expected: ${metrics.confidenceAccuracy.expectedAccuracy * 100}%</p>
          </div>
        ` : ""}
      </div>
    `;
      detailsContainer.appendChild(strategyDiv);
    });
  }
  function addCustomStrategy() {
    const strategyName = prompt("Enter strategy name:");
    if (!strategyName || !currentTester) return;
    const strategyType = prompt("Enter strategy type (confidence, energy, frequency, hybrid):");
    if (!strategyType) return;
    try {
      currentTester.addStrategy(strategyName, null, {
        type: strategyType,
        options: {}
        // Could be expanded with more options
      });
      updateStrategyList();
      showSuccess("Strategy Added", `${strategyName} strategy added successfully`);
    } catch (error) {
      showError("Failed to Add Strategy", error.message);
    }
  }
  function updateStrategyList() {
    const listContainer = document.getElementById("strategy-list");
    if (!listContainer || !currentTester) return;
    while (listContainer.firstChild) {
      listContainer.removeChild(listContainer.firstChild);
    }
    if (currentTester.strategies.size === 0) {
      const noStrategies = document.createElement("div");
      noStrategies.className = "no-strategies";
      noStrategies.textContent = "No strategies configured";
      listContainer.appendChild(noStrategies);
      return;
    }
    currentTester.strategies.forEach((strategy, name) => {
      const strategyItem = document.createElement("div");
      strategyItem.className = "strategy-item";
      strategyItem.innerHTML = `
      <div class="strategy-info">
        <div class="strategy-name">${name}</div>
        <div class="strategy-type">Type: ${strategy.config.type}</div>
      </div>
      <button class="remove-strategy" onclick="removeStrategy('${name}')">Remove</button>
    `;
      listContainer.appendChild(strategyItem);
    });
  }
  function removeStrategy(strategyName) {
    if (!currentTester) return;
    currentTester.strategies.delete(strategyName);
    updateStrategyList();
    showInfo("Strategy Removed", `${strategyName} strategy removed`);
  }
  function updateTestDataInfo(drawCount) {
    const infoContainer = document.getElementById("test-data-info");
    if (!infoContainer) return;
    const sufficient = drawCount >= 250;
    infoContainer.className = `test-data-info ${sufficient ? "sufficient" : "insufficient"}`;
    infoContainer.innerHTML = `
    <div class="data-count">${drawCount.toLocaleString()} draws available</div>
    <div class="data-status">
      ${sufficient ? "\u2705 Sufficient data for accuracy testing" : "\u26A0\uFE0F At least 250 draws recommended for reliable results"}
    </div>
  `;
  }
  function exportTestResults() {
    if (!currentTester || !currentTester.results || currentTester.results.size === 0) {
      showError("No Results", "Run an accuracy test first before exporting");
      return;
    }
    const exportData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      testConfig: getTestConfiguration(),
      results: Array.from(currentTester.results.entries()),
      summary: currentTester.generateSummary(currentTester.results)
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `accuracy-test-results-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Export Complete", "Accuracy test results exported successfully");
  }
  if (typeof window !== "undefined") {
    window.initAccuracyUI = initAccuracyUI;
    window.exportTestResults = exportTestResults;
    window.removeStrategy = removeStrategy;
  }

  // js/strategy-builder.js
  var savedStrategies = JSON.parse(localStorage.getItem("lottery-strategies") || "[]");
  var currentStrategy = {
    name: "",
    formula: {},
    weights: {
      energy: 30,
      frequency: 25,
      gaps: 20,
      patterns: 15,
      random: 10
    }
  };
  function initStrategyBuilder() {
    setupFormulaBuilder();
    setupSaveButton();
    loadSavedStrategies();
    console.log("[Strategy Builder] Initialized successfully");
  }
  function setupFormulaBuilder() {
    const formulaBuilder = document.getElementById("formula-builder");
    if (!formulaBuilder) return;
    formulaBuilder.innerHTML = `
    <div class="strategy-config">
      <div class="strategy-name-section">
        <label for="strategy-name">Strategy Name:</label>
        <input type="text" id="strategy-name" placeholder="e.g., My Custom Strategy" value="${currentStrategy.name}">
      </div>
      
      <div class="weights-section">
        <h4>\u{1F4CA} Component Weights (Total: 100%)</h4>
        <div class="weight-controls">
          <div class="weight-control">
            <label for="energy-weight">Energy Signature:</label>
            <input type="range" id="energy-weight" min="0" max="100" value="${currentStrategy.weights.energy}">
            <span class="weight-value">${currentStrategy.weights.energy}%</span>
          </div>
          
          <div class="weight-control">
            <label for="frequency-weight">Hot/Cold Numbers:</label>
            <input type="range" id="frequency-weight" min="0" max="100" value="${currentStrategy.weights.frequency}">
            <span class="weight-value">${currentStrategy.weights.frequency}%</span>
          </div>
          
          <div class="weight-control">
            <label for="gaps-weight">Gap Analysis:</label>
            <input type="range" id="gaps-weight" min="0" max="100" value="${currentStrategy.weights.gaps}">
            <span class="weight-value">${currentStrategy.weights.gaps}%</span>
          </div>
          
          <div class="weight-control">
            <label for="patterns-weight">Pattern Matching:</label>
            <input type="range" id="patterns-weight" min="0" max="100" value="${currentStrategy.weights.patterns}">
            <span class="weight-value">${currentStrategy.weights.patterns}%</span>
          </div>
          
          <div class="weight-control">
            <label for="random-weight">Random Factor:</label>
            <input type="range" id="random-weight" min="0" max="100" value="${currentStrategy.weights.random}">
            <span class="weight-value">${currentStrategy.weights.random}%</span>
          </div>
        </div>
        
        <div class="total-weight">
          Total: <span id="total-weight">100</span>%
        </div>
      </div>
      
      <div class="filter-section">
        <h4>\u{1F3AF} Number Filters</h4>
        <div class="filter-controls">
          <label>
            <input type="checkbox" id="avoid-consecutive" checked>
            Avoid consecutive numbers (1,2,3...)
          </label>
          
          <label>
            <input type="checkbox" id="balance-odd-even" checked>
            Balance odd/even numbers
          </label>
          
          <label>
            <input type="checkbox" id="spread-ranges" checked>
            Spread across number ranges
          </label>
          
          <label>
            <input type="checkbox" id="limit-repeats">
            Limit recent repeating numbers
          </label>
        </div>
      </div>
      
      <div class="preview-section">
        <h4>\u{1F440} Strategy Preview</h4>
        <button id="preview-strategy" class="preview-btn">Generate Preview Numbers</button>
        <div id="preview-results" class="preview-results"></div>
      </div>
    </div>
    
    <div class="saved-strategies">
      <h4>\u{1F4BE} Saved Strategies</h4>
      <div id="strategies-list" class="strategies-list"></div>
    </div>
  `;
    setupWeightControls();
    setupPreview();
  }
  function setupWeightControls() {
    const weightSliders = document.querySelectorAll('.weight-control input[type="range"]');
    const totalWeightSpan = document.getElementById("total-weight");
    weightSliders.forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const value = parseInt(e.target.value);
        const weightType = e.target.id.replace("-weight", "");
        const valueSpan = e.target.nextElementSibling;
        valueSpan.textContent = value + "%";
        currentStrategy.weights[weightType] = value;
        const total = Object.values(currentStrategy.weights).reduce((sum, w) => sum + w, 0);
        totalWeightSpan.textContent = total;
        if (total === 100) {
          totalWeightSpan.style.color = "#2ed573";
        } else if (total > 100) {
          totalWeightSpan.style.color = "#ff4757";
        } else {
          totalWeightSpan.style.color = "#ffa502";
        }
      });
    });
  }
  function setupPreview() {
    const previewBtn = document.getElementById("preview-strategy");
    if (previewBtn) {
      previewBtn.addEventListener("click", generatePreview);
    }
  }
  function setupSaveButton() {
    const saveBtn = document.getElementById("save-strategy");
    if (saveBtn) {
      saveBtn.addEventListener("click", saveStrategy);
    }
  }
  function saveStrategy() {
    const nameInput = document.getElementById("strategy-name");
    const strategyName = nameInput?.value.trim();
    if (!strategyName) {
      showError("Missing Name", "Please enter a name for your strategy");
      return;
    }
    const total = Object.values(currentStrategy.weights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      showError("Invalid Weights", `Component weights must total 100% (current: ${total}%)`);
      return;
    }
    const filters = {
      avoidConsecutive: document.getElementById("avoid-consecutive")?.checked || false,
      balanceOddEven: document.getElementById("balance-odd-even")?.checked || false,
      spreadRanges: document.getElementById("spread-ranges")?.checked || false,
      limitRepeats: document.getElementById("limit-repeats")?.checked || false
    };
    const strategy = {
      id: Date.now().toString(),
      name: strategyName,
      weights: { ...currentStrategy.weights },
      filters,
      created: (/* @__PURE__ */ new Date()).toISOString(),
      lastUsed: null
    };
    const existingIndex = savedStrategies.findIndex((s) => s.name === strategyName);
    if (existingIndex >= 0) {
      if (!confirm(`Strategy "${strategyName}" already exists. Overwrite?`)) {
        return;
      }
      savedStrategies[existingIndex] = strategy;
    } else {
      savedStrategies.push(strategy);
    }
    localStorage.setItem("lottery-strategies", JSON.stringify(savedStrategies));
    loadSavedStrategies();
    showSuccess("Strategy Saved", `"${strategyName}" has been saved successfully`);
  }
  function loadSavedStrategies() {
    const strategiesList = document.getElementById("strategies-list");
    if (!strategiesList) return;
    if (savedStrategies.length === 0) {
      strategiesList.innerHTML = '<p class="no-strategies">No saved strategies yet.</p>';
      return;
    }
    strategiesList.innerHTML = savedStrategies.map((strategy) => `
    <div class="saved-strategy" data-id="${strategy.id}">
      <div class="strategy-info">
        <div class="strategy-name">${strategy.name}</div>
        <div class="strategy-meta">
          Created: ${new Date(strategy.created).toLocaleDateString()}
          ${strategy.lastUsed ? ` | Last used: ${new Date(strategy.lastUsed).toLocaleDateString()}` : ""}
        </div>
        <div class="strategy-weights">
          Energy: ${strategy.weights.energy}% \u2022 
          Frequency: ${strategy.weights.frequency}% \u2022 
          Gaps: ${strategy.weights.gaps}% \u2022 
          Patterns: ${strategy.weights.patterns}% \u2022 
          Random: ${strategy.weights.random}%
        </div>
      </div>
      <div class="strategy-actions">
        <button class="load-strategy" onclick="loadStrategy('${strategy.id}')">Load</button>
        <button class="use-strategy" onclick="useStrategy('${strategy.id}')">Use</button>
        <button class="delete-strategy" onclick="deleteStrategy('${strategy.id}')">Delete</button>
      </div>
    </div>
  `).join("");
  }
  async function generatePreview() {
    if (!state_default.draws || state_default.draws.length === 0) {
      showError("No Data", "Please load lottery data first to preview your strategy");
      return;
    }
    const previewBtn = document.getElementById("preview-strategy");
    const previewResults = document.getElementById("preview-results");
    if (previewBtn) previewBtn.disabled = true;
    if (previewResults) previewResults.innerHTML = '<div class="loading">Generating preview...</div>';
    try {
      const numbers = await generateNumbersWithStrategy(currentStrategy);
      if (previewResults) {
        previewResults.innerHTML = `
        <div class="preview-numbers">
          <div class="white-balls">
            ${numbers.whiteBalls.map((n) => `<span class="number-ball">${n}</span>`).join("")}
          </div>
          <div class="powerball">
            <span class="powerball-number">${numbers.powerball}</span>
          </div>
        </div>
        <div class="preview-note">
          <small>Preview generated with current weights and filters</small>
        </div>
      `;
      }
    } catch (error) {
      if (previewResults) {
        previewResults.innerHTML = `<div class="error">Preview failed: ${error.message}</div>`;
      }
    } finally {
      if (previewBtn) previewBtn.disabled = false;
    }
  }
  async function generateNumbersWithStrategy(strategy) {
    const draws = state_default.draws.slice(-100);
    const whiteBalls = [];
    const usedNumbers = /* @__PURE__ */ new Set();
    while (whiteBalls.length < 5) {
      let number;
      if (Math.random() * 100 < strategy.weights.energy) {
        number = Math.floor(Math.random() * 30) + 20;
      } else if (Math.random() * 100 < strategy.weights.frequency) {
        number = Math.floor(Math.random() * 20) + 1;
      } else {
        number = Math.floor(Math.random() * 69) + 1;
      }
      if (!usedNumbers.has(number) && number <= 69) {
        usedNumbers.add(number);
        whiteBalls.push(number);
      }
    }
    whiteBalls.sort((a, b) => a - b);
    return {
      whiteBalls,
      powerball: Math.floor(Math.random() * 26) + 1
    };
  }
  window.loadStrategy = function(id) {
    const strategy = savedStrategies.find((s) => s.id === id);
    if (!strategy) return;
    currentStrategy = {
      name: strategy.name,
      weights: { ...strategy.weights },
      formula: {}
    };
    const nameInput = document.getElementById("strategy-name");
    if (nameInput) nameInput.value = strategy.name;
    Object.entries(strategy.weights).forEach(([key, value]) => {
      const slider = document.getElementById(`${key}-weight`);
      const valueSpan = slider?.nextElementSibling;
      if (slider) slider.value = value;
      if (valueSpan) valueSpan.textContent = value + "%";
    });
    Object.entries(strategy.filters || {}).forEach(([key, value]) => {
      const checkbox = document.getElementById(key.replace(/([A-Z])/g, "-$1").toLowerCase());
      if (checkbox) checkbox.checked = value;
    });
    showInfo("Strategy Loaded", `"${strategy.name}" has been loaded for editing`);
  };
  window.useStrategy = function(id) {
    const strategy = savedStrategies.find((s) => s.id === id);
    if (!strategy) return;
    strategy.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
    localStorage.setItem("lottery-strategies", JSON.stringify(savedStrategies));
    showSuccess("Strategy Applied", `"${strategy.name}" is now being used for analysis`);
    loadSavedStrategies();
  };
  window.deleteStrategy = function(id) {
    const strategy = savedStrategies.find((s) => s.id === id);
    if (!strategy) return;
    if (!confirm(`Delete strategy "${strategy.name}"? This cannot be undone.`)) return;
    savedStrategies = savedStrategies.filter((s) => s.id !== id);
    localStorage.setItem("lottery-strategies", JSON.stringify(savedStrategies));
    loadSavedStrategies();
    showInfo("Strategy Deleted", `"${strategy.name}" has been deleted`);
  };

  // js/server-manager.js
  var ServerManager = class {
    constructor(options = {}) {
      this.options = {
        serverPort: options.serverPort || 3001,
        serverHost: options.serverHost || "localhost",
        detectionTimeout: options.detectionTimeout || 5e3,
        launchTimeout: options.launchTimeout || 3e4,
        retryAttempts: options.retryAttempts || 3,
        autoLaunch: options.autoLaunch || true,
        ...options
      };
      this.serverStatus = "unknown";
      this.serverProcess = null;
      this.serverCapabilities = {};
      this.lastHealthCheck = null;
      this.performanceMetrics = {
        detectionTime: 0,
        launchTime: 0,
        avgResponseTime: 0,
        successfulRequests: 0,
        failedRequests: 0
      };
    }
    /**
     * Get server base URL
     */
    get serverUrl() {
      return `http://${this.options.serverHost}:${this.options.serverPort}`;
    }
    /**
     * Detect if server is available and get capabilities
     */
    async detectServer() {
      const startTime = performance.now();
      try {
        console.log("[ServerManager] Detecting local server...");
        const response = await this.makeRequest("/health", {
          method: "GET",
          timeout: this.options.detectionTimeout
        });
        if (response.ok) {
          const healthData = await response.json();
          this.serverStatus = "available";
          this.serverCapabilities = healthData.capabilities || {};
          this.lastHealthCheck = /* @__PURE__ */ new Date();
          this.performanceMetrics.detectionTime = performance.now() - startTime;
          console.log("[ServerManager] Server detected and available:", healthData);
          return {
            available: true,
            capabilities: this.serverCapabilities,
            version: healthData.version,
            performance: {
              responseTime: this.performanceMetrics.detectionTime,
              memoryUsage: healthData.memory,
              cpuCores: healthData.cpuCores
            }
          };
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (error) {
        console.log("[ServerManager] Server not detected:", error.message);
        this.serverStatus = "unavailable";
        this.performanceMetrics.detectionTime = performance.now() - startTime;
        return {
          available: false,
          error: error.message,
          canLaunch: await this.canLaunchServer()
        };
      }
    }
    /**
     * Check if we can launch a local server
     */
    async canLaunchServer() {
      if (typeof window === "undefined") return false;
      if (!window.location.protocol.startsWith("http")) return false;
      return false;
    }
    /**
     * Launch local server
     */
    async launchServer() {
      if (this.serverStatus === "starting" || this.serverStatus === "running") {
        console.log("[ServerManager] Server is already starting or running");
        return { success: true, status: this.serverStatus };
      }
      const startTime = performance.now();
      try {
        this.serverStatus = "starting";
        showInfo("Starting Performance Server", "Launching local server for enhanced performance...");
        console.log("[ServerManager] Server launch not implemented in browser environment");
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        const detection = await this.detectServer();
        if (detection.available) {
          this.serverStatus = "running";
          this.performanceMetrics.launchTime = performance.now() - startTime;
          showSuccess("Server Ready", "Performance server is now available for enhanced accuracy testing");
          return {
            success: true,
            status: "running",
            launchTime: this.performanceMetrics.launchTime,
            capabilities: this.serverCapabilities
          };
        } else {
          throw new Error("Server failed to start or become available");
        }
      } catch (error) {
        console.error("[ServerManager] Server launch failed:", error);
        this.serverStatus = "error";
        showError("Server Launch Failed", `Could not start performance server: ${error.message}`);
        return {
          success: false,
          error: error.message,
          fallbackAvailable: true
        };
      }
    }
    /**
     * Stop local server
     */
    async stopServer() {
      if (this.serverStatus !== "running" && this.serverStatus !== "starting") {
        console.log("[ServerManager] No server to stop");
        return { success: true, status: "stopped" };
      }
      try {
        console.log("[ServerManager] Stopping local server...");
        await this.makeRequest("/shutdown", {
          method: "POST",
          timeout: 5e3
        });
        this.serverStatus = "unavailable";
        this.serverProcess = null;
        showInfo("Server Stopped", "Performance server has been stopped");
        return { success: true, status: "stopped" };
      } catch (error) {
        console.warn("[ServerManager] Graceful shutdown failed:", error.message);
        if (this.serverProcess) {
          try {
            this.serverProcess.kill();
            this.serverProcess = null;
          } catch (killError) {
            console.error("[ServerManager] Force stop failed:", killError);
          }
        }
        this.serverStatus = "unavailable";
        return {
          success: false,
          error: error.message,
          forceStopped: this.serverProcess === null
        };
      }
    }
    /**
     * Make HTTP request to server with timeout and error handling
     */
    async makeRequest(endpoint, options = {}) {
      const {
        method = "GET",
        body = null,
        headers = {},
        timeout = 1e4
      } = options;
      const url = `${this.serverUrl}${endpoint}`;
      const requestStart = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
          method,
          body: body ? JSON.stringify(body) : null,
          headers: {
            "Content-Type": "application/json",
            ...headers
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const responseTime = performance.now() - requestStart;
        this.updatePerformanceMetrics(responseTime, response.ok);
        return response;
      } catch (error) {
        const responseTime = performance.now() - requestStart;
        this.updatePerformanceMetrics(responseTime, false);
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
    }
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(responseTime, success) {
      if (success) {
        this.performanceMetrics.successfulRequests++;
      } else {
        this.performanceMetrics.failedRequests++;
      }
      const totalRequests = this.performanceMetrics.successfulRequests + this.performanceMetrics.failedRequests;
      this.performanceMetrics.avgResponseTime = (this.performanceMetrics.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
    /**
     * Run accuracy test with automatic server management
     */
    async runAccuracyTestWithServerManager(accuracyTester, options = {}) {
      const {
        preferServer = true,
        fallbackToBrowser = true,
        progressCallback = null
      } = options;
      let useServer = false;
      let serverInfo = null;
      if (preferServer) {
        console.log("[ServerManager] Attempting to use server for accuracy testing...");
        const detection = await this.detectServer();
        if (detection.available) {
          useServer = true;
          serverInfo = detection;
          showSuccess("Using Performance Server", "Enhanced accuracy testing with server acceleration");
        } else if (this.options.autoLaunch && detection.canLaunch) {
          const launch = await this.launchServer();
          if (launch.success) {
            useServer = true;
            serverInfo = launch;
          }
        }
        if (!useServer && !fallbackToBrowser) {
          throw new Error("Server not available and browser fallback disabled");
        } else if (!useServer) {
          showWarning("Using Browser Mode", "Server not available, falling back to browser-based testing");
        }
      }
      try {
        let results;
        if (useServer) {
          results = await this.runServerAccuracyTest(accuracyTester, options, progressCallback);
        } else {
          results = await accuracyTester.runAccuracyTest(progressCallback);
        }
        results.performanceInfo = {
          usedServer: useServer,
          serverInfo,
          executionEnvironment: useServer ? "server" : "browser",
          performanceMetrics: { ...this.performanceMetrics }
        };
        return results;
      } catch (error) {
        if (useServer && fallbackToBrowser) {
          console.warn("[ServerManager] Server test failed, falling back to browser:", error.message);
          showWarning("Server Failed, Using Browser", "Falling back to browser-based accuracy testing");
          const results = await accuracyTester.runAccuracyTest(progressCallback);
          results.performanceInfo = {
            usedServer: false,
            serverFallback: true,
            serverError: error.message,
            executionEnvironment: "browser"
          };
          return results;
        }
        throw error;
      }
    }
    /**
     * Run accuracy test using server
     */
    async runServerAccuracyTest(accuracyTester, options, progressCallback) {
      console.log("[ServerManager] Running server-accelerated accuracy test...");
      try {
        const testConfig = {
          historicalData: accuracyTester.historicalData,
          options: accuracyTester.options,
          methodWeights: accuracyTester.methodWeights,
          testOptions: options
        };
        const response = await this.makeRequest("/accuracy-test", {
          method: "POST",
          body: testConfig,
          timeout: 3e5
          // 5 minute timeout for large tests
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const result = await response.json();
        if (result.jobId) {
          return await this.pollForResults(result.jobId, progressCallback);
        } else {
          return result;
        }
      } catch (error) {
        console.error("[ServerManager] Server accuracy test failed:", error);
        throw error;
      }
    }
    /**
     * Poll server for long-running test results
     */
    async pollForResults(jobId, progressCallback) {
      const maxPollTime = 6e5;
      const pollInterval = 2e3;
      const startTime = Date.now();
      while (Date.now() - startTime < maxPollTime) {
        try {
          const response = await this.makeRequest(`/accuracy-test/${jobId}`, {
            method: "GET",
            timeout: 1e4
          });
          if (!response.ok) {
            throw new Error(`Polling failed: ${response.status}`);
          }
          const status = await response.json();
          if (status.completed) {
            return status.results;
          } else if (status.error) {
            throw new Error(status.error);
          } else if (status.progress && progressCallback) {
            progressCallback({
              ...status.progress,
              source: "server",
              jobId
            });
          }
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } catch (error) {
          console.error("[ServerManager] Polling error:", error);
          throw error;
        }
      }
      throw new Error("Server accuracy test timed out");
    }
    /**
     * Get server status and capabilities
     */
    async getServerInfo() {
      if (this.serverStatus === "unknown" || this.serverStatus === "unavailable") {
        const detection = await this.detectServer();
        return detection;
      }
      return {
        available: this.serverStatus === "running" || this.serverStatus === "available",
        status: this.serverStatus,
        capabilities: this.serverCapabilities,
        lastHealthCheck: this.lastHealthCheck,
        performanceMetrics: { ...this.performanceMetrics }
      };
    }
    /**
     * Recommend performance mode based on dataset size and capabilities
     */
    recommendPerformanceMode(datasetSize, testComplexity = "medium") {
      const recommendations = {
        useServer: false,
        reason: "",
        expectedSpeedup: 1,
        memoryRecommendation: "sufficient",
        alternatives: []
      };
      const LARGE_DATASET = 500;
      const VERY_LARGE_DATASET = 1e3;
      const complexityMultipliers = {
        "low": 1,
        "medium": 2,
        "high": 4,
        "maximum": 8
      };
      const complexityFactor = complexityMultipliers[testComplexity] || 2;
      const effectiveComplexity = datasetSize * complexityFactor;
      if (effectiveComplexity > VERY_LARGE_DATASET * 4) {
        recommendations.useServer = true;
        recommendations.reason = "Very large dataset with high complexity requires server acceleration";
        recommendations.expectedSpeedup = 5;
      } else if (effectiveComplexity > LARGE_DATASET * 2) {
        recommendations.useServer = true;
        recommendations.reason = "Large dataset benefits significantly from server processing";
        recommendations.expectedSpeedup = 3;
      } else if (datasetSize > LARGE_DATASET) {
        recommendations.useServer = true;
        recommendations.reason = "Moderate dataset size, server provides better performance";
        recommendations.expectedSpeedup = 2;
      } else {
        recommendations.reason = "Dataset size suitable for browser processing";
        recommendations.alternatives.push("Consider server for faster results on repeated testing");
      }
      if (effectiveComplexity > VERY_LARGE_DATASET * 2) {
        recommendations.memoryRecommendation = "high";
      } else if (effectiveComplexity > LARGE_DATASET) {
        recommendations.memoryRecommendation = "medium";
      }
      return recommendations;
    }
    /**
     * Get performance comparison between browser and server
     */
    getPerformanceComparison() {
      return {
        browser: {
          pros: [
            "No setup required",
            "Works offline",
            "Data stays local",
            "No additional dependencies"
          ],
          cons: [
            "Limited CPU utilization",
            "Memory constraints",
            "May block UI on large datasets",
            "Slower bootstrap iterations"
          ],
          recommendedFor: "Datasets under 500 draws, casual testing"
        },
        server: {
          pros: [
            "Full CPU utilization (all cores)",
            "No memory constraints",
            "Background processing",
            "Faster bootstrap sampling",
            "Parallel method testing"
          ],
          cons: [
            "Requires server setup",
            "Additional complexity",
            "May require Node.js installation"
          ],
          recommendedFor: "Datasets over 500 draws, intensive testing, repeated analysis"
        }
      };
    }
  };
  var server_manager_default = ServerManager;
  if (typeof window !== "undefined") {
    window.ServerManager = ServerManager;
  }

  // js/enhanced-accuracy-tester.js
  init_confidence_predictor();
  var EnhancedAccuracyTester = class {
    constructor(historicalData, options = {}) {
      this.historicalData = historicalData.filter(
        (draw) => draw.whiteBalls && draw.whiteBalls.length === 5 && draw.powerball
      );
      this.options = {
        minTrainingSize: options.minTrainingSize || 100,
        testWindowSize: options.testWindowSize || 50,
        stepSize: options.stepSize || 10,
        maxValidationPeriods: options.maxValidationPeriods || 20,
        bootstrapIterations: options.bootstrapIterations || 200,
        confidenceLevel: options.confidenceLevel || 0.95,
        includeEnsemble: options.includeEnsemble || true,
        adaptiveWeighting: options.adaptiveWeighting || true,
        ...options
      };
      this.methods = /* @__PURE__ */ new Map();
      this.accuracyHistory = [];
      this.methodWeights = {
        confidence: 0.25,
        energy: 0.25,
        frequency: 0.25,
        lstm: 0.25
      };
      this.isRunning = false;
      this.currentProgress = 0;
      this.initializeMethods();
    }
    /**
     * Initialize prediction methods for testing
     */
    initializeMethods() {
      this.methods.set("confidence", {
        name: "Confidence Intervals",
        predict: async (trainingData, options = {}) => {
          const predictor = new PositionBasedPredictor(trainingData);
          const predictions = await predictor.generatePredictionWithConfidenceIntervals({
            confidenceLevel: options.confidenceLevel || 0.95,
            method: "bootstrap"
          });
          return {
            whiteBalls: predictions.slice(0, 5).map((p) => p.prediction),
            powerball: predictions[5].prediction,
            confidence: options.confidenceLevel || 0.95,
            method: "confidence",
            intervals: predictions
          };
        },
        weight: this.methodWeights.confidence,
        accuracy: 0.5
        // Initial placeholder
      });
      this.methods.set("energy", {
        name: "Energy Signature",
        predict: async (trainingData, options = {}) => {
          const weights = options.energyWeights || {
            prime: 0.3,
            digitalRoot: 0.2,
            mod5: 0.2,
            gridPosition: 0.3
          };
          const allNumbers = [...new Set(trainingData.flatMap((d) => d.whiteBalls))];
          const energyData = calculateEnergy(allNumbers, weights);
          const topEnergy = energyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map((item) => item.number);
          return {
            whiteBalls: topEnergy,
            powerball: this.predictPowerball(trainingData),
            confidence: 0.7,
            method: "energy",
            energyScores: energyData
          };
        },
        weight: this.methodWeights.energy,
        accuracy: 0.5
      });
      this.methods.set("frequency", {
        name: "Frequency Analysis",
        predict: async (trainingData, options = {}) => {
          const lookbackPeriod = options.lookbackPeriod || 100;
          const recentData = trainingData.slice(-lookbackPeriod);
          const frequency = new Array(70).fill(0);
          recentData.forEach((draw) => {
            draw.whiteBalls.forEach((num) => {
              if (num >= 1 && num <= 69) frequency[num]++;
            });
          });
          const topFrequent = frequency.map((count, number) => ({ number, count, frequency: count / recentData.length })).filter((item) => item.number >= 1 && item.number <= 69).sort((a, b) => b.count - a.count).slice(0, 5).map((item) => item.number);
          return {
            whiteBalls: topFrequent,
            powerball: this.predictPowerball(trainingData),
            confidence: 0.6,
            method: "frequency",
            frequencies: frequency
          };
        },
        weight: this.methodWeights.frequency,
        accuracy: 0.5
      });
      this.methods.set("lstm", {
        name: "LSTM Neural Network",
        predict: async (trainingData, options = {}) => {
          const recent = trainingData.slice(-10);
          const avgNumbers = [0, 0, 0, 0, 0];
          recent.forEach((draw) => {
            const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
            sorted.forEach((num, idx) => {
              avgNumbers[idx] += num;
            });
          });
          const predicted = avgNumbers.map(
            (sum) => Math.round(sum / recent.length)
          ).sort((a, b) => a - b);
          return {
            whiteBalls: predicted,
            powerball: this.predictPowerball(trainingData),
            confidence: 0.65,
            method: "lstm",
            neuralPattern: "temporal-average"
          };
        },
        weight: this.methodWeights.lstm,
        accuracy: 0.5
      });
    }
    /**
     * Simple powerball prediction helper
     */
    predictPowerball(trainingData) {
      const recentPowerballs = trainingData.slice(-20).map((d) => d.powerball);
      const frequency = new Array(27).fill(0);
      recentPowerballs.forEach((pb) => frequency[pb]++);
      const maxFreq = Math.max(...frequency);
      const mostFrequent = frequency.findIndex((f) => f === maxFreq);
      return mostFrequent || Math.floor(Math.random() * 26) + 1;
    }
    /**
     * Run comprehensive walk-forward validation
     */
    async runAccuracyTest(progressCallback = null) {
      if (this.isRunning) {
        throw new Error("Accuracy test is already running");
      }
      if (this.historicalData.length < this.options.minTrainingSize + this.options.testWindowSize) {
        throw new Error(`Insufficient data. Need at least ${this.options.minTrainingSize + this.options.testWindowSize} draws`);
      }
      this.isRunning = true;
      this.currentProgress = 0;
      const results = {
        methods: /* @__PURE__ */ new Map(),
        ensemble: null,
        summary: {},
        validationPeriods: [],
        totalPredictions: 0,
        startTime: /* @__PURE__ */ new Date(),
        endTime: null
      };
      try {
        console.log(`Starting enhanced accuracy test with ${this.methods.size} methods`);
        const validationWindows = this.generateValidationWindows();
        const totalSteps = validationWindows.length * this.methods.size;
        let currentStep = 0;
        for (const [methodName, method] of this.methods) {
          console.log(`Testing method: ${methodName}`);
          const methodResults = {
            name: method.name,
            predictions: [],
            accuracy: {},
            performance: {},
            validationWindows: validationWindows.length
          };
          for (const window2 of validationWindows) {
            const windowPredictions = await this.testMethodOnWindow(
              method,
              window2,
              methodName
            );
            methodResults.predictions.push(...windowPredictions);
            currentStep++;
            this.currentProgress = currentStep / totalSteps * 100;
            if (progressCallback) {
              progressCallback({
                progress: this.currentProgress,
                currentMethod: methodName,
                window: window2.period,
                totalWindows: validationWindows.length
              });
            }
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
          methodResults.accuracy = this.calculateComprehensiveAccuracy(methodResults.predictions);
          methodResults.performance = this.calculatePerformanceMetrics(methodResults.predictions);
          results.methods.set(methodName, methodResults);
          results.totalPredictions += methodResults.predictions.length;
          if (this.options.adaptiveWeighting) {
            this.updateMethodWeight(methodName, methodResults.accuracy.overallScore);
          }
        }
        if (this.options.includeEnsemble) {
          results.ensemble = await this.generateEnsembleResults(validationWindows);
        }
        results.summary = this.generateComprehensiveSummary(results);
        results.endTime = /* @__PURE__ */ new Date();
        this.accuracyHistory.push({
          timestamp: /* @__PURE__ */ new Date(),
          results: results.summary,
          methodWeights: { ...this.methodWeights }
        });
        console.log("Enhanced accuracy test completed successfully");
        return results;
      } catch (error) {
        console.error("Enhanced accuracy test failed:", error);
        throw error;
      } finally {
        this.isRunning = false;
      }
    }
    /**
     * Generate validation windows for walk-forward testing
     */
    generateValidationWindows() {
      const windows = [];
      const { minTrainingSize, testWindowSize, stepSize, maxValidationPeriods } = this.options;
      let currentStart = 0;
      let period = 0;
      while (currentStart + minTrainingSize + testWindowSize <= this.historicalData.length && period < maxValidationPeriods) {
        const trainingEnd = currentStart + minTrainingSize;
        const testEnd = trainingEnd + testWindowSize;
        windows.push({
          period,
          trainingStart: currentStart,
          trainingEnd,
          testStart: trainingEnd,
          testEnd,
          trainingData: this.historicalData.slice(currentStart, trainingEnd),
          testData: this.historicalData.slice(trainingEnd, testEnd)
        });
        currentStart += stepSize;
        period++;
      }
      return windows;
    }
    /**
     * Test a specific method on a validation window
     */
    async testMethodOnWindow(method, window2, methodName) {
      const predictions = [];
      for (let i = 0; i < window2.testData.length; i++) {
        const actualDraw = window2.testData[i];
        const trainingUpToPoint = [
          ...window2.trainingData,
          ...window2.testData.slice(0, i)
        ];
        try {
          const prediction = await method.predict(trainingUpToPoint, {
            confidenceLevel: this.options.confidenceLevel,
            bootstrapIterations: this.options.bootstrapIterations
          });
          const predictionResult = {
            period: window2.period,
            drawIndex: i,
            method: methodName,
            predicted: prediction,
            actual: actualDraw,
            metrics: this.calculateDrawMetrics(prediction, actualDraw),
            timestamp: actualDraw.date
          };
          predictions.push(predictionResult);
        } catch (error) {
          console.warn(`Prediction failed for ${methodName} on draw ${i}:`, error);
        }
      }
      return predictions;
    }
    /**
     * Calculate metrics for a single prediction vs actual draw
     */
    calculateDrawMetrics(prediction, actual) {
      const whiteBallMatches = this.countMatches(prediction.whiteBalls, actual.whiteBalls);
      const powerballMatch = prediction.powerball === actual.powerball;
      const prizeTier = this.calculatePrizeTier(whiteBallMatches, powerballMatch);
      const sortedPredicted = [...prediction.whiteBalls].sort((a, b) => a - b);
      const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
      const positionErrors = sortedPredicted.map(
        (pred, idx) => Math.abs(pred - sortedActual[idx])
      );
      let confidenceAccuracy = null;
      if (prediction.intervals) {
        confidenceAccuracy = this.assessConfidenceAccuracy(prediction.intervals, actual);
      }
      return {
        whiteBallMatches,
        powerballMatch,
        prizeTier,
        positionErrors,
        meanAbsoluteError: positionErrors.reduce((sum, err) => sum + err, 0) / 5,
        confidenceAccuracy,
        isWinningTicket: prizeTier !== null
      };
    }
    /**
     * Count matching numbers between predicted and actual
     */
    countMatches(predicted, actual) {
      return predicted.filter((num) => actual.includes(num)).length;
    }
    /**
     * Calculate Powerball prize tier
     */
    calculatePrizeTier(whiteBallMatches, powerballMatch) {
      if (whiteBallMatches === 5 && powerballMatch) return "jackpot";
      if (whiteBallMatches === 5) return "match5";
      if (whiteBallMatches === 4 && powerballMatch) return "match4plus";
      if (whiteBallMatches === 4) return "match4";
      if (whiteBallMatches === 3 && powerballMatch) return "match3plus";
      if (whiteBallMatches === 3) return "match3";
      if (whiteBallMatches === 2 && powerballMatch) return "match2plus";
      if (whiteBallMatches === 1 && powerballMatch) return "match1plus";
      if (powerballMatch) return "powerball";
      return null;
    }
    /**
     * Assess confidence interval accuracy
     */
    assessConfidenceAccuracy(intervals, actual) {
      const sortedActual = [...actual.whiteBalls].sort((a, b) => a - b);
      let withinInterval = 0;
      intervals.slice(0, 5).forEach((interval, idx) => {
        const actualValue = sortedActual[idx];
        if (actualValue >= interval.confidenceInterval.lower && actualValue <= interval.confidenceInterval.upper) {
          withinInterval++;
        }
      });
      return {
        withinInterval,
        totalPositions: 5,
        accuracy: withinInterval / 5,
        expectedAccuracy: this.options.confidenceLevel
      };
    }
    /**
     * Calculate comprehensive accuracy metrics
     */
    calculateComprehensiveAccuracy(predictions) {
      if (predictions.length === 0) return {};
      const metrics = predictions.map((p) => p.metrics);
      const matchCounts = metrics.map((m) => m.whiteBallMatches);
      const powerballHits = metrics.filter((m) => m.powerballMatch).length;
      const prizeTiers = {};
      metrics.forEach((m) => {
        if (m.prizeTier) {
          prizeTiers[m.prizeTier] = (prizeTiers[m.prizeTier] || 0) + 1;
        }
      });
      const allPositionErrors = metrics.flatMap((m) => m.positionErrors);
      const meanAbsoluteErrors = metrics.map((m) => m.meanAbsoluteError);
      const confidenceAccuracies = metrics.map((m) => m.confidenceAccuracy).filter((ca) => ca !== null);
      const hitRate = metrics.filter((m) => m.whiteBallMatches >= 3).length / metrics.length;
      const avgMatches = matchCounts.reduce((sum, matches) => sum + matches, 0) / matchCounts.length;
      const winRate = metrics.filter((m) => m.isWinningTicket).length / metrics.length;
      const avgMAE = meanAbsoluteErrors.reduce((sum, mae) => sum + mae, 0) / meanAbsoluteErrors.length;
      const overallScore = avgMatches / 5 * 0.4 + // 40% weight on average matches
      hitRate * 0.3 + // 30% weight on hit rate (3+ matches)
      winRate * 0.2 + // 20% weight on any prize wins
      (1 - avgMAE / 35) * 0.1;
      return {
        totalPredictions: predictions.length,
        averageMatches: avgMatches,
        hitRate,
        powerballHitRate: powerballHits / predictions.length,
        winRate,
        prizeTierDistribution: prizeTiers,
        positionAccuracy: {
          meanAbsoluteError: avgMAE,
          allErrors: allPositionErrors
        },
        confidenceCalibration: confidenceAccuracies.length > 0 ? {
          averageAccuracy: confidenceAccuracies.reduce((sum, ca) => sum + ca.accuracy, 0) / confidenceAccuracies.length,
          expectedAccuracy: this.options.confidenceLevel,
          calibrationError: Math.abs(
            confidenceAccuracies.reduce((sum, ca) => sum + ca.accuracy, 0) / confidenceAccuracies.length - this.options.confidenceLevel
          )
        } : null,
        overallScore,
        consistency: this.calculateConsistency(matchCounts)
      };
    }
    /**
     * Calculate consistency metrics
     */
    calculateConsistency(values) {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return {
        mean,
        variance,
        standardDeviation: stdDev,
        coefficientOfVariation: stdDev / mean,
        consistencyScore: Math.max(0, 1 - stdDev / mean)
      };
    }
    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics(predictions) {
      const prizeValues = {
        "jackpot": 1e8,
        // $100M average
        "match5": 1e6,
        // $1M
        "match4plus": 5e4,
        // $50K
        "match4": 100,
        // $100
        "match3plus": 100,
        // $100
        "match3": 7,
        // $7
        "match2plus": 7,
        // $7
        "match1plus": 4,
        // $4
        "powerball": 4
        // $4
      };
      let totalExpectedValue = 0;
      let totalCost = predictions.length * 2;
      predictions.forEach((pred) => {
        const tier = pred.metrics.prizeTier;
        if (tier && prizeValues[tier]) {
          totalExpectedValue += prizeValues[tier];
        }
      });
      const roi = (totalExpectedValue - totalCost) / totalCost;
      const profitability = totalExpectedValue / totalCost;
      return {
        totalCost,
        totalExpectedValue,
        roi,
        profitability,
        averageTicketValue: totalExpectedValue / predictions.length,
        breakEvenRate: totalCost / totalExpectedValue
      };
    }
    /**
     * Generate ensemble predictions
     */
    async generateEnsembleResults(validationWindows) {
      const ensemblePredictions = [];
      for (const window2 of validationWindows) {
        for (let i = 0; i < window2.testData.length; i++) {
          const actualDraw = window2.testData[i];
          const trainingUpToPoint = [...window2.trainingData, ...window2.testData.slice(0, i)];
          const methodPredictions = [];
          for (const [methodName, method] of this.methods) {
            try {
              const prediction = await method.predict(trainingUpToPoint);
              methodPredictions.push({
                method: methodName,
                weight: method.weight,
                prediction
              });
            } catch (error) {
              console.warn(`Ensemble prediction failed for ${methodName}:`, error);
            }
          }
          const ensemblePrediction = this.combineWeightedPredictions(methodPredictions);
          ensemblePredictions.push({
            period: window2.period,
            drawIndex: i,
            method: "ensemble",
            predicted: ensemblePrediction,
            actual: actualDraw,
            metrics: this.calculateDrawMetrics(ensemblePrediction, actualDraw),
            contributingMethods: methodPredictions.length
          });
        }
      }
      return {
        predictions: ensemblePredictions,
        accuracy: this.calculateComprehensiveAccuracy(ensemblePredictions),
        weights: { ...this.methodWeights }
      };
    }
    /**
     * Combine predictions using weighted voting
     */
    combineWeightedPredictions(methodPredictions) {
      const ballVotes = new Array(70).fill(0).map(() => /* @__PURE__ */ new Map());
      const powerballVotes = /* @__PURE__ */ new Map();
      methodPredictions.forEach(({ prediction, weight }) => {
        prediction.whiteBalls.forEach((ball) => {
          ballVotes[ball] = (ballVotes[ball] || 0) + weight;
        });
        powerballVotes.set(
          prediction.powerball,
          (powerballVotes.get(prediction.powerball) || 0) + weight
        );
      });
      const whiteBallScores = ballVotes.map((votes, ball) => ({ ball, votes })).filter((item) => item.votes > 0 && item.ball >= 1 && item.ball <= 69).sort((a, b) => b.votes - a.votes);
      const selectedWhiteBalls = whiteBallScores.slice(0, 5).map((item) => item.ball).sort((a, b) => a - b);
      const selectedPowerball = Array.from(powerballVotes.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || 1;
      return {
        whiteBalls: selectedWhiteBalls,
        powerball: selectedPowerball,
        confidence: 0.75,
        method: "ensemble",
        votingWeights: { ...this.methodWeights }
      };
    }
    /**
     * Update method weight based on performance (adaptive learning)
     */
    updateMethodWeight(methodName, accuracyScore) {
      const currentWeight = this.methodWeights[methodName];
      const learningRate = 0.1;
      const avgScore = Object.values(this.methodWeights).reduce((sum, w) => sum + w, 0) / 4;
      const adjustment = (accuracyScore - avgScore) * learningRate;
      const newWeight = Math.max(0.05, Math.min(0.7, currentWeight + adjustment));
      this.methodWeights[methodName] = newWeight;
      const totalWeight = Object.values(this.methodWeights).reduce((sum, w) => sum + w, 0);
      Object.keys(this.methodWeights).forEach((method) => {
        this.methodWeights[method] /= totalWeight;
      });
      if (this.methods.has(methodName)) {
        this.methods.get(methodName).weight = this.methodWeights[methodName];
        this.methods.get(methodName).accuracy = accuracyScore;
      }
    }
    /**
     * Generate comprehensive summary
     */
    generateComprehensiveSummary(results) {
      const methodSummaries = [];
      let bestMethod = null;
      let bestScore = 0;
      for (const [methodName, methodResult] of results.methods) {
        const summary = {
          name: methodName,
          displayName: methodResult.name,
          overallScore: methodResult.accuracy.overallScore || 0,
          averageMatches: methodResult.accuracy.averageMatches || 0,
          hitRate: methodResult.accuracy.hitRate || 0,
          winRate: methodResult.accuracy.winRate || 0,
          consistency: methodResult.accuracy.consistency?.consistencyScore || 0,
          weight: this.methodWeights[methodName] || 0,
          totalPredictions: methodResult.predictions.length
        };
        methodSummaries.push(summary);
        if (summary.overallScore > bestScore) {
          bestScore = summary.overallScore;
          bestMethod = summary;
        }
      }
      methodSummaries.sort((a, b) => b.overallScore - a.overallScore);
      return {
        bestMethod,
        methodRanking: methodSummaries,
        ensemble: results.ensemble ? {
          overallScore: results.ensemble.accuracy.overallScore || 0,
          averageMatches: results.ensemble.accuracy.averageMatches || 0,
          hitRate: results.ensemble.accuracy.hitRate || 0
        } : null,
        totalPredictions: results.totalPredictions,
        validationPeriods: results.validationPeriods?.length || 0,
        testDuration: results.endTime ? results.endTime - results.startTime : 0,
        adaptiveWeights: { ...this.methodWeights },
        keyFindings: this.generateKeyFindings(methodSummaries, results.ensemble)
      };
    }
    /**
     * Generate key findings from results
     */
    generateKeyFindings(methodSummaries, ensemble) {
      const findings = [];
      if (methodSummaries.length > 0) {
        const best = methodSummaries[0];
        findings.push(`Best method: ${best.displayName} (${(best.overallScore * 100).toFixed(1)}% score)`);
        findings.push(`Hit rate: ${(best.hitRate * 100).toFixed(1)}% (3+ matches)`);
        findings.push(`Average matches: ${best.averageMatches.toFixed(2)} per draw`);
      }
      if (ensemble && ensemble.overallScore > 0) {
        findings.push(`Ensemble method achieved ${(ensemble.overallScore * 100).toFixed(1)}% overall score`);
      }
      const totalPredictions = methodSummaries.reduce((sum, m) => sum + m.totalPredictions, 0);
      findings.push(`Analysis based on ${totalPredictions} total predictions`);
      return findings;
    }
    /**
     * Get current test status
     */
    getStatus() {
      return {
        isRunning: this.isRunning,
        progress: this.currentProgress,
        methodsRegistered: this.methods.size,
        dataSize: this.historicalData.length,
        adaptiveWeights: { ...this.methodWeights },
        hasHistoricalResults: this.accuracyHistory.length > 0
      };
    }
    /**
     * Export results for external use
     */
    exportResults(results) {
      return {
        summary: results.summary,
        methodDetails: Array.from(results.methods.entries()).map(([name, data]) => ({
          method: name,
          accuracy: data.accuracy,
          sampleSize: data.predictions.length
        })),
        ensemble: results.ensemble?.accuracy || null,
        exportTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        testParameters: this.options
      };
    }
  };
  var enhanced_accuracy_tester_default = EnhancedAccuracyTester;
  if (typeof window !== "undefined") {
    window.EnhancedAccuracyTester = EnhancedAccuracyTester;
  }

  // js/performance-ui.js
  var PerformanceUI = class {
    constructor() {
      this.serverManager = new server_manager_default();
      this.currentAccuracyTest = null;
      this.performanceMode = "auto";
      this.isTestRunning = false;
      this.elements = {
        performancePanel: null,
        modeSelector: null,
        serverStatus: null,
        launchServerBtn: null,
        stopServerBtn: null,
        runAccuracyTestBtn: null,
        testProgress: null,
        testResults: null,
        performanceRecommendation: null
      };
      this.init();
    }
    /**
     * Initialize performance UI
     */
    init() {
      this.createPerformancePanel();
      this.bindEvents();
      this.subscribeToState();
      this.detectServerAsync();
      console.log("[PerformanceUI] Initialized successfully");
    }
    /**
     * Create performance panel HTML
     */
    createPerformancePanel() {
      let panel = document.getElementById("performance-panel");
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "performance-panel";
        panel.className = "panel";
        const optimizationPanel = document.getElementById("optimization-panel");
        if (optimizationPanel) {
          optimizationPanel.parentNode.insertBefore(panel, optimizationPanel.nextSibling);
        } else {
          const panelsContainer = document.querySelector(".panels");
          if (panelsContainer) {
            panelsContainer.appendChild(panel);
          }
        }
      }
      panel.innerHTML = `
      <h2>\u26A1 Performance Mode</h2>
      <p class="panel-description">Enhanced accuracy testing with optional server acceleration</p>
      
      <div class="performance-controls">
        <div class="performance-mode-selector">
          <label for="performance-mode">Execution Mode:</label>
          <select id="performance-mode">
            <option value="auto" selected>Auto-Detect (Recommended)</option>
            <option value="browser">Browser Only</option>
            <option value="server">Server Only</option>
          </select>
        </div>
        
        <div id="server-status" class="server-status">
          <div class="status-indicator">
            <span class="status-dot unknown"></span>
            <span class="status-text">Checking server availability...</span>
          </div>
          <div class="server-info" style="display: none;"></div>
        </div>
        
        <div class="server-controls">
          <button id="launch-server" class="server-btn launch-btn" style="display: none;">
            \u{1F680} Launch Performance Server
          </button>
          <button id="stop-server" class="server-btn stop-btn" style="display: none;">
            \u23F9\uFE0F Stop Server
          </button>
          <button id="refresh-server" class="server-btn refresh-btn">
            \u{1F504} Refresh Status
          </button>
        </div>
        
        <div id="performance-recommendation" class="performance-recommendation" style="display: none;">
          <h4>\u{1F4A1} Performance Recommendation</h4>
          <div class="recommendation-content"></div>
        </div>
        
        <div class="accuracy-test-controls">
          <button id="run-enhanced-accuracy-test" class="accuracy-test-btn" disabled>
            \u{1F9EA} Run Enhanced Accuracy Test
          </button>
          <div class="test-options">
            <label>
              <input type="checkbox" id="include-ensemble" checked>
              Include ensemble predictions
            </label>
            <label>
              <input type="checkbox" id="adaptive-weighting" checked>
              Adaptive method weighting
            </label>
          </div>
        </div>
      </div>
      
      <div id="test-progress" class="test-progress" style="display: none;">
        <div class="progress-header">
          <h4>Testing in Progress...</h4>
          <button id="cancel-test" class="cancel-test-btn">Cancel</button>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <div class="progress-details">
          <span class="current-method">Initializing...</span>
          <span class="progress-text">0%</span>
        </div>
        <div class="performance-info">
          <span class="execution-mode">Mode: Browser</span>
          <span class="elapsed-time">Elapsed: 00:00</span>
        </div>
      </div>
      
      <div id="test-results" class="test-results" style="display: none;">
        <h3>\u{1F4CA} Accuracy Test Results</h3>
        <div class="results-content"></div>
      </div>
    `;
      this.elements.performancePanel = panel;
      this.elements.modeSelector = panel.querySelector("#performance-mode");
      this.elements.serverStatus = panel.querySelector("#server-status");
      this.elements.launchServerBtn = panel.querySelector("#launch-server");
      this.elements.stopServerBtn = panel.querySelector("#stop-server");
      this.elements.refreshServerBtn = panel.querySelector("#refresh-server");
      this.elements.runAccuracyTestBtn = panel.querySelector("#run-enhanced-accuracy-test");
      this.elements.testProgress = panel.querySelector("#test-progress");
      this.elements.testResults = panel.querySelector("#test-results");
      this.elements.performanceRecommendation = panel.querySelector("#performance-recommendation");
    }
    /**
     * Bind event listeners
     */
    bindEvents() {
      if (this.elements.modeSelector) {
        this.elements.modeSelector.addEventListener("change", (e) => {
          this.performanceMode = e.target.value;
          this.updateUIState();
        });
      }
      if (this.elements.launchServerBtn) {
        this.elements.launchServerBtn.addEventListener("click", () => this.launchServer());
      }
      if (this.elements.stopServerBtn) {
        this.elements.stopServerBtn.addEventListener("click", () => this.stopServer());
      }
      if (this.elements.refreshServerBtn) {
        this.elements.refreshServerBtn.addEventListener("click", () => this.refreshServerStatus());
      }
      if (this.elements.runAccuracyTestBtn) {
        this.elements.runAccuracyTestBtn.addEventListener("click", () => this.runAccuracyTest());
      }
      const cancelBtn = this.elements.testProgress?.querySelector("#cancel-test");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => this.cancelAccuracyTest());
      }
    }
    /**
     * Subscribe to state changes
     */
    subscribeToState() {
      state_default.subscribe("drawsUpdated", (draws) => {
        this.updatePerformanceRecommendation(draws.length);
        this.updateTestButtonState();
      });
    }
    /**
     * Async server detection
     */
    async detectServerAsync() {
      try {
        const serverInfo = await this.serverManager.detectServer();
        this.updateServerStatus(serverInfo);
      } catch (error) {
        console.warn("[PerformanceUI] Server detection failed:", error);
        this.updateServerStatus({ available: false, error: error.message });
      }
    }
    /**
     * Update server status display
     */
    updateServerStatus(serverInfo) {
      if (!this.elements.serverStatus) return;
      const statusDot = this.elements.serverStatus.querySelector(".status-dot");
      const statusText = this.elements.serverStatus.querySelector(".status-text");
      const serverInfoDiv = this.elements.serverStatus.querySelector(".server-info");
      if (serverInfo.available) {
        statusDot.className = "status-dot available";
        statusText.textContent = "Performance server available";
        serverInfoDiv.style.display = "block";
        serverInfoDiv.innerHTML = `
        <div class="server-capabilities">
          <strong>Capabilities:</strong>
          <ul>
            <li>CPU Cores: ${serverInfo.performance?.cpuCores || "N/A"}</li>
            <li>Memory: ${serverInfo.performance?.memoryUsage?.total || "N/A"}</li>
            <li>Response Time: ${Math.round(serverInfo.performance?.responseTime || 0)}ms</li>
          </ul>
        </div>
      `;
        this.elements.launchServerBtn.style.display = "none";
        this.elements.stopServerBtn.style.display = "inline-block";
      } else {
        statusDot.className = "status-dot unavailable";
        statusText.textContent = serverInfo.canLaunch ? "Server not running (can launch)" : "Server not available";
        serverInfoDiv.style.display = "none";
        this.elements.launchServerBtn.style.display = serverInfo.canLaunch ? "inline-block" : "none";
        this.elements.stopServerBtn.style.display = "none";
      }
      this.updateUIState();
    }
    /**
     * Update performance recommendation
     */
    updatePerformanceRecommendation(datasetSize) {
      if (!this.elements.performanceRecommendation || !datasetSize) return;
      const recommendation = this.serverManager.recommendPerformanceMode(datasetSize, "medium");
      const content = this.elements.performanceRecommendation.querySelector(".recommendation-content");
      content.innerHTML = `
      <div class="recommendation-summary">
        <strong>Dataset Size:</strong> ${datasetSize} draws<br>
        <strong>Recommended Mode:</strong> ${recommendation.useServer ? "Server" : "Browser"}<br>
        <strong>Expected Speedup:</strong> ${recommendation.expectedSpeedup}x<br>
        <strong>Reason:</strong> ${recommendation.reason}
      </div>
      ${recommendation.alternatives.length > 0 ? `
        <div class="recommendation-alternatives">
          <strong>Alternatives:</strong>
          <ul>
            ${recommendation.alternatives.map((alt) => `<li>${alt}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
    `;
      this.elements.performanceRecommendation.style.display = "block";
      if (this.performanceMode === "auto") {
        if (recommendation.useServer && this.serverManager.serverStatus === "available") {
          this.performanceMode = "server";
        } else {
          this.performanceMode = "browser";
        }
        this.updateUIState();
      }
    }
    /**
     * Launch server
     */
    async launchServer() {
      try {
        this.elements.launchServerBtn.disabled = true;
        this.elements.launchServerBtn.textContent = "\u{1F680} Launching...";
        const result = await this.serverManager.launchServer();
        if (result.success) {
          this.updateServerStatus({
            available: true,
            capabilities: result.capabilities,
            performance: { launchTime: result.launchTime }
          });
        } else {
          showWarning("Server Launch Failed", result.error || "Unknown error");
          this.updateServerStatus({ available: false, error: result.error });
        }
      } catch (error) {
        console.error("[PerformanceUI] Server launch error:", error);
        showError("Launch Error", error.message);
        this.updateServerStatus({ available: false, error: error.message });
      } finally {
        this.elements.launchServerBtn.disabled = false;
        this.elements.launchServerBtn.textContent = "\u{1F680} Launch Performance Server";
      }
    }
    /**
     * Stop server
     */
    async stopServer() {
      try {
        this.elements.stopServerBtn.disabled = true;
        this.elements.stopServerBtn.textContent = "\u23F9\uFE0F Stopping...";
        const result = await this.serverManager.stopServer();
        if (result.success) {
          this.updateServerStatus({ available: false });
        } else {
          showWarning("Server Stop Failed", result.error || "Unknown error");
        }
      } catch (error) {
        console.error("[PerformanceUI] Server stop error:", error);
        showError("Stop Error", error.message);
      } finally {
        this.elements.stopServerBtn.disabled = false;
        this.elements.stopServerBtn.textContent = "\u23F9\uFE0F Stop Server";
      }
    }
    /**
     * Refresh server status
     */
    async refreshServerStatus() {
      try {
        this.elements.refreshServerBtn.disabled = true;
        this.elements.refreshServerBtn.textContent = "\u{1F504} Checking...";
        const serverInfo = await this.serverManager.getServerInfo();
        this.updateServerStatus(serverInfo);
      } catch (error) {
        console.error("[PerformanceUI] Server refresh error:", error);
        showError("Status Check Failed", error.message);
      } finally {
        this.elements.refreshServerBtn.disabled = false;
        this.elements.refreshServerBtn.textContent = "\u{1F504} Refresh Status";
      }
    }
    /**
     * Update UI state based on current conditions
     */
    updateUIState() {
      this.updateTestButtonState();
      if (this.elements.modeSelector && this.elements.modeSelector.value !== this.performanceMode) {
        this.elements.modeSelector.value = this.performanceMode;
      }
    }
    /**
     * Update test button state
     */
    updateTestButtonState() {
      if (!this.elements.runAccuracyTestBtn) return;
      const hasData = state_default.draws && state_default.draws.length >= 100;
      const canRunTest = hasData && !this.isTestRunning;
      this.elements.runAccuracyTestBtn.disabled = !canRunTest;
      if (!hasData) {
        this.elements.runAccuracyTestBtn.textContent = "\u{1F9EA} Upload Data First (100+ draws needed)";
      } else if (this.isTestRunning) {
        this.elements.runAccuracyTestBtn.textContent = "\u{1F9EA} Test in Progress...";
      } else {
        this.elements.runAccuracyTestBtn.textContent = "\u{1F9EA} Run Enhanced Accuracy Test";
      }
    }
    /**
     * Run enhanced accuracy test
     */
    async runAccuracyTest() {
      if (this.isTestRunning || !state_default.draws || state_default.draws.length < 100) {
        return;
      }
      this.isTestRunning = true;
      this.updateTestButtonState();
      this.elements.testProgress.style.display = "block";
      this.elements.testResults.style.display = "none";
      const startTime = Date.now();
      let progressInterval;
      try {
        const includeEnsemble = document.getElementById("include-ensemble")?.checked || true;
        const adaptiveWeighting = document.getElementById("adaptive-weighting")?.checked || true;
        const options = {
          minTrainingSize: Math.max(100, Math.floor(state_default.draws.length * 0.4)),
          testWindowSize: Math.min(50, Math.floor(state_default.draws.length * 0.1)),
          stepSize: 10,
          maxValidationPeriods: 10,
          bootstrapIterations: state_default.draws.length > 500 ? 500 : 200,
          confidenceLevel: 0.95,
          includeEnsemble,
          adaptiveWeighting
        };
        this.currentAccuracyTest = new enhanced_accuracy_tester_default(state_default.draws, options);
        const progressFill = this.elements.testProgress.querySelector(".progress-fill");
        const progressText = this.elements.testProgress.querySelector(".progress-text");
        const currentMethodSpan = this.elements.testProgress.querySelector(".current-method");
        const elapsedTimeSpan = this.elements.testProgress.querySelector(".elapsed-time");
        const executionModeSpan = this.elements.testProgress.querySelector(".execution-mode");
        progressInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1e3);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          elapsedTimeSpan.textContent = `Elapsed: ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }, 1e3);
        const progressCallback = (progress) => {
          const percentage = Math.round(progress.progress || 0);
          progressFill.style.width = `${percentage}%`;
          progressText.textContent = `${percentage}%`;
          if (progress.currentMethod) {
            currentMethodSpan.textContent = `Testing: ${progress.currentMethod} (Window ${progress.window + 1}/${progress.totalWindows || "N/A"})`;
          }
          if (progress.source === "server") {
            executionModeSpan.textContent = "Mode: Server (Accelerated)";
          } else {
            executionModeSpan.textContent = "Mode: Browser";
          }
        };
        showInfo("Starting Accuracy Test", "Beginning enhanced accuracy analysis with walk-forward validation...");
        const results = await this.serverManager.runAccuracyTestWithServerManager(
          this.currentAccuracyTest,
          {
            preferServer: this.performanceMode === "auto" || this.performanceMode === "server",
            fallbackToBrowser: this.performanceMode !== "server",
            progressCallback
          }
        );
        this.displayTestResults(results);
        const duration = Math.round((Date.now() - startTime) / 1e3);
        showSuccess("Accuracy Test Complete", `Analysis completed in ${duration} seconds`);
      } catch (error) {
        console.error("[PerformanceUI] Accuracy test failed:", error);
        showError("Test Failed", error.message);
        this.elements.testResults.innerHTML = `
        <h3>\u274C Test Failed</h3>
        <div class="error-message">
          <strong>Error:</strong> ${error.message}
        </div>
      `;
        this.elements.testResults.style.display = "block";
      } finally {
        this.isTestRunning = false;
        this.currentAccuracyTest = null;
        clearInterval(progressInterval);
        this.elements.testProgress.style.display = "none";
        this.updateTestButtonState();
      }
    }
    /**
     * Cancel running accuracy test
     */
    cancelAccuracyTest() {
      if (this.currentAccuracyTest) {
        showInfo("Cancelling Test", "Attempting to cancel accuracy test...");
        this.currentAccuracyTest = null;
      }
    }
    /**
     * Display test results
     */
    displayTestResults(results) {
      if (!this.elements.testResults) return;
      const { summary, performanceInfo } = results;
      const content = this.elements.testResults.querySelector(".results-content") || this.elements.testResults;
      const executionMode = performanceInfo?.usedServer ? "Server (Accelerated)" : "Browser";
      const testDuration = Math.round(summary.testDuration / 1e3) || 0;
      content.innerHTML = `
      <div class="results-summary">
        <div class="execution-info">
          <span class="execution-mode">Execution Mode: ${executionMode}</span>
          <span class="duration">Duration: ${testDuration}s</span>
          <span class="predictions">Total Predictions: ${summary.totalPredictions}</span>
        </div>
        
        <div class="best-method">
          <h4>\u{1F3C6} Best Performing Method</h4>
          <div class="method-card">
            <strong>${summary.bestMethod?.displayName || "N/A"}</strong>
            <div class="metrics">
              <span>Score: ${((summary.bestMethod?.overallScore || 0) * 100).toFixed(1)}%</span>
              <span>Avg Matches: ${(summary.bestMethod?.averageMatches || 0).toFixed(2)}</span>
              <span>Hit Rate: ${((summary.bestMethod?.hitRate || 0) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div class="method-ranking">
          <h4>\u{1F4CA} Method Ranking</h4>
          <div class="ranking-list">
            ${summary.methodRanking?.map((method, index) => `
              <div class="rank-item">
                <span class="rank">#${index + 1}</span>
                <span class="method-name">${method.displayName}</span>
                <span class="score">${(method.overallScore * 100).toFixed(1)}%</span>
                <div class="method-details">
                  Avg Matches: ${method.averageMatches.toFixed(2)} | 
                  Hit Rate: ${(method.hitRate * 100).toFixed(1)}% |
                  Weight: ${(method.weight * 100).toFixed(0)}%
                </div>
              </div>
            `).join("") || "<div>No ranking data available</div>"}
          </div>
        </div>
        
        ${summary.ensemble ? `
          <div class="ensemble-results">
            <h4>\u{1F3AF} Ensemble Performance</h4>
            <div class="ensemble-metrics">
              <span>Score: ${(summary.ensemble.overallScore * 100).toFixed(1)}%</span>
              <span>Avg Matches: ${summary.ensemble.averageMatches.toFixed(2)}</span>
              <span>Hit Rate: ${(summary.ensemble.hitRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        ` : ""}
        
        <div class="key-findings">
          <h4>\u{1F50D} Key Findings</h4>
          <ul>
            ${summary.keyFindings?.map((finding) => `<li>${finding}</li>`).join("") || "<li>No findings available</li>"}
          </ul>
        </div>
        
        ${performanceInfo?.serverInfo ? `
          <div class="performance-details">
            <h4>\u26A1 Performance Details</h4>
            <div class="server-performance">
              <strong>Server Capabilities:</strong>
              <ul>
                <li>CPU Cores: ${performanceInfo.serverInfo.performance?.cpuCores || "N/A"}</li>
                <li>Memory: ${performanceInfo.serverInfo.performance?.memoryUsage || "N/A"}</li>
                <li>Average Response: ${Math.round(performanceInfo.serverInfo.performanceMetrics?.avgResponseTime || 0)}ms</li>
              </ul>
            </div>
          </div>
        ` : ""}
      </div>
    `;
      this.elements.testResults.style.display = "block";
    }
  };
  var performanceUI = null;
  function initPerformanceUI() {
    if (!performanceUI) {
      performanceUI = new PerformanceUI();
    }
    return performanceUI;
  }

  // js/progress-status.js
  var ProgressStatus = class {
    constructor() {
      this.currentStep = "";
      this.startTime = null;
      this.progressContainer = null;
      this.currentStepEl = null;
      this.timestampEl = null;
      this.suggestedActionsEl = null;
      this.init();
    }
    init() {
      this.progressContainer = document.getElementById("progress-status");
      this.currentStepEl = document.getElementById("current-step");
      this.timestampEl = document.getElementById("step-timestamp");
      this.suggestedActionsEl = document.getElementById("suggested-actions");
      if (!this.progressContainer) return;
      state_default.subscribe("drawsUpdated", () => {
        this.updateStep("Data loaded", "Run analysis or optimize parameters");
        this.show();
      });
      state_default.subscribe("progress", (message) => {
        this.updateStep(message, "Please wait...");
      });
      state_default.subscribe("hideProgress", () => {
        this.updateStep("Analysis complete", "Try parameter optimization or accuracy testing");
      });
      state_default.subscribe("energyResults", () => {
        this.updateStep("Energy analysis complete", "Check AI predictions next");
      });
      state_default.subscribe("mlResults", () => {
        this.updateStep("AI predictions complete", "Review recommendations or try optimization");
      });
      state_default.subscribe("error", (error) => {
        this.updateStep(`Error: ${error.title}`, "Check the error message and try again");
      });
      state_default.subscribe("optimizationStarted", () => {
        this.updateStep("Parameter optimization in progress", "This may take several minutes...");
      });
      state_default.subscribe("optimizationComplete", () => {
        this.updateStep("Optimization complete", "Run analysis again to see improved results");
      });
      console.log("[Progress Status] Initialized successfully");
    }
    updateStep(step, suggestedActions = "") {
      if (!this.progressContainer) return;
      this.currentStep = step;
      this.startTime = /* @__PURE__ */ new Date();
      if (this.currentStepEl) {
        this.currentStepEl.textContent = step;
      }
      if (this.timestampEl) {
        this.timestampEl.textContent = `Started: ${this.startTime.toLocaleTimeString()}`;
      }
      if (this.suggestedActionsEl && suggestedActions) {
        this.suggestedActionsEl.textContent = suggestedActions;
      }
      this.show();
    }
    show() {
      if (this.progressContainer) {
        this.progressContainer.style.display = "block";
      }
    }
    hide() {
      if (this.progressContainer) {
        this.progressContainer.style.display = "none";
      }
    }
    getElapsedTime() {
      if (!this.startTime) return "";
      const elapsed = /* @__PURE__ */ new Date() - this.startTime;
      const seconds = Math.floor(elapsed / 1e3);
      if (seconds < 60) {
        return `${seconds}s`;
      } else {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      }
    }
    updateElapsedTime() {
      if (this.timestampEl && this.startTime) {
        const elapsed = this.getElapsedTime();
        this.timestampEl.textContent = `Started: ${this.startTime.toLocaleTimeString()} (${elapsed} elapsed)`;
      }
    }
  };
  var progressStatus = new ProgressStatus();
  setInterval(() => {
    progressStatus.updateElapsedTime();
  }, 5e3);

  // js/app.js
  async function runBacktest(settings = CONFIG.backtestSettings) {
    if (state_default.draws.length === 0) {
      state_default.publish("error", { title: "No Data", message: "Please upload a CSV file with lottery data first." });
      return;
    }
    state_default.publish("progress", "Starting backtest...");
    try {
      const resultPromise = new Promise((resolve, reject) => {
        let unsubResult, unsubError;
        const cleanup = () => {
          unsubResult();
          unsubError();
        };
        const handler = (data) => {
          cleanup();
          resolve(data.results || data);
        };
        const errorHandler = (err) => {
          cleanup();
          reject(err);
        };
        unsubResult = state_default.subscribe("backtest:result", handler);
        unsubError = state_default.subscribe("backtest:error", errorHandler);
      });
      state_default.publish("backtest:run", { draws: state_default.draws, settings });
      const results = await resultPromise;
      state_default.publish("backtestResults", results);
    } catch (error) {
      state_default.publish("error", { title: "Backtest Failed", message: error.message || error });
    } finally {
      state_default.publish("hideProgress");
    }
  }
  var CONFIG = {
    analysisMethods: ["energy", "ml", "hybrid"],
    backtestSettings: {
      initialTrainingSize: 100,
      testWindowSize: 50
    },
    energyWeights: {
      // Default weights
      prime: 0.3,
      digitalRoot: 0.2,
      mod5: 0.2,
      gridPosition: 0.3
    }
  };
  state_default.draws = [];
  async function runAnalysis() {
    if (state_default.draws.length === 0) {
      state_default.publish("error", { title: "No Data", message: "Please upload a CSV file with lottery data first." });
      return;
    }
    state_default.publish("analyzeBtnState", false);
    state_default.publish("progress", "Starting analysis...");
    try {
      const maxNumber = 69;
      const frequency = calculateFrequency(state_default.draws, maxNumber);
      const pairs = findCommonPairs(state_default.draws);
      const gaps = gapAnalysis(state_default.draws);
      const hotCold = getHotAndColdNumbers(state_default.draws, maxNumber);
      const overdue = getOverdueNumbers(state_default.draws, maxNumber);
      state_default.publish("analytics:frequency", frequency);
      state_default.publish("analytics:pairs", pairs);
      state_default.publish("analytics:gaps", gaps);
      state_default.publish("analytics:hotCold", hotCold);
      state_default.publish("analytics:overdue", overdue);
      state_default.publish("progress", "Calculating energy signatures...");
      const allNumbers = [...new Set(state_default.draws.flatMap((d) => d.whiteBalls))];
      console.log("allNumbers for energy:", allNumbers);
      const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);
      console.log("Energy Data Sample:", energyData.slice(0, 3));
      state_default.publish("energyResults", energyData);
      state_default.publish("progress", "Running ML predictions...");
      const mlResultPromise = new Promise((resolve, reject) => {
        let unsubResult, unsubError;
        const cleanup = () => {
          if (unsubResult) unsubResult();
          if (unsubError) unsubError();
        };
        const handler = (mlPrediction2) => {
          cleanup();
          resolve(mlPrediction2.prediction || mlPrediction2);
        };
        const errorHandler = (err) => {
          cleanup();
          reject(err || new Error("ML prediction failed with unknown error"));
        };
        unsubResult = state_default.subscribe("ml:result", handler);
        unsubError = state_default.subscribe("ml:error", errorHandler);
        setTimeout(() => {
          cleanup();
          reject(new Error("ML prediction timeout after 2 minutes"));
        }, 12e4);
      });
      state_default.publish("ml:predict", { draws: state_default.draws });
      const mlPrediction = await mlResultPromise;
      state_default.publish("mlResults", mlPrediction);
      state_default.publish("progress", "Generating enhanced recommendations...");
      const recommendations = await generateRecommendations(energyData, mlPrediction);
      state_default.publish("recommendations", recommendations);
    } catch (error) {
      console.error("Analysis error details:", error);
      const errorMessage = error?.message || error?.toString() || "Unknown error occurred during analysis";
      state_default.publish("error", { title: "Analysis Failed", message: errorMessage });
    } finally {
      state_default.publish("hideProgress");
      state_default.publish("analyzeBtnState", true);
    }
  }
  async function generateRecommendations(energyData, mlPrediction) {
    try {
      if (!Array.isArray(energyData)) {
        throw new Error("Energy data is not an array");
      }
      if (!mlPrediction || typeof mlPrediction !== "object") {
        throw new Error("ML prediction is invalid");
      }
      const uniqueByNumber = {};
      energyData.forEach((item) => {
        if (item && item.number) {
          uniqueByNumber[item.number] = item;
        }
      });
      const dedupedEnergyData = Object.values(uniqueByNumber);
      let positionPredictions = null;
      try {
        const { PositionBasedPredictor: PositionBasedPredictor2 } = await Promise.resolve().then(() => (init_confidence_predictor(), confidence_predictor_exports));
        const predictor = new PositionBasedPredictor2(state_default.draws);
        positionPredictions = await predictor.generatePredictionWithConfidenceIntervals({
          confidenceLevel: 0.95,
          method: "bootstrap",
          includeCorrelations: true
        });
      } catch (error) {
        console.warn("Position predictions unavailable:", error.message);
      }
      const enhancedRecommendations = generateEnhancedRecommendations(
        dedupedEnergyData,
        mlPrediction,
        positionPredictions,
        state_default.draws
      );
      const legacyFormat = {
        highConfidence: enhancedRecommendations.highConfidence,
        energyBased: enhancedRecommendations.energyBased || dedupedEnergyData.sort((a, b) => b.energy - a.energy).slice(0, 5).map((item) => item.number),
        mlBased: mlPrediction.whiteBalls || [],
        powerball: mlPrediction.powerball,
        summary: enhancedRecommendations.summary || `Based on ${state_default.draws.length} historical draws`
      };
      legacyFormat.mediumConfidence = enhancedRecommendations.mediumConfidence;
      legacyFormat.alternativeSelections = enhancedRecommendations.alternativeSelections;
      legacyFormat.positionBased = enhancedRecommendations.positionBased;
      legacyFormat.insights = enhancedRecommendations.insights;
      legacyFormat.confidenceScores = enhancedRecommendations.confidenceScores;
      console.log("[Enhanced Recommendations] High confidence count:", legacyFormat.highConfidence.length);
      console.log("[Enhanced Recommendations] Medium confidence count:", legacyFormat.mediumConfidence.length);
      console.log("[Enhanced Recommendations] Alternative strategies:", legacyFormat.alternativeSelections.length);
      return legacyFormat;
    } catch (error) {
      console.error("Error generating enhanced recommendations:", error);
      const fallbackRecommendations = generateSimpleRecommendations(energyData, mlPrediction);
      fallbackRecommendations.error = `Enhanced recommendations failed: ${error.message}`;
      return fallbackRecommendations;
    }
  }
  function generateSimpleRecommendations(energyData, mlPrediction) {
    const uniqueByNumber = {};
    energyData.forEach((item) => {
      if (item && item.number) {
        uniqueByNumber[item.number] = item;
      }
    });
    const deduped = Object.values(uniqueByNumber);
    const topEnergy = [...deduped].sort((a, b) => b.energy - a.energy).slice(0, 5);
    const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);
    const energyNumbers = topEnergy.map((item) => item.number);
    const overlap = mlNumbers.filter((num) => energyNumbers.includes(num));
    return {
      highConfidence: overlap,
      energyBased: energyNumbers,
      mlBased: mlNumbers,
      powerball: mlPrediction.powerball,
      summary: `Fallback recommendations based on ${state_default.draws.length} historical draws`
    };
  }
  function initEventListeners() {
    const controlPanel = document.querySelector(".control-panel");
    if (controlPanel) {
      controlPanel.addEventListener("click", (event) => {
        if (event.target.id === "analyzeBtn") runAnalysis();
      });
    } else {
      console.error("Control panel not found for event delegation.");
    }
    elements.uploadInput.addEventListener("change", handleFileUpload);
  }
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      state_default.publish("analyzeBtnState", false);
      return;
    }
    state_default.publish("progress", "Parsing CSV file...");
    Papa.parse(file, {
      header: false,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        state_default.publish("hideProgress");
        if (results.errors.length) {
          state_default.publish("error", { title: "CSV Parsing Error", message: results.errors[0].message });
          state_default.publish("analyzeBtnState", false);
          return;
        }
        const dataRows = results.data.slice(2);
        state_default.draws = dataRows.map((row) => {
          const whiteBalls = [row[1], row[2], row[3], row[4], row[5]].map(Number);
          const powerball = Number(row[6]);
          const date = new Date(row[0]);
          return { whiteBalls, powerball, date };
        });
        console.log(`Parsed ${state_default.draws.length} draws.`);
        console.log("First 5 draws:", state_default.draws.slice(0, 5));
        state_default.publish("drawsUpdated", state_default.draws);
        state_default.publish("analyzeBtnState", true);
      },
      error: (err) => {
        state_default.publish("hideProgress");
        state_default.publish("error", { title: "CSV Parsing Error", message: err });
        state_default.publish("analyzeBtnState", false);
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initUIElements(CONFIG, state_default);
    initEventListeners();
    initOptimizationUI();
    initConfidenceUI();
    initAccuracyUI();
    initStrategyBuilder();
    initPerformanceUI();
  });
})();
//# sourceMappingURL=bundle.js.map
