// LOTTERY ANALYSIS PRO - CORE APPLICATION
// Version: 2.4.2 | Last Updated: 2025-08-21 02:45 PM EST

import {
    setAnalyzeBtnState,
    showError,
    showProgress,
    updateProgress,
    hideProgress,
    elements,
    initUIElements,
    displayMLResults,
    displayRecommendations,
    displayBacktestResults
} from './ui.js';

import { calculateEnergy, displayEnergyResults } from './utils.js';

// ==================== CONFIG & STATE ==================== //
const CONFIG = {
    analysisMethods: ['energy', 'ml', 'hybrid'],
    backtestSettings: {
        initialTrainingSize: 100,
        testWindowSize: 50,
    },
    energyWeights: { // Default weights
        prime: 0.3,
        digitalRoot: 0.2,
        mod5: 0.2,
        gridPosition: 0.3
    }
};

const state = {
    draws: [],
    currentMethod: 'hybrid',
    activeWorkers: new Map(),
};


// ==================== CORE ANALYSIS ==================== //

async function runAnalysis() {
    if (state.draws.length === 0) {
        showError('No Data', 'Please upload a CSV file with lottery data first.');
        return;
    }

    setAnalyzeBtnState(false);
    showProgress('Starting analysis...');

    try {
        // 1. Energy Analysis
        updateProgress('Calculating energy signatures...');
        // Assuming the CSV has a 'White Balls' column which is an array of numbers
        const allNumbers = state.draws.flatMap(d => d.whiteBalls);
        const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);
        displayEnergyResults(energyData, elements.energyResults);

        // 2. ML Prediction
        updateProgress('Running ML predictions...');
        // In a real app, getMLPrediction would be defined here or imported
        // For now, we'll use a fallback prediction for demonstration
        const mlPrediction = getFrequencyFallback(state.draws);
        displayMLResults(mlPrediction, elements.mlResults, elements);


        // 3. Generate and Display Recommendations
        updateProgress('Generating recommendations...');
        const recommendations = generateRecommendations(energyData, mlPrediction);
        displayRecommendations(recommendations, elements);

    } catch (error) {
        showError('Analysis Failed', error);
    } finally {
        hideProgress();
        setAnalyzeBtnState(true);
    }
}

function generateRecommendations(energyData, mlPrediction) {
    const topEnergy = [...energyData].sort((a, b) => b.energy - a.energy).slice(0, 5);
    const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);

    const energyNumbers = topEnergy.map(item => item.number);
    const overlap = mlNumbers.filter(num => energyNumbers.includes(num));

    return {
        highConfidence: overlap,
        energyBased: energyNumbers,
        mlBased: mlNumbers,
        powerball: mlPrediction.powerball,
        summary: `Based on ${state.draws.length} historical draws`
    };
}

// This is a fallback since the original getMLPrediction is in a worker
function getFrequencyFallback(draws) {
    const whiteFreq = new Array(70).fill(0);
    draws.forEach(draw => {
        if (draw.whiteBalls && Array.isArray(draw.whiteBalls)) {
            draw.whiteBalls.forEach(n => {
                if (n >= 1 && n <= 69) whiteFreq[n] += 1;
            });
        }
    });
    const predictedWhiteBalls = whiteFreq
        .map((count, number) => ({ number, count }))
        .filter(item => item.number >= 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.number);

    return {
        whiteBalls: predictedWhiteBalls,
        powerball: Math.floor(Math.random() * 26) + 1, // Random powerball
        confidence: 0.5,
        model: 'fallback_frequency'
    };
}


// ==================== EVENT LISTENERS ==================== //

function initEventListeners() {
    const controlPanel = document.querySelector('.control-panel');

    if (controlPanel) {
        controlPanel.addEventListener('click', (event) => {
            if (event.target.id === 'analyzeBtn') {
                runAnalysis();
            }
        });
    } else {
        console.error('Control panel not found for event delegation.');
    }

    elements.uploadInput.addEventListener('change', handleFileUpload);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        setAnalyzeBtnState(false);
        return;
    }

    showProgress('Parsing CSV file...');
    
    // Use PapaParse which is loaded in index.html
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            hideProgress();
            if (results.errors.length) {
                showError('CSV Parsing Error', results.errors[0].message);
                setAnalyzeBtnState(false);
                return;
            }
            // Assuming 'White Balls' column exists and is a string like "1,2,3,4,5"
            state.draws = results.data.map(row => ({
                ...row,
                whiteBalls: typeof row['White Balls'] === 'string' 
                    ? row['White Balls'].split(',').map(Number) 
                    : (Array.isArray(row['White Balls']) ? row['White Balls'] : [])
            }));
            console.log(`Parsed ${state.draws.length} draws.`);
            setAnalyzeBtnState(true);
        },
        error: (err) => {
            hideProgress();
            showError('CSV Parsing Error', err);
            setAnalyzeBtnState(false);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUIElements(CONFIG, state);
    initEventListeners();
});