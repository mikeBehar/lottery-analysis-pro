(() => {
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
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    if (!energyData || energyData.length === 0) {
      const noDataMsg = document.createElement("p");
      noDataMsg.textContent = "No energy data available";
      container.appendChild(noDataMsg);
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
    topNumbers.forEach((num) => {
      const card = document.createElement("div");
      card.className = "number-card";
      card.setAttribute("data-energy", num.energy.toFixed(2));
      const numberDiv = document.createElement("div");
      numberDiv.className = "number";
      numberDiv.textContent = num.number;
      const scoreDiv = document.createElement("div");
      scoreDiv.className = "energy-score";
      scoreDiv.textContent = num.energy.toFixed(2);
      const breakdownDiv = document.createElement("div");
      breakdownDiv.className = "energy-breakdown";
      breakdownDiv.textContent = `Prime: ${num.isPrime ? "\u2713" : "\u2717"} | Root: ${num.digitalRoot} | Mod5: ${(num.mod5 / 0.2).toFixed(0)} | Grid: ${num.gridScore.toFixed(1)}`;
      card.appendChild(numberDiv);
      card.appendChild(scoreDiv);
      card.appendChild(breakdownDiv);
      container.appendChild(card);
    });
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

  // js/app.js
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
          unsubResult();
          unsubError();
        };
        const handler = (mlPrediction2) => {
          cleanup();
          resolve(mlPrediction2.prediction || mlPrediction2);
        };
        const errorHandler = (err) => {
          cleanup();
          reject(err);
        };
        unsubResult = state_default.subscribe("ml:result", handler);
        unsubError = state_default.subscribe("ml:error", errorHandler);
      });
      state_default.publish("ml:predict", { draws: state_default.draws });
      const mlPrediction = await mlResultPromise;
      state_default.publish("mlResults", mlPrediction);
      state_default.publish("progress", "Generating recommendations...");
      const recommendations = generateRecommendations(energyData, mlPrediction);
      state_default.publish("recommendations", recommendations);
    } catch (error) {
      state_default.publish("error", { title: "Analysis Failed", message: error.message || error });
    } finally {
      state_default.publish("hideProgress");
      state_default.publish("analyzeBtnState", true);
    }
  }
  function generateRecommendations(energyData, mlPrediction) {
    const uniqueByNumber = {};
    energyData.forEach((item) => {
      uniqueByNumber[item.number] = item;
    });
    const deduped = Object.values(uniqueByNumber);
    const topEnergy = [...deduped].sort((a, b) => b.energy - a.energy).slice(0, 5);
    const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);
    const energyNumbers = topEnergy.map((item) => item.number);
    const overlap = mlNumbers.filter((num) => energyNumbers.includes(num));
    console.log("[Recommendations] Top energy numbers (deduped):", energyNumbers);
    console.log("[Recommendations] ML numbers:", mlNumbers);
    return {
      highConfidence: overlap,
      energyBased: energyNumbers,
      mlBased: mlNumbers,
      powerball: mlPrediction.powerball,
      summary: `Based on ${state_default.draws.length} historical draws`
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
    const Papa = window.Papa;
    if (!Papa) {
      state_default.publish("error", { title: "Library Error", message: "PapaParse library not loaded" });
      return;
    }
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
  });
})();
//# sourceMappingURL=bundle.js.map
