import { test, expect } from '@playwright/test';

test('Preview page functionality test', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3000');
  
  // Wait for the app to load
  await page.waitForSelector('[data-testid="chat-container"], .app-container, body', { timeout: 10000 });
  
  console.log('App loaded successfully');
  
  // Create a new survey
  await page.click('button:has-text("Create Survey"), button:has-text("Create")');
  await page.waitForTimeout(2000);
  
  console.log('Clicked Create Survey');
  
  // Add survey name
  const nameInput = page.locator('input[placeholder*="survey"], input[placeholder*="name"], input[type="text"]').first();
  await nameInput.fill('Test Survey for Preview');
  await page.waitForTimeout(1000);
  
  console.log('Added survey name');
  
  // Move to context step
  await page.click('button:has-text("Next"), button:has-text("Continue")');
  await page.waitForTimeout(1000);
  
  // Add survey context
  const contextTextarea = page.locator('textarea, input[placeholder*="context"], input[placeholder*="description"]').first();
  await contextTextarea.fill('This is a test survey to verify the preview functionality works correctly.');
  await page.waitForTimeout(1000);
  
  console.log('Added survey context');
  
  // Navigate to questions step (might need to click Next multiple times)
  for (let i = 0; i < 3; i++) {
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
  }
  
  console.log('Navigated to questions section');
  
  // Add a test question
  const addQuestionButton = page.locator('button:has-text("Add Question"), button:has-text("Add"), .add-question-btn').first();
  if (await addQuestionButton.isVisible()) {
    await addQuestionButton.click();
    await page.waitForTimeout(1000);
  }
  
  // Fill in question text
  const questionInput = page.locator('input[placeholder*="question"], textarea[placeholder*="question"]').first();
  if (await questionInput.isVisible()) {
    await questionInput.fill('How satisfied are you with our company culture?');
    await page.waitForTimeout(1000);
    console.log('Added test question');
  }
  
  // Try to switch to Preview tab
  console.log('Attempting to switch to Preview tab...');
  
  const previewButton = page.locator('button:has-text("Preview")');
  await expect(previewButton).toBeVisible({ timeout: 5000 });
  
  // Click Preview button
  await previewButton.click();
  await page.waitForTimeout(2000);
  
  console.log('Clicked Preview button');
  
  // Check if preview loads without crashing
  await page.waitForSelector('body', { timeout: 5000 });
  
  // Verify the page is not blank
  const bodyContent = await page.textContent('body');
  expect(bodyContent.length).toBeGreaterThan(100);
  
  console.log('Preview page loaded successfully - content length:', bodyContent.length);
  
  // Check for preview-specific elements
  const previewElements = [
    '.survey-preview-modern',
    '.preview-header-modern', 
    '.survey-title-modern',
    '.questions-grid-modern'
  ];
  
  for (const selector of previewElements) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      console.log(`✅ Found preview element: ${selector}`);
    } else {
      console.log(`⚠️  Preview element not found: ${selector}`);
    }
  }
  
  // Check if survey title appears in preview
  await expect(page.locator('h1, .survey-title-modern')).toContainText('Test Survey');
  
  // Check if survey description appears
  await expect(page.getByText('test survey to verify')).toBeVisible();
  
  console.log('✅ Preview functionality test passed!');
});
