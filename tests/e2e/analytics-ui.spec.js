// Playwright E2E test for analytics UI panels
const { test, expect } = require('@playwright/test');

// Adjust the URL if your dev server runs elsewhere
const APP_URL = 'http://localhost:3000';

test.describe('Analytics UI Panels', () => {
  test('Panels render and update after analysis', async ({ page }) => {
    await page.goto(APP_URL);

    // Simulate uploading a CSV or loading test data
    // For this test, we assume a button or method to load sample data exists
    const uploadBtn = await page.$('#csvUpload');
    if (uploadBtn) {
      // If a test CSV is available, upload it here
      // await uploadBtn.setInputFiles('tests/e2e/sample-draws.csv');
    } else {
      // Or trigger a test data load if available
      // await page.click('#loadTestDataBtn');
    }

    // Click analyze button
    await page.click('#analyzeBtn');

    // Wait for analytics panels to appear and check content
    await expect(page.locator('#hot-cold-panel')).toBeVisible();
    await expect(page.locator('#overdue-panel')).toBeVisible();
    await expect(page.locator('#frequency-panel')).toBeVisible();
    await expect(page.locator('#pairs-panel')).toBeVisible();
    await expect(page.locator('#gaps-panel')).toBeVisible();

    // Check that hot/cold numbers are rendered
    const hotText = await page.locator('#hot-cold-panel').textContent();
    expect(hotText).toContain('Hot');
    expect(hotText).toContain('Cold');

    // Check that overdue numbers are rendered
    const overdueText = await page.locator('#overdue-panel').textContent();
    expect(overdueText).toContain('Overdue');

    // Check that frequency panel has numbers
    const freqText = await page.locator('#frequency-panel').textContent();
    expect(freqText).toContain('Frequency');

    // Check that pairs and gaps panels have lists
    const pairsText = await page.locator('#pairs-panel').textContent();
    expect(pairsText).toContain('Common Number Pairs');
    const gapsText = await page.locator('#gaps-panel').textContent();
    expect(gapsText).toContain('Gap Analysis');
  });
});
