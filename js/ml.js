/*Machine Learning (ml.js)
trainLSTM(draws)
Version: 1.0.0 | Created: 2023-11-15
Purpose: Train LSTM model on number sequences.
 
 * @param {Array} draws - Historical draw data
 * @returns {tf.LayersModel} Trained TensorFlow.js model
 */
 
 
async function trainLSTM(draws) {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: 64, inputShape: [10, 1] }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  const { inputs, labels } = preprocessData(draws);
  await model.fit(inputs, labels, { epochs: 20 });
  return model;
}
