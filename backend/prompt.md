* Start by reading CLAUDE.md to understand the project structure and conventions.

# authentication error handling
* 

## before starting the task:
* ask me questions if you have any doubts. or want to confirm your understanding.
* provide recommendations to improve the task.

## After completing the task:
* make sure to update the related files according to changes related to it.
* update any related API, routes and stuff
* update the swagger documentation to the frontend team if needed.
* update the claude.md according to changes related to it.
* update the seeds "prisma/seed.ts" file according to changes related to it.

## features:
* /ultraplan
* /ultrathink
* /skills
* /compact
* /context usage
* /model opusplan
* /clear
* /security-review 
* /review
* /simplify
* /update-config
* /claude-api
* /fewer-permission-prompts

  1. /security-review — Scans your pending branch changes for security issues. Given you're building JWT auth, Google OAuth, password reset OTPs, and session tokens,
  this would catch real problems before they ship.                                                                                                                      
  2. /review — Full PR review: checks logic, edge cases, and code quality across all commits on the branch. Useful before merging Aland-Branch into main.
  3. /simplify — Reviews recently changed code for redundancy and quality, then fixes what it finds. Good to run after implementing a big feature.

  Moderate value:

  4. /update-config — Sets up hooks in settings.json for automated behaviors, e.g. "always run typecheck before committing" or "show a summary when Claude stops". More 
  powerful than manually editing settings.
  5. /claude-api — Specialized for building with the Anthropic SDK (prompt caching, tool use, model selection). Less relevant since you're using Gemini/OpenAI directly,
   but useful if you ever add Claude as a provider.




* Read docs/services/ai-providers.md and docs/ai-providers/llm.md to understand the AI stack decisions we made.


## update the docs - AI services related
* as our last conversation we were planning to choose the perfect API-AI services for our project, we need to pick a TTS, STT, and LLM... but I belive that we did not researched very good, for that step by step we discuss about 
1. MML
2. STT
3. TTS
* Read docs/services/ai-providers.md and docs/ai-providers/ to understand the AI stack decisions we made.
* this time I'll provide you the website that you can research to get the newest information, and list the best choices and I'll hear your recommendation and we decide on it...

 We finished planning. The AI module at src/modules/ai/ exists but still uses OpenAI as a placeholder. The goal now is to implement the real providers:
  - Migrate src/modules/ai/providers/openai.llm.ts → replace with Gemini (FREE + GOLD) and Claude Haiku 4.5 (PREMIUM)
  - Add GEMINI_API_KEY and ANTHROPIC_API_KEY to src/config/env.ts
  - Update ai.service.ts to route by plan: FREE/GOLD → Gemini, PREMIUM → Claude
  - Heuristic fallback stays for when no API key is set

  - Start by reading those two docs, then read src/modules/ai/ai.service.ts and src/modules/ai/providers/openai.llm.ts to see what's there, then implement.

## authentication update
* we need to add a new API, frontend team asked for a /auth/me, I guess he wants a that API that checks the tokens of the user and according to the payload, it will send the user's information and stuff
* so add that API and prepare anything related to that subject


## authentication update
* we need a new API, that allows user to reset their password!
* but in order to do that as you know we must force all the accounts to link to their google account, so as a start of registration we do let them register, but will not use chat-bot or anything pay related... for those they need to set up their google's... so we can reach them later and use OTP to confirm and reset their account
* for that as you see from docs/services we have to 'resend' for the email handling right?
* check the database schema for your refrence
* set a good plan that tells what should me and you do to complete that task?

## decide on the system's next move
* as a reminder, user can register and join class that are created by tutors, and user if they had subscprtion then they can use the chat-bot AI, the chatbot allows user to have conversation with voice-live or chat text, the bot is in purpose of learning language (for now all the eyes are on only english). and the application must monitor the students performance and help the student to level up...
* now I have to decide which part of the application to work on right now?
* fortunately the classes and students are kind of fine with joining/creating class and authentication of user. but here are some layers that we need to work on, especially the database and workflow of the system design 
* payments, chat-bot conversation, user profile in detail like a dashboard that shows all the users performance and stuff, and how the AI detects the users goal and performance and progress and goal...
* and maybe some more area that I don't remeremember right now, so what is your recommendation which area should we work on now?




## Update database user and class 
* check this 4 tables (Users, classes, class_users, enrollment_requests)
* make sure it follows this workflow: tutor creates a class, the class has unique class_code which users use it to join the class, but that class_code should not be permanently, it must have a expire time, after the time ended, the class_code will be refreshed to a new code, tutors in the class can change the refresh time for that class_code, USER no needed to be in pending and wait for a tutor to accept their joining! they just can join the class by entering the class_code, as long as the class_code wasn't active at the time they try to join. 
* tutor can set the refresh time as they wish (weekly, daily, monthly, or even yearly or 100 years{in case they wanted to make it permanent })
* or they can refresh it with a click as they want
* or they can block the code!


## Update database/users model
* the database should follow this workflow:
* user can registe with google too. we just need to get 1 google API for that. but we have 'not null' for password. what should we do?
* user can register, by defult after registration, they will have their account, but they can not have access to the chat-bot-AI, for that access they need Subscription. so I think we might need another new enum column to 'unsubscriped , subscriped'(or something like that). so we know the user's accesss status.
* without subscription user still can join class, of course for the joining he needs the ClassCode of the class...
* how does this workflow seem? do we need to change anything else from the database? check and see how it works?

## TASK: update databaes, classes table
* we need to allow the tutor to set an refresh date to the classCode, like this example below:
* tutor set a classCodeExireDate to 1 week, 

## update docs/services/database
* explain more in detail, like a guidline, what should the developer do? how we create new project in neon, what server to choose, what steps from 0 to hero, to prepare the database and connect it to our project

## Task: update backend port,
* we have a bug, cuurently both backend express port and postgreSQL are on same port "8080", so change the backend port to something better, but not 3000!, because 3000 is taken by my frontend application, 
* what port is the best for express.js backend? cant be 8080 and 3000!



# Answer: (in short, follow your recommendations)
1. I it's better to merge them!
2. we better have different tiers such as Free/Premium
3. ask them to type their username 

# recommendation 
1. yeah go with your way: Password field → make nullable + add authProvider enum
2. alright , go with your recommendation no need a new accessStatus enum — the subscription already is that
3. alright.
4. yes
* in short follow all your recommendations 


I think I should hold these importand informations somewhere here in the project, how about creating a folder (docs or something) and add this informations about the database hosting, and add some more information and recommendation about our current express backend project. and provide any related informations to, such as where to hold voices? or avatars or avatar files or email services , or thoses kind of staffs, that I need to decide. 
* whats your opinion?   


## TASK: add tRCP for the backend project
* my frontend developer said that we should use tRCP, that helps him to call backend function(I guess he's using nux.js or next.js) and share type between backend and frontend
* what is tRCP? is it really worthy? is that usefull for our current project? if yes how can we add that library?
* if that's worthy then add it to our project.

* add TRPC to contact with frontend, and provide a good documentation for it.
* new column for user to attract status [pending, approved, rejected, expired] can't be approved 
<!-- * make readme file only  -->


I still have the error so I show you all I see:
* from Infisical I saw GOOGLE_CLIENT_ID=890561814327-jtang0dfihkvca1dcgum9mtpiebm4di8.apps.googleusercontent.com
* from page source I saw: "<!--
    Declarative Google Sign-In button.
    data-client_id is injected server-side by auth.router.ts.
    data-callback calls the global handleCredentialResponse function below.
  -->
  <div id="g_id_onload"
       data-client_id="890561814327-jtang0dfihkvca1dcgum9mtpiebm4di8.apps.googleusercontent.com
"
       data-callback="handleCredentialResponse"
       data-auto_prompt="false">
  </div>"

and from google here Client ID=890561814327-jtang0dfihkvca1dcgum9mtpiebm4di8.apps.googleusercontent.com



read the claude.md file, and check this file "C:\Users\Aland\Desktop\Projects\tutelage\esl-chatbot-web\backend\src\modules\auth\google-test.html", it is not working! when I click on the "sign in with google" after some nexts the box gets white and it won't return the token! at the same time, the frontend works perfectly, so the problem is ether the client_ID or it's because that I have'nt added port 8000 in the "Authorized JavaScript origins" but it can't be, because I checked that many times, so client ID is definitely is '890561814327-jtang0dfihkvca1dcgum9mtpiebm4di8.apps.googleusercontent.com' and I have added port 3000(for frontend) and 8000(for backend test). the front-end works perfectly, so for that, check the my codes to insure if there are libraries or something that blocks the backend or not! and if you still could not find the issue, what should I do? should I add another "OAuth 2.0 Client IDs" or what?
* if you changed anything, make sure to update the related files such as claude.md or the routes...




## ANSWERS
1. I am honestly not sure which AI provider is the best for my purposes, kindly can you make a search and tell me which is the best? with good quality and reasonable price, what is the best for development and what for production? as you know the AI must be able to response with voice and text, and it should speaks clearly and understand the user perfectly , and it must be able to analyze the students speaks, like how is the user's accent and what are the problems in his speaking and accent and stuff. so make a search or gimme the best recommendation and update the /docs/
2. actually both voice-live chat and texting are important. user must be able to decide between them when to use each. while you asking which one is first to build? that can be on your recommendation. which one better we work on first? if text-chat, ok then that's it.
3. independent 
4. actually this part, I have a little bit problem with it. I don't know how should we design the database, but I know that the chat-bot must evaluate the user very accurately, for grammer, vocabulary, fluency and stuff, so the database must support that idea
5. I need explanation , I can't answer it directly. what are the different and which is better?
6. yes, the AI must act according to the learner's level.
 

* before I answer, I wanna let you know that we need to discuss about these 3 services you mentioned later, because I am not approving that directly immediately (- Text: GPT-4o-mini (~$0.15/$0.60 per 1M tokens) — cheapest viable quality - STT: Whisper API (~$0.006/min) - TTS: OpenAI TTS (~$15/1M chars))

## Answers:
* read the answers, if you got disagree with any of them, explain why and present your better idea, which might change my mind
1. me personally recommend after each message.
2. yes, student should see his performance too. such as grammer 85....
3. I think we better have this 'mixed' option too
4. yeah, but the session must certainly be far enough, we can't block the student in the middle of conversation, right?





## my points:
* I know we haven't mention anything about subscription, but are you sure we can hold this topic for later? because I'm thinking we might have 3 tiered subscription (free[if it has a really low cost on us because it's pointless if it doesn't make any money for us], premium , gold), and we have 3 bandles (1-month, 3-month, [not sure for now])
* are you sure this area won't make any problems for now and we can focus on this capabilities? if yes ok, otherwise let's discuss it.
* one point, I heard about Gemeni 4, that lunched this april, if you think it's powerful and cheap let's talk more about it...
* if you still wanna stick with your recommendations , then go ahead and add them in the docs/services/ai-providers.md...

here is my points on your takes:

1. LLM
  <!-- * Dev: for development, both Gemini 2.5 and Gemini 2.5 Pro are good choices,  -->
  * pro: we may need to think more before deciding, but yes, GPT-4.1 seem fine

2. STT:
  * Dev: deepgram for sure.
  * Pro: 






* just one thing we may update later accordingly is that we need to send them other type of emails as they register or buy a subscription, or when their subscription is close to end, or for other stuffs related to the applications...
## Answers:
1. Redir or DB table? which one you recommend more? it's true that we haven't prepared redis at all so far, but if you think it's necessary , then guid me to do set redis up and handle the primary basic updates, but if you think the database table for this part is more efficient , then let's do it in this way.
2. yeah I think so, the Middleware 
3. yes, I think just simply like a social medias applications that connected to google...
4. stick with standard 15Min
5. yes,
* just notice that: user who don't have password getting recommendation to set a password, so that they can login with password or google. if they don't set password then it is still ok but recommended to set it. (the workflow, do we have an API that sets password for users that registered from google? if no should we immediately add it or add it after this task?)

* update the docs/services/email file and tell me what is the technical steps that I should do to get the proper RESEND_API_KEY and EMAIL_FROM and and verify sending domain in the resend dashboard 


* Start by reading CLAUDE.md to understand the project structure and conventions.
* I need you add a new instruction file for the developer in backend/docs/
* simply introduce claude code for that project
* the file must help developer to know how to use claude code properly the way he gets the most benefits of it, with less token and the most perfect result output
* make a search and find the most usefull features of Claude and tell how to use it especially on that current project of us.
* help user how to prompt and how to use each feature and when
* for example I heard about /skills but so far I haven't used at all.

## before starting the task:
* ask me questions if you have any doubts. or want to confirm your understanding.
* provide recommendations to improve the task.

## After completing the task:
* make sure to update the related files according to changes related to it.
* update any related API, routes and stuff
* update the swagger documentation to the frontend team if needed.
* update the claude.md according to changes related to it.
* update the seeds "prisma/seed.ts" file according to changes related to it.


## ANS: 
1. for developer who is actually a programmer and used AI before, but want to make sure to use it perfectly,and not so much familiar with claude code tools and uses
2. do not combine claude API and Claude use at same file! maybe we discuss about the AI-APIs later, for now just focus on the uses of claude code as a buddy-oder.
3. multiple files, I think

* follow your recommendations 



sorry, but I'm still not stratified actually. when I said it is costy I didn't mean to make everything super cheap. of course quality matters too
let's move step by step how many services we need?
we start by LLM, and then we go for other services.
* list all the choices and tell which one 

1. Development 
2. production 
  * Free
  * premium 
  * gold

* accordingly you update the doc files and any other related files

* below see my answers and before you immediately apply it, let me know what do you think, if you were disagree maybe I change my mind, otherwith we move to next layers
## Ans:
1. Development: Gemini 2.5 Flash (B)
2. Free tier: Gemini 2.5 Flash (B) or gpt-4o-mini, compare them so I choose
  - I still want that performance too, as long as the cost was so low
  - (but can you estimate how much does it cost on us per month?)
3. Gold: gpt-4.1 or Gemini 2.5 Flash
  - compare so I choose
4. Claude Haiku 4.5 or gpt-4o or Gemini 2.5 Pro
* one more question, will it be challenging to switch between models in future or the code will work with only one model? can I even on production for instance switch from B to A?


* I am agree with your recommendation (2.5 flash, 2.5 flash-lite, 2.5-flash, Hakiu 4.5)
* so confirmed
* we can get to next level which as you said is STT, but I need that details seach again so I can see everything and decide as I wish, and let me see your recommendation below it.
* we need a detail documentation to save, so for now update /docs and add a folder for AI providers and in LLM file write these information and make table to the models and their costs and their quality and tell why we selected what we selected for different layers(dev, free....)
* and from the documentation we need guidle that explains how can we get the APIs step by step for our project (gemeni, gpt, haiku)
* so after that we work on the STT and decide and make a documentation for that too


* for development and free, I am a bit curious between Groq Whisper Turbo and Deepgram Nova-3 so compare them before I decide which one.
* for the gold and premium you recommended only Azure 'Azure Speech STT' are you sure that we don't have a better choice? if yes then we're fine.
* after I choose you have write the guidelines how do I get the APIs for that STT properly 
* after that last confirmation we can move to next level TTS



1. yes I meant LLM
2. I'll past it below these answers 
3. I wanna make sure nothin better
4. I felt gap because last time you made research by yourself and missed gemeni 3 series! so this time I'll provide references and also let you to research for it too...
5. exactly, now we go with LLM and then other

## gemeni refrences
1. Gemini API (Managed Service)
These are the official Google pages for the "pay-per-token" models you access via an API key.
Google AI Studio - Model Overview: The main hub for the Gemini 3/3.1 series. Use this to quickly compare Pro vs. Flash vs. Flash-Lite.
https://aistudio.google.com/models/gemini-3
Gemini API Official Pricing Guide: The most important page for your budget. It breaks down the "standard" vs. "long-context" pricing and the free tier limits.
https://ai.google.dev/pricing
Gemini 3 Developer Guide: Technical documentation on new 2026 features like "Thinking Levels" and "Agentic Workflows."
https://ai.google.dev/gemini-api/docs/gemini-3

2. Gemma 4 (Open-Weight Models)
Since you are interested in Gemma 4, these sources explain how to get the files and how to host them yourself.

Google Cloud Blog: Gemma 4 Release: The official announcement detailing the 31B and 26B models and their Apache 2.0 licensing.
https://cloud.google.com/blog/products/ai-machine-learning/gemma-4-available-on-google-cloud

OpenRouter: Gemma 4 31B Pricing: A great source to see the real-time market price if you choose to use a third-party host for Gemma 4 instead of running it on your own server.
https://openrouter.ai/google/gemma-4-31b-it
Gemma 4 on Hugging Face: This is where you actually download the model weights if you want to host it on your own hardware.
https://huggingface.co/google/gemma-4-31b-it

## OpenAI references:
🧠 Main Models Overview (ALL models list)

https://platform.openai.com/docs/models

👉 This page lists all available models (GPT-5, GPT-4.1, GPT-4o, o-series, audio, image, etc.)

📘 Models Guide (How to choose models)

https://developers.openai.com/api/docs/models

👉 Explains which model to choose depending on cost, speed, reasoning, etc.

💰 Pricing (MOST IMPORTANT for your business)

https://platform.openai.com/pricing

👉 Full pricing for all models (input/output cost per 1M tokens)

📊 GPT-4.1 Family Docs

https://platform.openai.com/docs/models/gpt-4.1

👉 Deep explanation of:

GPT-4.1
GPT-4.1 mini
GPT-4.1 nano
🎧 GPT-4o (Multimodal / Voice / Chat)

https://platform.openai.com/docs/models/gpt-4o

👉 Best for:

voice
real-time apps
chatbots
⚙️ API Model List (technical endpoint)

https://platform.openai.com/docs/api-reference/models

👉 Shows:

how to list models programmatically
raw model IDs

## Claude reference 
* you provide the refrence by yourself its your own company
* I think Claude Haiku 4.5 is enough to know about


