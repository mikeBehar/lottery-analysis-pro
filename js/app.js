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

import { calculateEnergy, displayEnergyResults } from './utils.js';
import {
    calculateFrequency,
    findCommonPairs,
    gapAnalysis,
    getHotAndColdNumbers,
    getOverdueNumbers
} from './analysis.js';
import { generateEnhancedRecommendations } from './enhanced-recommendations.js';
import workerWrapper from './worker-wrapper.js';
import { initOptimizationUI } from './optimization-ui.js';
import { initConfidenceUI } from './confidence-ui.js';
import { initAccuracyUI } from './accuracy-ui.js';
import { initStrategyBuilder } from './strategy-builder.js';
import { initPerformanceUI } from './performance-ui.js';
import progressStatus from './progress-status.js';

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
        // Core analytics
        const maxNumber = 69; // TODO: make dynamic if needed
        const frequency = calculateFrequency(state.draws, maxNumber);
        const pairs = findCommonPairs(state.draws);
        const gaps = gapAnalysis(state.draws);
        const hotCold = getHotAndColdNumbers(state.draws, maxNumber);
        const overdue = getOverdueNumbers(state.draws, maxNumber);

        state.publish('analytics:frequency', frequency);
        state.publish('analytics:pairs', pairs);
        state.publish('analytics:gaps', gaps);
        state.publish('analytics:hotCold', hotCold);
        state.publish('analytics:overdue', overdue);
        
        state.publish('progress', 'Calculating energy signatures...');
    const allNumbers = [...new Set(state.draws.flatMap(d => d.whiteBalls))];
    console.log('allNumbers for energy:', allNumbers);
    const energyData = calculateEnergy(allNumbers, CONFIG.energyWeights);
    console.log('Energy Data Sample:', energyData.slice(0, 3));
        state.publish('energyResults', energyData);

        state.publish('progress', 'Running ML predictions...');
        const mlResultPromise = new Promise((resolve, reject) => {
            let unsubResult, unsubError;
            const cleanup = () => { 
                if (unsubResult) unsubResult(); 
                if (unsubError) unsubError(); 
            };

            const handler = (mlPrediction) => {
                cleanup();
                resolve(mlPrediction.prediction || mlPrediction);
            };
            const errorHandler = (err) => {
                cleanup();
                reject(err || new Error('ML prediction failed with unknown error'));
            };

            unsubResult = state.subscribe('ml:result', handler);
            unsubError = state.subscribe('ml:error', errorHandler);
            
            // Add a timeout to prevent hanging (increased for large datasets)
            setTimeout(() => {
                cleanup();
                reject(new Error('ML prediction timeout after 2 minutes'));
            }, 120000);
        });

        state.publish('ml:predict', { draws: state.draws });
        const mlPrediction = await mlResultPromise;
        state.publish('mlResults', mlPrediction);

        state.publish('progress', 'Generating enhanced recommendations...');
        const recommendations = await generateRecommendations(energyData, mlPrediction);
        state.publish('recommendations', recommendations);

    } catch (error) {
        console.error('Analysis error details:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred during analysis';
        state.publish('error', { title: 'Analysis Failed', message: errorMessage });
    } finally {
        state.publish('hideProgress');
        state.publish('analyzeBtnState', true);
    }
}

async function generateRecommendations(energyData, mlPrediction) {
    try {
        // Validate inputs
        if (!Array.isArray(energyData)) {
            throw new Error('Energy data is not an array');
        }
        if (!mlPrediction || typeof mlPrediction !== 'object') {
            throw new Error('ML prediction is invalid');
        }

        // Deduplicate energy data by number
        const uniqueByNumber = {};
        energyData.forEach(item => { 
            if (item && item.number) {
                uniqueByNumber[item.number] = item; 
            }
        });
        const dedupedEnergyData = Object.values(uniqueByNumber);

        // Generate position predictions if confidence predictor is available
        let positionPredictions = null;
        try {
            const { PositionBasedPredictor } = await import('./confidence-predictor.js');
            const predictor = new PositionBasedPredictor(state.draws);
            positionPredictions = await predictor.generatePredictionWithConfidenceIntervals({
                confidenceLevel: 0.95,
                method: 'bootstrap',
                includeCorrelations: true
            });
        } catch (error) {
            console.warn('Position predictions unavailable:', error.message);
        }

        // Use enhanced recommendations system
        const enhancedRecommendations = generateEnhancedRecommendations(
            dedupedEnergyData, 
            mlPrediction, 
            positionPredictions, 
            state.draws
        );

        // Maintain backward compatibility with existing UI expectations
        const legacyFormat = {
            highConfidence: enhancedRecommendations.highConfidence,
            energyBased: enhancedRecommendations.energyBased || dedupedEnergyData
                .sort((a, b) => b.energy - a.energy)
                .slice(0, 5)
                .map(item => item.number),
            mlBased: mlPrediction.whiteBalls || [],
            powerball: mlPrediction.powerball,
            summary: enhancedRecommendations.summary || `Based on ${state.draws.length} historical draws`
        };

        // Add enhanced features
        legacyFormat.mediumConfidence = enhancedRecommendations.mediumConfidence;
        legacyFormat.alternativeSelections = enhancedRecommendations.alternativeSelections;
        legacyFormat.positionBased = enhancedRecommendations.positionBased;
        legacyFormat.insights = enhancedRecommendations.insights;
        legacyFormat.confidenceScores = enhancedRecommendations.confidenceScores;

        console.log('[Enhanced Recommendations] High confidence count:', legacyFormat.highConfidence.length);
        console.log('[Enhanced Recommendations] Medium confidence count:', legacyFormat.mediumConfidence.length);
        console.log('[Enhanced Recommendations] Alternative strategies:', legacyFormat.alternativeSelections.length);

        return legacyFormat;

    } catch (error) {
        console.error('Error generating enhanced recommendations:', error);
        
        // Fallback to simple recommendations if enhanced system fails
        const fallbackRecommendations = generateSimpleRecommendations(energyData, mlPrediction);
        fallbackRecommendations.error = `Enhanced recommendations failed: ${error.message}`;
        return fallbackRecommendations;
    }
}

function generateSimpleRecommendations(energyData, mlPrediction) {
    // Fallback implementation
    const uniqueByNumber = {};
    energyData.forEach(item => { 
        if (item && item.number) {
            uniqueByNumber[item.number] = item; 
        }
    });
    const deduped = Object.values(uniqueByNumber);
    const topEnergy = [...deduped].sort((a, b) => b.energy - a.energy).slice(0, 5);
    const mlNumbers = (mlPrediction.whiteBalls || []).slice(0, 5);

    const energyNumbers = topEnergy.map(item => item.number);
    const overlap = mlNumbers.filter(num => energyNumbers.includes(num));
    
    return {
        highConfidence: overlap,
        energyBased: energyNumbers,
        mlBased: mlNumbers,
        powerball: mlPrediction.powerball,
        summary: `Fallback recommendations based on ${state.draws.length} historical draws`
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
        header: false,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
            state.publish('hideProgress');
            if (results.errors.length) {
                state.publish('error', { title: 'CSV Parsing Error', message: results.errors[0].message });
                state.publish('analyzeBtnState', false);
                return;
            }

            // Skip the first two header rows
            const dataRows = results.data.slice(2);

            state.draws = dataRows.map(row => {
                const whiteBalls = [row[1], row[2], row[3], row[4], row[5]].map(Number);
                const powerball = Number(row[6]);
                const date = new Date(row[0]);
                return { whiteBalls, powerball, date };
            });
            console.log(`Parsed ${state.draws.length} draws.`);
            console.log('First 5 draws:', state.draws.slice(0, 5));
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
    initOptimizationUI();
    initConfidenceUI();
    initAccuracyUI();
    initStrategyBuilder();
    initPerformanceUI();
});