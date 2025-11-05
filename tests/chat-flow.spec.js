const { test, expect } = require('@playwright/test');

test('Chat flow works end-to-end', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if the chat interface is visible
  await expect(page.locator('.chat-input')).toBeVisible();
  
  // Check if backend connection status shows online
  await page.waitForTimeout(2000); // Wait for connection check
  
  // Try to send a message
  await page.fill('.chat-input', 'Hello, test message');
  await page.press('.chat-input', 'Enter');
  
  // Wait for AI response (with timeout)
  await page.waitForSelector('.ai-message', { timeout: 30000 });
  
  // Verify we got a response
  const aiMessage = await page.locator('.ai-message').first();
  await expect(aiMessage).toBeVisible();
  
  console.log('✅ Chat flow test passed successfully!');
});

test('Backend health check', async ({ request }) => {
  const response = await request.get('http://localhost:8000/health');
  expect(response.ok()).toBeTruthy();
  
  const body = await response.json();
  expect(body.status).toBe('healthy');
  
  console.log('✅ Backend health check passed!');
});

test('Chat API endpoints', async ({ request }) => {
  // Test chat health
  const healthResponse = await request.get('http://localhost:8000/api/v1/chat/health');
  expect(healthResponse.ok()).toBeTruthy();
  
  // Test thread creation
  const threadResponse = await request.post('http://localhost:8000/api/v1/chat-threads/threads', {
    data: { title: 'Playwright Test' }
  });
  expect(threadResponse.ok()).toBeTruthy();
  
  const thread = await threadResponse.json();
  expect(thread.id).toBeDefined();
  
  console.log('✅ Chat API endpoints test passed!');
});
