# Complete Test Plan - AI-Powered Survey Updates 🧪

## Backend Tests (Using curl) ✅

### Test 1: AI Section Detection
```bash
curl -X POST http://localhost:8000/api/v1/chat/ai-detect-sections \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "make the first item optional and add Spanish",
    "current_data": {
      "name": "Test Survey",
      "questions": [{"id": "q1", "question": "Test", "mandatory": true}],
      "configuration": {"languages": ["English"]}
    }
  }'
```

**Expected Result:**
```json
{"detected_sections": ["questions", "configuration"], "success": true}
```

### Test 2: Update Questions
```bash
curl -X POST http://localhost:8000/api/v1/chat/ai-edit-section \
  -H "Content-Type: application/json" \
  -d '{
    "section_type": "questions",
    "current_data": {
      "name": "Test Survey",
      "questions": [{
        "id": "q1",
        "question": "How satisfied are you?",
        "response_type": "scale",
        "mandatory": true
      }]
    },
    "edit_request": "make question 1 optional and change to text response"
  }'
```

**Expected Result:**
- `response_type`: "text"
- `mandatory`: false
- `required`: false
- `options`: []

### Test 3: Update Configuration
```bash
curl -X POST http://localhost:8000/api/v1/chat/ai-edit-section \
  -H "Content-Type: application/json" \
  -d '{
    "section_type": "configuration",
    "current_data": {
      "name": "Test Survey",
      "configuration": {"languages": ["English"]}
    },
    "edit_request": "add Spanish and French"
  }'
```

**Expected Result:**
```json
{"languages": ["English", "Spanish", "French"]}
```

### Test 4: Generate Metrics
```bash
curl -X POST http://localhost:8000/api/v1/chat/ai-edit-section \
  -H "Content-Type: application/json" \
  -d '{
    "section_type": "metrics",
    "current_data": {
      "name": "Culture Survey",
      "context": "Employee engagement survey",
      "classifiers": [{"name": "Department"}]
    },
    "edit_request": "add engagement metrics"
  }'
```

**Expected Result:**
- Array of 3-5 metrics
- Each with: name, description, formula, selectedClassifiers

### Test 5: Generate Outcomes
```bash
curl -X POST http://localhost:8000/api/v1/chat/ai-edit-section \
  -H "Content-Type: application/json" \
  -d '{
    "section_type": "outcomes",
    "current_data": {
      "name": "Culture Survey",
      "context": "Employee engagement"
    },
    "edit_request": "generate outcomes focused on retention"
  }'
```

**Expected Result:**
- Array of 3-5 outcome strings
- Each focused on retention goals

## Frontend Tests (In Browser) 🌐

### Setup: Create a Survey First
1. Open the app in your browser
2. Create a survey: "create a survey about employee engagement"
3. Wait for the survey wizard to populate with sample data
4. Now you're ready to test updates!

### Test 6: Simple Question Update
**Action:** Type in chat: "make question 1 optional"

**Expected UX:**
1. Message appears in chat
2. Notification: "AI is analyzing your request..."
3. Notification: "Processing your questions update..."
4. Canvas opens (if closed) or stays open
5. Wizard navigates to Page 5 (Questions)
6. Success message: "✅ Updated questions successfully!"
7. Question 1 now shows as "optional" (not required)

### Test 7: Configuration Update
**Action:** Type: "add Spanish and French to the languages"

**Expected UX:**
1. AI analyzes request
2. Notification: "Processing your configuration update..."
3. Canvas stays/opens to wizard
4. Wizard navigates to Page 6 (Configuration)
5. Success message: "✅ Updated configuration successfully!"
6. Languages dropdown now shows: English, Spanish, French

### Test 8: Compound Update (Multi-Component)
**Action:** Type: "make question 1 optional and add German"

**Expected UX:**
1. Message appears
2. Notification: "AI is analyzing your request..."
3. AI detects: ["questions", "configuration"]
4. Notification: "Processing updates for 2 components..."
5. Both updates process in parallel
6. Success: "✅ Successfully updated 2 component(s): questions, configuration"
7. Wizard shows first updated section (questions)
8. Both changes are visible when you navigate between pages

### Test 9: Metrics Generation
**Action:** Type: "add metrics for engagement tracking"

**Expected UX:**
1. AI detects: ["metrics"]
2. Processing metrics update...
3. Wizard navigates to Page 7 (Metrics)
4. New metrics appear (3-5 items)
5. Each metric has: name, description, formula, linked classifiers

### Test 10: Outcomes Generation
**Action:** Type: "generate outcomes focused on DEI"

**Expected UX:**
1. AI detects: ["outcomes"]
2. Processing outcomes update...
3. Wizard navigates to Page 2 (Context) - outcomes section
4. New outcomes appear (3-5 items)
5. Outcomes are focused on DEI goals

### Test 11: Canvas Closed → Auto-Open
**Action:** 
1. Close the survey canvas (X button)
2. Type: "make question 2 a scale from 1 to 10"

**Expected UX:**
1. AI analyzes request
2. AI detects: ["questions"]
3. Notification: "Opening survey wizard..."
4. Canvas opens automatically
5. Wizard shows Page 5 (Questions)
6. Question 2 is now a scale with options 1-10

### Test 12: Natural Language Variations
Try these different phrasings - all should work:

**Question Updates:**
- "make the first item optional"
- "I want question 1 to be optional"
- "change Q1 to optional"
- "make the first survey item not required"

**Configuration:**
- "add Spanish"
- "translate to Spanish and French"
- "I want the survey in German too"
- "add French to the languages"

**Multiple Components:**
- "make item 1 optional and add Spanish"
- "change Q1 to text and add French"
- "make the survey anonymous and add metrics"

### Test 13: Console Logging (Developer Tools)
Open browser console and type a request:

**Expected Console Output:**
```
✅ AI detected sections: ["questions", "configuration"]
Multi-component update for sections: ["questions", "configuration"]
Calling aiEditSection for questions
Calling aiEditSection for configuration
Received result for questions: {...}
Received result for configuration: {...}
All update results: [{...}, {...}]
```

## Success Criteria ✅

For each test, verify:

### Backend (curl tests)
- [ ] API returns 200 status code
- [ ] JSON response is valid
- [ ] `success: true` in response
- [ ] Updated content matches expectations
- [ ] No error messages in logs

### Frontend (browser tests)
- [ ] User message appears in chat
- [ ] AI detection works (console shows detected sections)
- [ ] Loading indicators show ("AI is analyzing...")
- [ ] Canvas opens if needed
- [ ] Wizard navigates to correct page
- [ ] Success message appears
- [ ] Changes are visible in UI
- [ ] Changes persist after refresh
- [ ] No console errors

### UX Quality
- [ ] Response time < 5 seconds
- [ ] Clear feedback at each step
- [ ] Smooth transitions
- [ ] No flickering or jumps
- [ ] Natural language works
- [ ] Multiple phrasings work
- [ ] Compound requests work

## Troubleshooting Guide 🔧

### Issue: "No sections detected"
**Check:**
- Is there an existing survey? (surveyDraft must have content)
- Check browser console for AI detection logs
- Try a more explicit phrase: "update question 1" instead of "change item 1"

### Issue: "Failed to update section"
**Check:**
- Backend logs in terminal (look for errors)
- Network tab in DevTools (API call status)
- Try the curl command directly to isolate backend issue

### Issue: Changes not visible in UI
**Check:**
- Check browser console for state updates
- Verify wizard is on correct page
- Try navigating between pages manually
- Check local storage for saved draft

### Issue: Canvas doesn't open
**Check:**
- Is there an existing survey draft?
- Check for JavaScript errors in console
- Try manually opening canvas first, then testing updates

## All 7 Pages Checklist ✅

Test at least one update for each page:

- [ ] **Page 1 (Name)**: "change the survey title to Q1 2025 Culture"
- [ ] **Page 2 (Context)**: "expand the context to include remote work"
- [ ] **Page 3 (Outcomes)**: "generate outcomes focused on retention"
- [ ] **Page 4 (Classifiers)**: "add classifiers for tenure"
- [ ] **Page 5 (Questions)**: "make question 1 optional"
- [ ] **Page 6 (Configuration)**: "add Spanish and French"
- [ ] **Page 7 (Metrics)**: "add engagement metrics"

## Performance Tests ⚡

### Response Times (Target)
- AI section detection: < 2 seconds
- Single section update: < 5 seconds
- Multi-component update: < 8 seconds
- Total UX flow: < 10 seconds from typing to seeing changes

### Parallel Processing
For compound requests like "make Q1 optional and add Spanish":
- Both API calls should happen simultaneously
- Total time should be ~same as single update (not 2x)
- Console should show parallel processing logs

## Edge Cases 🧪

Test these tricky scenarios:

1. **Empty survey**: Create survey, don't wait for generation, try to update
   - Expected: May fail gracefully or ask to wait

2. **Very long request**: "make question 1 optional and add Spanish French German Italian and make it anonymous and add metrics"
   - Expected: AI should detect all relevant sections

3. **Ambiguous request**: "update the survey"
   - Expected: May not detect specific sections, falls through to chat

4. **Conflicting request**: "make question 1 required and optional"
   - Expected: AI should handle intelligently (likely make it required)

## Final Checklist ✅

Before considering this feature "done":

- [ ] All backend curl tests pass
- [ ] All 7 pages can be updated via chat
- [ ] Natural language works (not just keywords)
- [ ] Compound requests work
- [ ] Canvas auto-opens when needed
- [ ] Clear feedback at every step
- [ ] No console errors
- [ ] Changes persist after refresh
- [ ] Performance is acceptable (< 10s total)
- [ ] Multiple phrasings work for same intent
- [ ] Error handling is graceful

## Quick Smoke Test 🚀

If you want to quickly verify everything works, run this sequence:

1. "create a survey about employee engagement"
2. Wait for wizard to populate
3. "make question 1 optional" → should work
4. "add Spanish" → should work  
5. "add engagement metrics" → should work
6. "make Q2 a scale and add French" → both should work

If all 6 commands work, the system is functioning correctly! 🎉


