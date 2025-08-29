(() => {
  // js/ui.js
  var elements = {
    methodSelector: document.createElement("select"),
    temporalDecaySelector: document.createElement("select"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    uploadInput: document.getElementById("csvUpload"),
    progressIndicator: document.createElement("div"),
    backtestResults: document.createElement("div"),
    recommendations: document.getElementById("recommendations"),
    energyResults: document.getElementById("energy-results") || (() => {
      const div = document.createElement("div");
      div.id = "energy-results";
      div.className = "energy-panel";
      document.body.appendChild(div);
      return div;
    })(),
    mlResults: document.getElementById("ml-results") || (() => {
      const div = document.createElement("div");
      div.id = "ml-results";
      div.className = "ml-panel";
      document.body.appendChild(div);
      return div;
    })()
    // Add more as needed for your UI
  };
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
  function showError(title, error) {
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
    alert(`${title}: ${msg}`);
  }

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
    const sorted = [...energyData].sort((a, b) => b.energy - a.energy);
    const topNumbers = sorted.slice(0, 15);
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
    if (!draws.length) return draws;
    const mostRecentDate = new Date(Math.max(...draws.map((d) => d.date.getTime())));
    const maxAgeDays = (mostRecentDate - new Date(Math.min(...draws.map((d) => d.date.getTime())))) / (1e3 * 60 * 60 * 24);
    return draws.map((draw) => {
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
  var state = {
    draws: [],
    currentMethod: "hybrid",
    activeWorkers: /* @__PURE__ */ new Map()
  };
  async function runAnalysis() {
    if (state.draws.length === 0) {
      showError("No Data", "Please upload a CSV file with lottery data first.");
      return;
    }
    setAnalyzeBtnState(false);
    showProgress("Starting analysis...");
    try {
      updateProgress("Calculating energy signatures...");
      const allNumbers = state.draws.flatMap((d) => d.whiteBalls);
      const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);
      displayEnergyResults(energyData, elements.energyResults);
      updateProgress("Running ML predictions...");
      const mlPrediction = getFrequencyFallback(state.draws);
      displayMLResults(mlPrediction, elements.mlResults, elements);
      updateProgress("Generating recommendations...");
      const recommendations = generateRecommendations(energyData, mlPrediction);
      displayRecommendations(recommendations, elements);
    } catch (error) {
      showError("Analysis Failed", error);
    } finally {
      hideProgress();
      setAnalyzeBtnState(true);
    }
  }
  function generateRecommendations(energyData, mlPrediction) {
    const topEnergy = [...energyData].sort((a, b) => b.energy - a.energy).slice(0, 5);
    const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);
    const energyNumbers = topEnergy.map((item) => item.number);
    const overlap = mlNumbers.filter((num) => energyNumbers.includes(num));
    return {
      highConfidence: overlap,
      energyBased: energyNumbers,
      mlBased: mlNumbers,
      powerball: mlPrediction.powerball,
      summary: `Based on ${state.draws.length} historical draws`
    };
  }
  function getFrequencyFallback(draws) {
    const whiteFreq = new Array(70).fill(0);
    draws.forEach((draw) => {
      if (draw.whiteBalls && Array.isArray(draw.whiteBalls)) {
        draw.whiteBalls.forEach((n) => {
          if (n >= 1 && n <= 69) whiteFreq[n] += 1;
        });
      }
    });
    const predictedWhiteBalls = whiteFreq.map((count, number) => ({ number, count })).filter((item) => item.number >= 1).sort((a, b) => b.count - a.count).slice(0, 5).map((item) => item.number);
    return {
      whiteBalls: predictedWhiteBalls,
      powerball: Math.floor(Math.random() * 26) + 1,
      // Random powerball
      confidence: 0.5,
      model: "fallback_frequency"
    };
  }
  function initEventListeners() {
    const controlPanel = document.querySelector(".control-panel");
    if (controlPanel) {
      controlPanel.addEventListener("click", (event) => {
        if (event.target.id === "analyzeBtn") {
          runAnalysis();
        }
      });
    } else {
      console.error("Control panel not found for event delegation.");
    }
    elements.uploadInput.addEventListener("change", handleFileUpload);
  }
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      setAnalyzeBtnState(false);
      return;
    }
    showProgress("Parsing CSV file...");
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        hideProgress();
        if (results.errors.length) {
          showError("CSV Parsing Error", results.errors[0].message);
          setAnalyzeBtnState(false);
          return;
        }
        state.draws = results.data.map((row) => ({
          ...row,
          whiteBalls: typeof row["White Balls"] === "string" ? row["White Balls"].split(",").map(Number) : Array.isArray(row["White Balls"]) ? row["White Balls"] : []
        }));
        console.log(`Parsed ${state.draws.length} draws.`);
        setAnalyzeBtnState(true);
      },
      error: (err) => {
        hideProgress();
        showError("CSV Parsing Error", err);
        setAnalyzeBtnState(false);
      }
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initUIElements(CONFIG, state);
    initEventListeners();
  });
})();
//# sourceMappingURL=bundle.js.map
