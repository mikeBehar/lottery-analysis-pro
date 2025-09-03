/**
 * ENHANCED RECOMMENDATIONS ENGINE
 * Version: 1.0.0 | Created: 2025-09-02
 * 
 * Improved recommendation system with multiple confidence levels and methodologies
 */

import { getHotAndColdNumbers, getOverdueNumbers } from './analysis.js';

export function generateEnhancedRecommendations(energyData, mlPrediction, positionPredictions = null, historicalDraws = []) {
  try {
    const recommendations = {
      highConfidence: [],
      mediumConfidence: [],
      alternativeSelections: [],
      positionBased: [],
      insights: [],
      summary: '',
      confidenceScores: {}
    };

    // 1. Multi-Method Consensus Approach
    const consensusNumbers = findConsensusNumbers(energyData, mlPrediction, positionPredictions, historicalDraws);
    
    // 2. Confidence Scoring System
    const scoredNumbers = calculateConfidenceScores(energyData, mlPrediction, positionPredictions, historicalDraws);
    
    // 3. Position-Aware Recommendations
    if (positionPredictions) {
      recommendations.positionBased = positionPredictions.map(pred => ({
        position: pred.position,
        number: pred.prediction,
        confidence: pred.confidenceInterval,
        likelihood: calculatePositionLikelihood(pred, historicalDraws)
      }));
    }

    // 4. Tiered Confidence Levels
    recommendations.highConfidence = scoredNumbers
      .filter(num => num.score >= 0.8)
      .slice(0, 8)
      .map(num => num.number);

    recommendations.mediumConfidence = scoredNumbers
      .filter(num => num.score >= 0.6 && num.score < 0.8)
      .slice(0, 10)
      .map(num => num.number);

    // 5. Alternative Selection Strategies
    recommendations.alternativeSelections = generateAlternativeSelections(energyData, mlPrediction, historicalDraws);

    // 6. Generate Insights
    recommendations.insights = generateRecommendationInsights(energyData, mlPrediction, positionPredictions, historicalDraws);

    // 7. Enhanced Summary
    recommendations.summary = generateEnhancedSummary(recommendations, historicalDraws.length);

    return recommendations;

  } catch (error) {
    console.error('Error generating enhanced recommendations:', error);
    throw new Error(`Failed to generate enhanced recommendations: ${error.message}`);
  }
}

/**
 * Find numbers that appear across multiple prediction methods
 */
function findConsensusNumbers(energyData, mlPrediction, positionPredictions, historicalDraws) {
  const methodResults = {};
  
  // Energy method top numbers
  const energyNumbers = energyData
    .sort((a, b) => b.energy - a.energy)
    .slice(0, 10)
    .map(item => item.number);
  
  // ML prediction numbers
  const mlNumbers = mlPrediction.whiteBalls || [];
  
  // Position-based numbers
  const positionNumbers = positionPredictions ? 
    positionPredictions.map(pred => pred.prediction) : [];
  
  // Frequency analysis
  const { hot } = getHotAndColdNumbers(historicalDraws);
  const hotNumbers = hot.slice(0, 10);
  
  // Count occurrences across methods
  const numberCounts = {};
  [...energyNumbers, ...mlNumbers, ...positionNumbers, ...hotNumbers].forEach(num => {
    numberCounts[num] = (numberCounts[num] || 0) + 1;
  });
  
  // Return numbers that appear in multiple methods
  return Object.entries(numberCounts)
    .filter(([num, count]) => count >= 2)
    .map(([num, count]) => ({ number: parseInt(num), consensus: count }))
    .sort((a, b) => b.consensus - a.consensus);
}

/**
 * Calculate comprehensive confidence scores for each number
 */
function calculateConfidenceScores(energyData, mlPrediction, positionPredictions, historicalDraws) {
  const scores = {};
  const allNumbers = new Set();

  // Collect all candidate numbers
  energyData.forEach(item => allNumbers.add(item.number));
  (mlPrediction.whiteBalls || []).forEach(num => allNumbers.add(num));
  if (positionPredictions) {
    positionPredictions.forEach(pred => allNumbers.add(pred.prediction));
  }

  // Calculate scores for each number
  Array.from(allNumbers).forEach(number => {
    let score = 0;
    let factors = {};

    // Energy score (0-0.3)
    const energyItem = energyData.find(item => item.number === number);
    if (energyItem) {
      const energyScore = Math.min(energyItem.energy / 2, 0.3); // Normalize energy
      score += energyScore;
      factors.energy = energyScore;
    }

    // ML confidence (0-0.3)
    const mlNumbers = mlPrediction.whiteBalls || [];
    const mlIndex = mlNumbers.indexOf(number);
    if (mlIndex >= 0) {
      const mlScore = 0.3 * (1 - mlIndex / 5); // Higher score for earlier positions
      score += mlScore;
      factors.ml = mlScore;
    }

    // Position likelihood (0-0.2)
    if (positionPredictions) {
      const positionPred = positionPredictions.find(pred => pred.prediction === number);
      if (positionPred) {
        const positionScore = 0.2; // Base score for position prediction
        score += positionScore;
        factors.position = positionScore;
      }
    }

    // Frequency analysis (0-0.2)
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

/**
 * Calculate likelihood for position-based predictions
 */
function calculatePositionLikelihood(prediction, historicalDraws) {
  if (!historicalDraws.length) return 0.5;

  const position = prediction.position;
  const predictedNumber = prediction.prediction;
  
  // Get historical data for this position
  const positionData = historicalDraws.map(draw => {
    const sorted = [...draw.whiteBalls].sort((a, b) => a - b);
    const positionIndex = { ball1: 0, ball2: 1, ball3: 2, ball4: 3, ball5: 4 };
    return position === 'powerball' ? draw.powerball : sorted[positionIndex[position]];
  });

  // Calculate how often numbers in this range appear in this position
  const numberRange = getPositionRange(predictedNumber);
  const rangeOccurrences = positionData.filter(num => 
    num >= numberRange.min && num <= numberRange.max
  ).length;

  return rangeOccurrences / historicalDraws.length;
}

/**
 * Get typical range for a number based on its value
 */
function getPositionRange(number) {
  if (number <= 15) return { min: 1, max: 20, position: 'ball1' };
  if (number <= 30) return { min: 10, max: 35, position: 'ball2' };
  if (number <= 45) return { min: 20, max: 50, position: 'ball3' };
  if (number <= 60) return { min: 30, max: 65, position: 'ball4' };
  return { min: 40, max: 69, position: 'ball5' };
}

/**
 * Generate alternative selection strategies
 */
function generateAlternativeSelections(energyData, mlPrediction, historicalDraws) {
  const alternatives = [];

  // 1. Balanced Range Strategy
  alternatives.push({
    name: 'Balanced Range Selection',
    numbers: generateBalancedRangeNumbers(historicalDraws),
    description: 'Numbers spread across low, medium, and high ranges'
  });

  // 2. Hot & Cold Mix Strategy  
  const { hot, cold } = getHotAndColdNumbers(historicalDraws);
  alternatives.push({
    name: 'Hot & Cold Mix',
    numbers: [...hot.slice(0, 3), ...cold.slice(0, 2)],
    description: '3 hot numbers + 2 cold numbers for balance'
  });

  // 3. Overdue Numbers Strategy
  const overdueNumbers = getOverdueNumbers(historicalDraws);
  alternatives.push({
    name: 'Overdue Numbers',
    numbers: overdueNumbers.slice(0, 5),
    description: 'Numbers that haven\'t appeared recently'
  });

  // 4. Pattern-Based Strategy
  alternatives.push({
    name: 'Pattern Avoidance',
    numbers: generatePatternAvoidanceNumbers(historicalDraws),
    description: 'Avoids common patterns like consecutive numbers'
  });

  return alternatives;
}

/**
 * Generate numbers with balanced range distribution
 */
function generateBalancedRangeNumbers(historicalDraws) {
  const ranges = [
    { min: 1, max: 14, count: 1 },    // Low
    { min: 15, max: 28, count: 1 },   // Low-Mid  
    { min: 29, max: 42, count: 1 },   // Mid
    { min: 43, max: 56, count: 1 },   // Mid-High
    { min: 57, max: 69, count: 1 }    // High
  ];

  const numbers = [];
  const { hot } = getHotAndColdNumbers(historicalDraws);

  ranges.forEach(range => {
    // Find hot numbers in this range
    const rangeHotNumbers = hot.filter(num => num >= range.min && num <= range.max);
    if (rangeHotNumbers.length > 0) {
      numbers.push(rangeHotNumbers[0]);
    } else {
      // Pick a random number from range if no hot numbers
      numbers.push(Math.floor(Math.random() * (range.max - range.min + 1)) + range.min);
    }
  });

  return numbers;
}

/**
 * Generate numbers avoiding common patterns
 */
function generatePatternAvoidanceNumbers(historicalDraws) {
  const { hot } = getHotAndColdNumbers(historicalDraws);
  const numbers = [];
  
  // Avoid consecutive numbers, multiples of 5, etc.
  hot.forEach(num => {
    if (numbers.length >= 5) return;
    
    const hasConsecutive = numbers.some(existing => Math.abs(existing - num) === 1);
    const isMultipleOf5 = num % 5 === 0;
    const isInSameDecade = numbers.some(existing => Math.floor(existing / 10) === Math.floor(num / 10));
    
    if (!hasConsecutive && !(isMultipleOf5 && numbers.filter(n => n % 5 === 0).length >= 1) && !isInSameDecade) {
      numbers.push(num);
    }
  });

  // Fill remaining slots if needed
  while (numbers.length < 5) {
    const candidate = Math.floor(Math.random() * 69) + 1;
    if (!numbers.includes(candidate)) {
      numbers.push(candidate);
    }
  }

  return numbers.sort((a, b) => a - b);
}

/**
 * Generate insights about the recommendations
 */
function generateRecommendationInsights(energyData, mlPrediction, positionPredictions, historicalDraws) {
  const insights = [];

  // Energy analysis insights
  const topEnergy = energyData.sort((a, b) => b.energy - a.energy)[0];
  insights.push(`Highest energy number: ${topEnergy.number} (${topEnergy.energy.toFixed(2)} energy score)`);

  // ML prediction insights
  const mlNumbers = mlPrediction.whiteBalls || [];
  insights.push(`AI predicts numbers in ranges: ${getNumberRanges(mlNumbers)}`);

  // Position prediction insights
  if (positionPredictions) {
    const avgConfidenceWidth = positionPredictions.reduce((sum, pred) => {
      const width = pred.confidenceInterval.upper - pred.confidenceInterval.lower;
      return sum + width;
    }, 0) / positionPredictions.length;
    
    insights.push(`Average confidence interval width: ±${(avgConfidenceWidth/2).toFixed(1)} numbers`);
  }

  // Historical pattern insights
  const { hot, cold } = getHotAndColdNumbers(historicalDraws);
  insights.push(`Current hot streak: ${hot.slice(0, 3).join(', ')}`);
  insights.push(`Due for appearance: ${cold.slice(0, 3).join(', ')}`);

  return insights;
}

/**
 * Get range description for numbers
 */
function getNumberRanges(numbers) {
  if (!numbers || numbers.length === 0) return 'No predictions';
  
  const ranges = [];
  if (numbers.some(n => n <= 20)) ranges.push('Low (1-20)');
  if (numbers.some(n => n > 20 && n <= 40)) ranges.push('Mid (21-40)');  
  if (numbers.some(n => n > 40 && n <= 60)) ranges.push('Mid-High (41-60)');
  if (numbers.some(n => n > 60)) ranges.push('High (61-69)');
  
  return ranges.join(', ');
}

/**
 * Generate enhanced summary
 */
function generateEnhancedSummary(recommendations, drawCount) {
  let summary = `Analyzed ${drawCount} historical draws. `;
  
  const highConfCount = recommendations.highConfidence.length;
  const mediumConfCount = recommendations.mediumConfidence.length;
  
  summary += `Found ${highConfCount} high-confidence numbers`;
  if (highConfCount > 0) {
    summary += ` (${recommendations.highConfidence.slice(0, 3).join(', ')})`;
  }
  
  if (mediumConfCount > 0) {
    summary += ` and ${mediumConfCount} medium-confidence alternatives`;
  }
  
  summary += `. ${recommendations.alternativeSelections.length} alternative strategies available.`;
  
  return summary;
}