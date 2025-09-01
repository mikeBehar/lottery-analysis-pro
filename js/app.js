// ==================== BACKTEST INTEGRATION ==================== //

export async function runBacktest(settings = CONFIG.backtestSettings) {
    if (state.draws.length === 0) {
        state.publish('error', { title: 'No Data', message: 'Please upload a CSV file with lottery data first.' });
        return;
    }

    state.publish('progress', 'Starting backtest...');

    try {
        const resultPromise = new Promise((resolve, reject) => {
            let unsubResult, unsubError;
            const cleanup = () => { unsubResult(); unsubError(); };

            const handler = (data) => {
                cleanup();
                resolve(data.results || data);
            };
            const errorHandler = (err) => {
                cleanup();
                reject(err);
            };

            unsubResult = state.subscribe('backtest:result', handler);
            unsubError = state.subscribe('backtest:error', errorHandler);
        });

        state.publish('backtest:run', { draws: state.draws, settings });
        const results = await resultPromise;
        state.publish('backtestResults', results);
    } catch (error) {
        state.publish('error', { title: 'Backtest Failed', message: error.message || error });
    } finally {
        state.publish('hideProgress');
    }
}

// LOTTERY ANALYSIS PRO - CORE APPLICATION
// Version: 2.4.2 | Last Updated: 2025-08-21 02:45 PM EST

import {
    elements,
    initUIElements,
} from './ui.js';
import state from './state.js';

import { calculateEnergy } from './utils.js';
import workerWrapper from './worker-wrapper.js';

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

// Initialize state properties
state.draws = [];

// App state for non-pubsub values
const appState = {
    currentMethod: 'hybrid',
    activeWorkers: new Map(),
};


// ==================== CORE ANALYSIS ==================== //

export async function runAnalysis() {
    if (state.draws.length === 0) {
        state.publish('error', { title: 'No Data', message: 'Please upload a CSV file with lottery data first.' });
        return;
    }

    state.publish('analyzeBtnState', false);
    state.publish('progress', 'Starting analysis...');

    try {
        state.publish('progress', 'Calculating energy signatures...');
        const allNumbers = state.draws.flatMap(d => d.whiteBalls);
        const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);
        state.publish('energyResults', energyData);

        state.publish('progress', 'Running ML predictions...');
        const mlResultPromise = new Promise((resolve, reject) => {
            let unsubResult, unsubError;
            const cleanup = () => { unsubResult(); unsubError(); };

            const handler = (mlPrediction) => {
                cleanup();
                resolve(mlPrediction.prediction || mlPrediction);
            };
            const errorHandler = (err) => {
                cleanup();
                reject(err);
            };

            unsubResult = state.subscribe('ml:result', handler);
            unsubError = state.subscribe('ml:error', errorHandler);
        });

        state.publish('ml:predict', { draws: state.draws });
        const mlPrediction = await mlResultPromise;
        state.publish('mlResults', mlPrediction);

        state.publish('progress', 'Generating recommendations...');
        const recommendations = generateRecommendations(energyData, mlPrediction);
        state.publish('recommendations', recommendations);

    } catch (error) {
        state.publish('error', { title: 'Analysis Failed', message: error.message || error });
    } finally {
        state.publish('hideProgress');
        state.publish('analyzeBtnState', true);
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
        powerball: Math.floor(Math.random() * 26) + 1,
        confidence: 0.5,
        model: 'fallback_frequency'
    };
}

function initEventListeners() {
    const controlPanel = document.querySelector('.control-panel');
    if (controlPanel) {
        controlPanel.addEventListener('click', (event) => {
            if (event.target.id === 'analyzeBtn') runAnalysis();
        });
    } else {
        console.error('Control panel not found for event delegation.');
    }
    elements.uploadInput.addEventListener('change', handleFileUpload);
}

export async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        state.publish('analyzeBtnState', false);
        return;
    }

    state.publish('progress', 'Parsing CSV file...');
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            state.publish('hideProgress');
            if (results.errors.length) {
                state.publish('error', { title: 'CSV Parsing Error', message: results.errors[0].message });
                state.publish('analyzeBtnState', false);
                return;
            }
            state.draws = results.data.map(row => {
                let whiteBalls;
                if (typeof row['White Balls'] === 'string') {
                    whiteBalls = row['White Balls'].split(',').map(Number);
                } else if (Array.isArray(row['White Balls'])) {
                    whiteBalls = row['White Balls'];
                } else {
                    whiteBalls = [];
                }
                return { ...row, whiteBalls };
            });
            console.log(`Parsed ${state.draws.length} draws.`);
            state.publish('drawsUpdated', state.draws);
            state.publish('analyzeBtnState', true);
        },
        error: (err) => {
            state.publish('hideProgress');
            state.publish('error', { title: 'CSV Parsing Error', message: err });
            state.publish('analyzeBtnState', false);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUIElements(CONFIG, state);
    initEventListeners();
});