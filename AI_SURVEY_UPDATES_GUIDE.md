# 🤖 AI Survey Update Commands - Complete Guide

## Overview
This guide lists all survey components that can be updated through natural language AI chat commands. Users can make targeted updates to any part of their survey without manually navigating the wizard.

---

## 📋 **Updatable Survey Components**

### **1. Survey Name/Title**
**What it is:** The main title of your survey  
**Example commands:**
- "Change the survey name to 'Q1 Employee Engagement Survey'"
- "Update the title to something more professional"
- "Rename this survey to 'Workplace Culture Assessment'"
- "Make the survey name shorter"

**AI will:**
- Navigate to Step 1 (Name)
- Update the survey name
- Provide professional naming suggestions if requested

---

### **2. Survey Context**
**What it is:** The background/purpose description of the survey  
**Example commands:**
- "Update the context to focus on remote work challenges"
- "Change the survey description to emphasize team collaboration"
- "Improve the context to be more engaging"
- "Make the purpose statement more detailed"
- "Add information about why this survey matters"

**AI will:**
- Navigate to Step 2 (Context)
- Rewrite or enhance the context
- Add relevant statistics or trends if requested

---

### **3. Desired Outcomes**
**What it is:** 4-6 specific, measurable goals for the survey  
**Example commands:**
- "Add more desired outcomes"
- "Update the outcomes to be more specific"
- "Change the first outcome to focus on retention"
- "Generate better outcomes based on the context"

**AI will:**
- Navigate to Step 2 (Context page includes outcomes)
- Generate or update outcome statements
- Ensure they're measurable and actionable

---

### **4. Classifiers (Demographics)**
**What it is:** Categories to segment survey responses (Department, Experience Level, etc.)  
**Example commands:**
- "Add more classifiers for better segmentation"
- "Update the classifier options"
- "Add a classifier for remote vs. office workers"
- "Change the department classifier to include more options"
- "Generate classifiers relevant to my survey context"

**AI will:**
- Navigate to Step 3 (Classifiers)
- Add/update classifier categories
- Populate with relevant options (3-5 values per classifier)
- Ensure they align with survey goals

---

### **5. Metrics (Analytics)**
**What it is:** Key performance indicators and formulas for data analysis  
**Example commands:**
- "Add metrics for measuring engagement"
- "Update the metric formulas to be more sophisticated"
- "Create a metric that tracks satisfaction by department"
- "Improve the analytics metrics"
- "Generate formulas that reference the questions"

**AI will:**
- Navigate to Step 4 (Metrics)
- Create/update metric definitions
- Generate appropriate formulas (AVG, COUNT, etc.)
- Link metrics to classifiers for segmentation

---

### **6. Questions**
**What it is:** The actual survey questions respondents will answer  
**Example commands:**
- "Add more questions about work-life balance"
- "Update question 3 to be less biased"
- "Generate questions that measure team collaboration"
- "Make the questions more engaging"
- "Add open-ended questions for qualitative feedback"
- "Create scale questions for satisfaction measurement"
- "Improve all the questions to reduce survey fatigue"

**AI will:**
- Navigate to Step 5 (Questions)
- Add, modify, or enhance questions
- Set appropriate question types (scale, multiple_choice, text, yes_no)
- Link questions to relevant metrics and classifiers
- Add helper descriptions for each question
- Set required/optional flags intelligently

**Question fields AI configures:**
- Question text
- Description (helper text)
- Response type
- Answer options
- Required/optional flag
- Linked metric
- Linked classifier

---

### **7. Configuration Settings**
**What it is:** Survey settings like audience, timing, anonymity  
**Example commands:**
- "Update the target audience to include all departments"
- "Change the survey deadline"
- "Make this survey anonymous"
- "Update the release date"
- "Add more employees to the selected audience"

**AI will:**
- Navigate to Step 6 (Configuration)
- Update appearance, timing, or response settings
- Adjust audience targeting

---

## 🎯 **Multi-Component Updates**

You can request updates to multiple components at once:

**Example commands:**
- "Improve the entire survey to focus on remote work"
  - AI updates: context, outcomes, classifiers, metrics, AND questions
  
- "Make this survey more data-driven"
  - AI updates: metrics, formulas, question-metric links
  
- "Enhance the questions and metrics"
  - AI updates: both sections with improved content

---

## 💡 **Smart Update Features**

### **Contextual Understanding**
AI understands the current survey state and makes updates that:
- ✅ Maintain consistency across all sections
- ✅ Link questions to appropriate metrics
- ✅ Assign relevant classifiers
- ✅ Keep survey goals aligned

### **Automatic Navigation**
When you request an update, AI automatically:
- 🎯 Jumps to the correct wizard step
- 📝 Shows you the changes
- 💾 Auto-saves the updates
- ✨ Provides confirmation

### **Intelligent Defaults**
AI sets smart defaults for:
- Question types based on what's being measured
- Required/optional flags based on question importance
- Metric-question links based on content analysis
- Classifier assignments based on segmentation needs

---

## 📝 **Command Patterns**

### **Direct Updates**
- "Change [component] to [value]"
- "Update [component] with [details]"
- "Modify [component] to include [requirements]"

### **Enhancement Requests**
- "Improve [component]"
- "Make [component] more [adjective]"
- "Enhance [component]"
- "Optimize [component] for [goal]"

### **Generation Requests**
- "Generate [component] based on [context]"
- "Create [component] that measures [metric]"
- "Add [component] focused on [topic]"

### **Refinement Requests**
- "Make [component] shorter/longer"
- "Simplify [component]"
- "Make [component] more professional/engaging"

---

## 🚫 **What AI Cannot Update (Manual Only)**

1. **Branding/Visual Design**
   - Colors, fonts, logos
   - Background images
   - Visual theme

2. **Survey Publishing**
   - Final publishing action
   - Distribution to specific users
   - Survey status changes

3. **Historical Data**
   - Past survey responses
   - Completed surveys
   - Response analytics

---

## 🔄 **Update Workflow**

1. **User sends natural language command**
   - "Update the questions to focus on wellness"

2. **AI detects intent and component**
   - Identifies: Questions section needs updating
   - Extracts: "wellness" as the focus

3. **AI navigates automatically**
   - Jumps to Step 5 (Questions)
   - Shows ephemeral notification

4. **AI generates updates**
   - Calls backend OpenAI service
   - Generates wellness-focused questions
   - Maintains existing survey structure

5. **Changes appear in wizard**
   - User sees updated content
   - Can manually adjust if needed
   - Changes are auto-saved

6. **Confirmation message**
   - AI confirms what was updated
   - Mentions the wizard step number
   - Encourages review

---

## 💬 **Example Conversation Flow**

**User:** "Create a survey about employee wellness"  
**AI:** *Creates full survey with 8 questions, 2 metrics, 4 classifiers*

**User:** "Add more questions about mental health"  
**AI:** *Navigates to Questions step, adds 3 mental health questions*

**User:** "Update the metrics to measure wellness better"  
**AI:** *Navigates to Metrics step, enhances formulas and descriptions*

**User:** "Make the survey context more engaging"  
**AI:** *Navigates to Context step, rewrites with compelling statistics*

**User:** "Change question 4 to be less personal"  
**AI:** *Navigates to Questions, rewrites question 4 with better phrasing*

---

## ✨ **Best Practices**

1. **Be Specific:** "Add questions about work-life balance" > "Add questions"
2. **One Section at a Time:** For major changes, update one section, review, then move to next
3. **Use Context:** Reference survey goals when requesting updates
4. **Review Changes:** Always review AI updates before publishing
5. **Iterate:** Start with AI suggestions, then refine manually if needed

---

## 🎓 **Tips for Power Users**

- **Batch Updates:** "Update questions 1-3 to use 5-point scales"
- **Cross-Reference:** "Link all satisfaction questions to the Satisfaction Index metric"
- **Template Requests:** "Generate questions similar to industry standard NPS surveys"
- **Refinement:** "Make the questions less formal and more conversational"

---

**Remember:** All updates are reversible - you can always manually edit in the wizard or ask AI to change it again! 🔄

