// csv-parser.js
// Handles reading file content and parsing CSV draws for lottery-analysis-pro

/**
 * Reads the content of a File object as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error(e?.target?.error?.message || 'File read error'));
    reader.readAsText(file);
  });
}

/**
 * Parses CSV content into draws using PapaParse.
 * @param {string} content
 * @param {object} options (optional)
 * @returns {Promise<Array>} Resolves to array of draw objects
 */
export function parseCSVWithPapaParse(content, options = {}) {
  function parseDrawRow(row, idx) {
    if (row.length < 7) {
      console.error(`[CSV PARSE] Row ${idx+3} too short:`, row);
      return { error: true };
    }
    const [drawDate, n1, n2, n3, n4, n5, powerball] = row;
    const whiteBalls = [n1, n2, n3, n4, n5].map(Number);
    const redBall = Number(powerball);
    if (whiteBalls.some(isNaN) || new Set(whiteBalls).size !== 5 || whiteBalls.some(n => n < 1 || n > 69)) {
      console.error(`[CSV PARSE] Invalid white ball numbers in row ${idx+3}:`, row, 'Parsed:', whiteBalls);
      return { error: true };
    }
    if (isNaN(redBall) || redBall < 1 || redBall > 26) {
      console.error(`[CSV PARSE] Invalid Powerball (red ball) in row ${idx+3}:`, row, 'Parsed:', redBall);
      return { error: true };
    }
    const date = new Date(drawDate);
    if (isNaN(date.getTime())) {
      console.error(`[CSV PARSE] Invalid date in row ${idx+3}:`, row, 'Parsed:', drawDate);
      return { error: true };
    }
    return {
      error: false,
      draw: {
        date: date,
        whiteBalls: whiteBalls,
        powerball: redBall
      }
    };
  }
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
      ...options,
      complete: function(results) {
        if (results.errors.length > 0) {
          reject(new Error(`CSV errors: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }
        try {
          let errorCount = 0;
          let draws = [];
          results.data.slice(2).forEach((row, idx) => {
            const parsed = parseDrawRow(row, idx);
            if (parsed.error) {
              errorCount++;
              return;
            }
            draws.push(parsed.draw);
          });
          resolve({ draws, errorCount });
        } catch (error) {
          reject(new Error(error instanceof Error ? error.message : String(error)));
        }
      },
      error: function(error) {
        let msg = 'Unknown error';
        if (error && typeof error.message === 'string') {
          msg = error.message;
        } else if (typeof error === 'string') {
          msg = error;
        } else if (error) {
          msg = JSON.stringify(error);
        }
        reject(new Error(`CSV parsing failed: ${msg}`));
      }
    });
  });
}
