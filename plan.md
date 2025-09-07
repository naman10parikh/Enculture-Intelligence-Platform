High Level Plan
Here’s your draft rewritten in sentence case, clean and legible, with names removed but everything else kept verbatim:

At a high level this is the flow I am envisioning for our POC v1.1:

There are 5 personas we are building this for (each with a different view): employee, manager, manager’s manager, HR admin, and CEO.

Setup
•	The HR admin would for the first time log in to the platform and either see a separate company/org onboarding page or a new chat in our chat feature or the profile page or whatever UX you decide to do the following before anything else: fill the goal, purpose, culture values for that company.
•	Next, the HR admin would do user onboarding, where they will first decide what parts of the company’s employee data should be accessible to Enculture (e.g. only names, emails and teams aliases). Then, they will upload employee + each employee’s managers data and This sets up Enculture for the entire company and informs them via email, etc. that they can create an account and start using it.


Random employee logs in
•	Next, we can show an employee (an IC) logging in to the dashboard and they see the following pages: chat, insights, actions, surveys, and canvas.
•	Remember one thing: almost every page would render different content based on the persona so if a CEO logs in, the “view” should be selected for the entire Enculture dashboard including all the pages. Of course you can also give that option within every page but I was thinking a top level view would be great to render the pages accordingly.

Chat
•	This should be like the chatbots we have built like WeddingEase, like the current ChatGPT, etc. which allows you to spawn multiple chats, etc. This is a differentiating factor since we can make it all chat/AI-based for employees.
•	Just like M365 Copilot work tab which has context of your files, you should be able to call multiple agents with a ‘/‘ in your chat and ask questions to the Enculture (culture intelligence) bot that those agents are experts at running.
•	You should be able to take surveys from within the chat and ask the AI as you go during the process. We need cool cards for the same.
•	You should be able to get push notifications when a new survey comes your way and be able to take it in a new chat that opens up.
•	You should be able to ask questions about your insights and actions depending on what view you are using this chat in.
•	Design, vibe, aesthetics is all up to you but remember this would be an important touchpoint for employees so it should be intuitive and fun to use.
Surveys
•	Survey creation is chat based
•	AI-enabled survey creation tools page, allowing you to create, publish, and monitor the analytics around your different surveys in your team. For every step of the process, you can use AI to generate something based on your prompt or desire or voice input as well. Survey creation should be easy and fun.
•	Create:
o	First you declare name of the survey.
o	Then comes the following in sequence: context, desired survey outcomes.
o	After this, you can define “classifiers” (essentially category labels) up to 5 of them that questions in the survey will be tagged to so we can do data analysis on them. For example: classifier #1 = growth mindset. And its value could be empathy.
o	After this, for every survey outcome you can add one or more “metrics”, which are scores that you want to calculate from data analysis around the survey questions. For example, “employee engagement score” would be a metric to assess the outcome of employee engagement in the company. Metrics description is asked and ai generates a formula for calculating it
o	So now once you configure these things, you should be able to add as many questions as you want or AI generate them. For every question you should give the following options: question/statement, response type, mandatory or not, metric(s), classifier(s) names, classifier(s) values.
o	After this, comes the configuration page, showing you background image, languages, employees you are allowed to share the survey with (if you are a manager, you will only see your team for instance), date/time to release the survey, date/time to keep receiving responses until, etc.
o	Then you click publish! And it is out to the people in your team as a notification in their chat window where they can take it.
•	Analytics:
o	You should be able to drill down into your past surveys (either in progress or completed) and see all the above details in it.
o	There should be some data analysis per question, per classifier, per metric.
o	This is kept free form so you build something and we can see based on vibes what to add/modify from there. But it should show some analytics, charts, metrics, etc.
o	For inspiration, see Typeform, Qualtrics, Google Forms, AI survey taking startups.
Insights and actions (we discussed yesterday GAYU)
•	Adi will send the actual info to us for both these pages.
•	Broadly speaking though, based on the view you select, your dashboard will have a bunch of cards (even graphs can be shown as cards).
•	Every card would have a name and the top level data to show.
•	Every card should be clickable and show more details in the center of the screen or in some form of emphatic way.
•	Need to envision how we can connect the actions pieces of the insights with those insights and display them in a nice, non-cluttered way.
•	What else do we want to show in the actions page if we want it separate? An IDP (integrated development program) like Viva Goals that allows you to plan your career growth, a task list, etc.? Thoughts? This is open-ended.

Canvas/Safe Space
•	This is the creative space – the employee should be able to create new notes/canvases and in each of them either record or type whatever they want. There would be AI transcription + AI embedded in it so they can freeform with AI and generate anything.
•	For inspiration, the ChatGPT canvas feature is smooth, minimalistic, elegant, which could be the employee’s canvas page. And somehow there should be an ability to automatically gather insights from that canvas in the employee’s own private dashboard.
•	Ideally there should be some other magic touch which makes it something employees may want to use. Otherwise what’s the difference between ChatGPT canvas and this.
•	TL;DR: build freely, you got this.
