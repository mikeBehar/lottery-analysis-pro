  import { test, expect } from '@playwright/test';

test.describe('Lottery Analysis Pro', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the starting url before each test
    await page.goto('/');
  });

  test('should have the correct title', async ({ page }) => {
    // Check the page title
    await expect(page).toHaveTitle(/Lottery Analysis Pro/);
  });

  test('should have a disabled "ANALYZE" button on initial load', async ({ page }) => {
    // Find the analyze button
    const analyzeButton = page.locator('#analyzeBtn');
    
    // Check if the button is disabled
    await expect(analyzeButton).toBeDisabled();
  });

  test('should enable analysis and show results after uploading a valid CSV', async ({ page }) => {
    const analyzeButton = page.locator('#analyzeBtn');
    const energyResults = page.locator('#energy-results');
    const mlResults = page.locator('#ml-results');
    const recommendations = page.locator('#recommendations');

    // 1. Upload the file by setting the input directly
    await page.locator('#csvUpload').setInputFiles('data/test-data.csv');

    // 2. Verify button is enabled
    await expect(analyzeButton).toBeEnabled();

    // 3. Click analyze
    await analyzeButton.click();

    // 4. Verify results are shown in all panels
    // Use a generous timeout as ML models can take time to run
    await expect(energyResults).not.toBeEmpty({ timeout: 10000 });
    await expect(mlResults).not.toBeEmpty();
    await expect(recommendations).not.toBeEmpty();

    // Optional: Check for a specific result card to be more precise
    await expect(page.locator('.number-card')).not.toHaveCount(0);
    await page.pause(); // Keep browser open for inspection
  });
});