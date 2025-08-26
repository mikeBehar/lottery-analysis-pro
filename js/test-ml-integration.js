/**
 * Test script to verify LotteryML integration
 * Run this in browser console after loading the application
 */

console.log('Testing LotteryML integration...');

// Test 1: Check if LotteryML is available globally
if (typeof window.lotteryML !== 'undefined') {
  console.log('✅ LotteryML global instance found');
  console.log('Version:', window.lotteryML.version);
  console.log('Status:', window.lotteryML.status);
  console.log('TensorFlow available:', window.lotteryML.isTFLoaded);
} else {
  console.error('❌ LotteryML not found globally');
}

// Test 2: Test basic functionality
async function testBasicFunctionality() {
  console.log('\nTesting basic functionality...');
  
  try {
    // Test with mock data
    const mockDraws = [
      { numbers: [1, 2, 3, 4, 5, 6], powerball: 7 },
      { numbers: [7, 8, 9, 10, 11, 12], powerball: 13 },
      { numbers: [13, 14, 15, 16, 17, 18], powerball: 19 },
      { numbers: [19, 20, 21, 22, 23, 24], powerball: 25 },
      { numbers: [25, 26, 27, 28, 29, 30], powerball: 31 }
    ];
    
    // Test prediction
    const prediction = await window.lotteryML.predictNextNumbers(mockDraws);
    console.log('✅ Prediction test passed');
    console.log('Predicted numbers:', prediction.numbers);
    console.log('Confidence:', prediction.confidence);
    console.log('Model:', prediction.model);
    
    // Test status
    const status = window.lotteryML.getStatus();
    console.log('✅ Status test passed');
    console.log('Status:', status);
    
  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
  }
}

// Test 3: Test error handling
async function testErrorHandling() {
  console.log('\nTesting error handling...');
  
  try {
    // Test with empty data
    const emptyPrediction = await window.lotteryML.predictNextNumbers([]);
    console.log('✅ Empty data handling:', emptyPrediction.model);
    
    // Test with invalid data
    const invalidPrediction = await window.lotteryML.predictNextNumbers(null);
    console.log('✅ Invalid data handling:', invalidPrediction.model);
    
  } catch (error) {
    console.error('❌ Error handling test failed:', error);
  }
}

// Run tests
setTimeout(async () => {
  await testBasicFunctionality();
  await testErrorHandling();
  console.log('\n🎉 Integration tests completed!');
}, 1000);
