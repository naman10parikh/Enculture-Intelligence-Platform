const { test, expect } = require('@playwright/test');

test.describe('Complete Survey Flow - Manager to Employee', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
    
    // Wait for the page to fully load - look for the sidebar with user profile
    await page.waitForSelector('text=Michael Chen', { timeout: 10000 });
  });

  test('Manager creates survey → Employee receives notification → Takes survey', async () => {
    console.log('🎬 Starting complete survey flow test...');
    
    // ==========================================
    // STEP 1: Verify Manager (Michael Chen) is logged in
    // ==========================================
    console.log('📋 Step 1: Verify Manager login...');
    
    await expect(page.locator('text=Michael Chen')).toBeVisible();
    await expect(page.locator('text=Manager')).toBeVisible();
    
    // ==========================================
    // STEP 2: Manager creates a survey using /survey command
    // ==========================================
    console.log('📝 Step 2: Manager creates survey...');
    
    // Find and click the chat input
    const chatInput = page.locator('textarea[placeholder*="Ask about culture"]');
    await expect(chatInput).toBeVisible();
    
    // Type /survey command
    await chatInput.fill('/survey');
    await page.keyboard.press('Enter');
    
    // Wait for survey creation interface to appear
    await page.waitForSelector('text=New Survey', { timeout: 5000 });
    
    // Fill in survey details
    const surveyNameInput = page.locator('input[placeholder*="Q4 Team Engagement"]');
    await expect(surveyNameInput).toBeVisible();
    await surveyNameInput.fill('Employee Experience Survey');
    
    // Navigate through survey creation steps
    await page.click('button:has-text("Next")');
    
    // Add survey context
    await page.waitForSelector('textarea[placeholder*="context"]');
    const contextInput = page.locator('textarea[placeholder*="context"]');
    await contextInput.fill('We want to understand how our employees feel about their work experience.');
    
    // Continue to questions step
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")'); // Skip outcomes
    await page.click('button:has-text("Next")'); // Skip classifiers  
    await page.click('button:has-text("Next")'); // Skip metrics
    
    // Add a sample question
    await page.waitForSelector('button:has-text("Add Question")');
    await page.click('button:has-text("Add Question")');
    
    const questionInput = page.locator('input[placeholder*="Enter your question"]');
    await questionInput.fill('How satisfied are you with your current role?');
    
    // Navigate to publishing step
    await page.click('button:has-text("Next")'); // Questions
    await page.click('button:has-text("Next")'); // Configuration
    
    // ==========================================
    // STEP 3: Publish survey to Emily Rodriguez
    // ==========================================
    console.log('📤 Step 3: Publishing survey...');
    
    await page.waitForSelector('button:has-text("Publish")');
    await page.click('button:has-text("Publish")');
    
    // Wait for publish confirmation
    await page.waitForSelector('text=Survey published successfully', { timeout: 5000 });
    
    // ==========================================
    // STEP 4: Switch to Emily Rodriguez (Employee)
    // ==========================================
    console.log('👩‍🎨 Step 4: Switching to Employee (Emily Rodriguez)...');
    
    // Click on user dropdown in sidebar
    await page.click('button:has-text("Michael Chen Manager")');
    
    // Wait for dropdown to appear and click Emily Rodriguez
    await page.waitForSelector('text=Emily Rodriguez');
    await page.click('text=Emily Rodriguez');
    
    // Verify user switch
    await expect(page.locator('text=Emily Rodriguez')).toBeVisible();
    await expect(page.locator('text=Employee')).toBeVisible();
    
    // ==========================================
    // STEP 5: Verify Employee receives survey notification
    // ==========================================
    console.log('🔔 Step 5: Verifying survey notification in chat...');
    
    // Wait for WebSocket connection and survey notification
    await page.waitForTimeout(2000); // Allow time for WebSocket notification
    
    // Look for survey card in chat messages
    const surveyCard = page.locator('.survey-card');
    await expect(surveyCard).toBeVisible({ timeout: 10000 });
    
    // Verify survey card content
    await expect(surveyCard.locator('text=Employee Experience Survey')).toBeVisible();
    await expect(surveyCard.locator('text=Survey Ready')).toBeVisible();
    await expect(surveyCard.locator('button:has-text("Take Survey")')).toBeVisible();
    
    // ==========================================
    // STEP 6: Employee clicks survey card to open survey
    // ==========================================
    console.log('📋 Step 6: Employee opens survey...');
    
    // Click the survey card to open survey interface
    await surveyCard.click();
    
    // Verify survey interface opens in split-screen mode
    await page.waitForSelector('text=Taking Survey', { timeout: 5000 });
    await expect(page.locator('text=Employee Experience Survey')).toBeVisible();
    
    // ==========================================
    // STEP 7: Employee takes the survey
    // ==========================================
    console.log('✍️ Step 7: Employee answers survey questions...');
    
    // Wait for survey questions to load
    await page.waitForSelector('text=How satisfied are you', { timeout: 5000 });
    
    // Look for rating/scale options and select one
    const ratingOption = page.locator('input[type="radio"], button[data-rating]').first();
    if (await ratingOption.count() > 0) {
      await ratingOption.click();
    }
    
    // Submit the survey
    const submitButton = page.locator('button:has-text("Submit Survey")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Wait for submission confirmation
      await page.waitForSelector('text=Survey submitted', { timeout: 5000 });
    }
    
    // ==========================================
    // STEP 8: Verify survey flow completion
    // ==========================================
    console.log('✅ Step 8: Verifying flow completion...');
    
    // Survey interface should close or show completion message
    await expect(page.locator('text=Thank you for completing')).toBeVisible({ timeout: 5000 });
    
    console.log('🎉 Complete survey flow test passed!');
  });

  test('Employee chat persistence - fresh history for new user', async () => {
    console.log('🔄 Testing employee chat persistence...');
    
    // Start as manager
    await expect(page.locator('text=Michael Chen')).toBeVisible();
    
    // Switch to employee
    await page.click('button:has-text("Michael Chen Manager")');
    await page.waitForSelector('text=Emily Rodriguez');
    await page.click('text=Emily Rodriguez');
    
    // Verify employee has fresh chat history
    await expect(page.locator('text=Emily Rodriguez')).toBeVisible();
    
    // Employee should have a clean chat interface or initial welcome message
    const chatMessages = page.locator('.message-container');
    const messageCount = await chatMessages.count();
    
    // Employee should have minimal messages (just welcome/initial)
    expect(messageCount).toBeLessThanOrEqual(2);
    
    console.log('✅ Employee chat persistence test passed!');
  });

  test('WebSocket connection stability during user switching', async () => {
    console.log('🌐 Testing WebSocket stability...');
    
    // Monitor console for WebSocket messages
    const wsMessages = [];
    page.on('console', msg => {
      if (msg.text().includes('WebSocket')) {
        wsMessages.push(msg.text());
      }
    });
    
    // Switch between users multiple times
    for (let i = 0; i < 3; i++) {
      // Switch to employee
      await page.click('button:has-text("Michael Chen Manager")');
      await page.click('text=Emily Rodriguez');
      await page.waitForTimeout(1000);
      
      // Switch back to manager
      await page.click('button:has-text("Emily Rodriguez Employee")');
      await page.click('text=Michael Chen');
      await page.waitForTimeout(1000);
    }
    
    // Verify no excessive connection spam
    const connectionMessages = wsMessages.filter(msg => 
      msg.includes('connected') || msg.includes('disconnected')
    );
    
    // Should have reasonable number of connection messages (not spam)
    expect(connectionMessages.length).toBeLessThan(20);
    
    console.log('✅ WebSocket stability test passed!');
  });
});
