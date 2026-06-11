* Start by reading CLAUDE.md to understand the project structure and conventions.
## All APIs check before adding new API for user dashboard
* check the model and database one more time, and make sure all the APIs work properly
* and make sure logically all the API has no error, they do what they needs to do for that project
* we might have some issuees or some API that worth discussion, if you suspected and lemme know what is the problem and what do you recommend and then I will decide...
* after all that done, leave some recommendations of APIs for the project that sooner or later we might add, we ether agree on adding them immediately or else we perfect the dashboard and add them later


## routine before starting the task:
* ask me questions if you have any doubts. or want to confirm your understanding.
* provide recommendations to improve the task.

## routine After completing the task:
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

## progress & user matrics vocabularies
* these 3 tables needs to be checked, 1st explain me the table point and then each column so I can understand and decide, then tell me if there's anything extra or suspection from your side
* the tables are: progress, user_matrics, and vocabularies
* so check them to know if they are perfect for our project or not, what to be updated or added or removed.
* and after those we need to check to know if we have the proper APIs for it or not. 

## database and API review
* I need you to check all the tables(models) of the database to insure that we have no errors so far, not logical not syntax not anything
* make sure the logic of it works perfectly for our idea,
* anything suspection you can let me know and we will decide on it
* we fix the mistakes accordingly
* after all tables checked, we will check APIs later after this

## updateing subscrption and adding FIB & Cash payer
+ check the relation between user subscription table, I think we may have to change some columns, check the columns and make sure it supports our project logic idea
* as you know, user as they register and get verified(they verifired if they get link to their gmail account) so they get FREE tier plan, and that free they can use it forever but their limit is set it, if they hit the limit they have to wait to reset, or buy a subscription, to understand how it works exacly read docs of "C:\Users\Aland\OneDrive\Desktop\Projects\esl-chatbot-web\backend\docs\ai-providers" and "C:\Users\Aland\OneDrive\Desktop\Projects\esl-chatbot-web\backend\docs\payment"
* so ensure our database works for that idea, my frontend complained and said when I register my account by default from subscription status is INACTIVE , and it blocks me of testing the free session, and he's right, as we said by defualt they get FREE tier plan if they have their gmail account linked ether by OTP or Google SignIn, so check the database if that was ok, we have to check the APIs to insure it. ultrathink

## user data profile
* check the database, more likely focus on (users, learner profile, goals) make sure it supports our project idea clearly, without extra data
* explain the 3 mention tables with their column, I dont understand all the columns, they look a bit too much, maybe I am wrong and we need them but I just dont understand
* so explain them to me, and lemme hear your recommend, what is suspection from your side too? so we can update that part, and we will need to prepare API for updating those,
currently user just simply register, without updating his profile in learner profile, so we would need API for that after coonfirming what we need

## class of tutor and student
* previously we made the application that allows tutor make classes and students can join, but the core is missing
* when the class created and student joined, now what? what was the point? I think not much should be there, just the tutors can monitor his/her students
* and maybe in future we allow tutor to post blogs and student could comment, just like google classRoom.
* do you have any idea or something cool  and usefull? I think for now we should not waste much time in those, since our project purpose mainly is for the AI chat bot and stuff, agreed or what?

## admin dashboard
1. admin must see all the users (teacher, student or other admins) or search for them
2. admin must be able to see all the classes or search for them
3. they also could see active users and those who has subscription with their limits
4. they can also give tier for users (we use this method for cash payer, they pay in cash and the admin from his end give him subscption accordng to his tier)
5. they might be able to deactive users account or remove their subsctption
* I think its a good way to manage them, what else you think needed or extra?

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


## about the issues 
1. yes, we could have some admins that are tutor as well so not global, but maybe in the class he doesn't look weirdly as admin role and not everyone can see him as admin, beside yes admin can see the classes and its students even without joining them, is that clear? our database supports that idea?
2. I think granularity with more accuracy is better, and yeah we need that enum for it.
3. yeah, Add avgPronunciationScore Float? to SessionEvaluation (nullable — null for text sessions)
4. actually yes, I think you are right they are redundant. then remove one of them carefully (I think its a recommended way)
5. yes, for sure we need index, right

## Answers of your 4 questioned
1. I answered already 
2. I answered already
3. remove
4. yeah

add_fib_subscription_table.

PS C:\Users\Aland\OneDrive\Desktop\Projects\esl-chatbot-web\backend> bun run db:migrate
$ infisical run --env=dev -- bunx prisma migrate dev
A new release of infisical is available: 0.43.84 -> 0.43.86

To update, run: scoop update infisical

2026-05-24T23:29:27+03:00 INF Injecting 25 Infisical secrets into your application process
Loaded Prisma config from prisma.config.ts.

Prisma config detected, skipping environment variable loading.
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "esl-chatbot-web", schema "public" at "ep-ancient-field-alsyhbtd-pooler.c-3.eu-central-1.aws.neon.tech"

√ Enter a name for the new migration: ... add_fib_subscription_table
Applying migration `20260524202949_add_fib_subscription_table`

The following migration(s) have been created and applied from new schema changes:

prisma\migrations/
  └─ 20260524202949_add_fib_subscription_table/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v6.19.2) to .\node_modules\@prisma\client in 145ms
{ "username": "student_yuki", "password": "password123" }


❯ ok firstly as I asked I want you to mention the { "username": "student_yuki", "password": "password123" } in the 
  "C:\Users\Aland\OneDrive\Desktop\Projects\esl-chatbot-web\backend\src\modules\subscriptions\fib-test.html" but I think you didnt, so     
  did it. and then still it is not working, check the error from frontend "fib-test:229
   POST http://localhost:8000/api/v1/subscriptions/initiate-fib 502 (Bad Gateway)
  (anonymous)    @    fib-test:229" and from backend "[Pasted text #1 +20 lines]" and use /doctor skill to abslutely catch the bug





Roadmap — Deep Analysis

  Here's my honest take on each phase and the optimal sequencing:

  The core problem to solve first

  Before real users, two things can cause serious damage: unbounded AI costs and auth brute-force. Everything else is polish.

  ---
  Phase 4 — Redis Caching

  What it actually buys you right now: Not much. Every message send does ~3 Prisma queries (session lookup, subscription lookup, message count). Under dev/early load, Neon handles   
  this fine. Redis adds operational complexity — another service to run, another failure mode.

  Where it becomes critical: When you hit 50+ concurrent sessions, the subscription plan lookup on every message:send becomes a hot query. That's when caching saves money.

  Recommended approach when you do it:
  1. Fill in src/config/redis.ts with ioredis + lazy null when REDIS_URL is absent (graceful no-op in dev)
  2. Build a thin src/lib/cache.ts wrapper — get<T>(), set(), del() with JSON serialization
  3. Cache only these two things first:
    - user:{userId}:plan → subscription plan, TTL 5 min, invalidated on admin plan change
    - session:{sessionId}:active → boolean, TTL until endedAt is set
  4. The auth middleware result (req.user) is already cheap — skip caching it

  My verdict: Defer Redis until after deployment, when you can see actual query patterns in production. Premature caching optimizes the wrong things.

  ---
  Phase 6 — Rate Limiting Per-Plan

  This is a ship-blocker. Three concrete threats without it:
  1. Someone finds your login endpoint and brute-forces passwords
  2. A FREE user builds a script that hammers /sessions + /messages and runs up your Gemini bill
  3. A session creation flood bypasses the daily cap (daily cap is enforced per-session but not per-second)

  express-rate-limit is already in the stack. You need to:

  1. Auth endpoints — strict IP-based limits (no JWT needed, fires before auth):
  POST /auth/login      → 10 req / 15 min per IP
  POST /auth/register   → 5 req / hour per IP
  POST /auth/forgot-*   → 5 req / hour per IP
  2. AI endpoints — per-user plan-aware limits using a custom key function on req.user.id:
  POST /sessions          → FREE: 3/day (already enforced in service, add HTTP-layer check)
  POST /sessions/*/messages → FREE: burst protection, 2 req/sec
  POST /sessions/*/voice-message → ALL: 10/min (STT/TTS is expensive)
  3. Redis store — in-memory rate limit state is lost on restart and doesn't scale to multiple processes. Use rate-limit-redis if you have Redis, otherwise express-rate-limit's      
  default in-memory store is fine for single-process.

  Recommended: Do this before deployment. It's 1 day of work.

  ---
  Phase 7 — Email Notifications

  Resend is already wired for password reset. The marginal cost of adding more emails is low.

  Priority order:

  1. Welcome email (half day) — fires on first registration. The most important email you send — it sets tone and activates the user. Resend template: welcome message + "Start your  
  first conversation" CTA. Wire in auth.service.ts after createUser().
  2. Session summary email (1 day) — fires when POST /sessions/:id/end completes and there's a SessionEvaluation. Sends scores, strengths, new vocab, recommendations. This drives    
  re-engagement and makes the AI evaluation feel real. Wire in endSession().
  3. Weekly digest — skip for now. Needs a cron job, unsubscribe handling, and a user email preference. Not worth the complexity at this stage.

  All emails live in src/lib/email.ts — sendWelcomeEmail(user), sendSessionSummaryEmail(user, evaluation). Keep HTML inline (no template engine needed for 2 emails).

  ---
  Phase 8 — Integration Tests

  Test runner (Bun) + supertest is already configured. The architecture is right — integration tests that hit the real Express app are more valuable than unit-mocked tests (CLAUDE.md
   explicitly says this based on a past incident).

  What to prioritize:

  ┌─────────────────────┬───────────────────────────────────────────────────────────────────────────┬─────────────┐
  │       Module        │                                    Why                                    │ Est. effort │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────┼─────────────┤
  │ auth                │ Login, register, Google, refresh — these break subscriptions when touched │ 1 day       │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────┼─────────────┤
  │ sessions + messages │ Tier limits, daily cap, AI evaluation — most expensive code path          │ 2 days      │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────┼─────────────┤
  │ classes             │ Code lifecycle (join, expire, rotate) — complex state machine             │ 1 day       │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────┼─────────────┤
  │ subscriptions       │ Admin assignment, FIB webhook — money flows through here                  │ 1 day       │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────┼─────────────┤
  │ vocabulary          │ SM-2 algorithm is stateful — easy to break quietly                        │ half day    │
  └─────────────────────┴───────────────────────────────────────────────────────────────────────────┴─────────────┘

  What to skip for now: Goals, progress, metrics — these are CRUD with no complex invariants. Test them after the critical path is covered.

  Test strategy:
  - Each test suite seeds its own data (beforeAll → create user + session + etc.) and cleans up (afterAll → prisma.$executeRaw('DELETE FROM ...'))
  - 401/403/422 tests are DB-independent → run fast, cover middleware
  - 200 success tests require a seeded DB → run in a separate CI job if needed

  ---
  Phase 9 — Deployment

  Platform recommendation: Render

  Why Render over Railway/Fly:
  - Native Bun support via bun start in the start command
  - Managed Postgres with connection pooling (Neon is great for dev; Render's managed PG is simpler for prod ops)
  - Environment variable management that replaces Infisical for prod (or keep Infisical — it supports a prod env already)
  - Free TLS, automatic deploys from GitHub
  - ~$14/month total (web service $7 + Postgres $7)

  Recommended deployment checklist before going live:

  Pre-deploy:
    ✅ bun run typecheck passes
    □ bun test passes (auth + sessions at minimum)
    □ All Prisma migrations committed and tested
    □ NODE_ENV=production set
    □ CORS_ORIGIN = actual frontend domain
    □ Rate limiting on auth endpoints
    □ Health endpoint responding

  Secrets (Render env vars):
    □ DATABASE_URL (Render managed PG or Neon prod)
    □ JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
    □ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    □ RESEND_API_KEY
    □ GEMINI_API_KEY
    □ DEEPGRAM_API_KEY, AZURE_SPEECH_KEY
    □ OPENAI_API_KEY (PREMIUM tier)
    □ R2_* (5 vars — separate prod bucket)

  CI/CD (GitHub Actions):
    □ On push to main: typecheck → test → deploy

  FIB stays blocked until FIB activates the sandbox. Don't let it block deployment — FIB is one payment method out of three (Cash + Stripe are independent). You can deploy with Cash 
  + FIB-pending and add FIB when their sandbox activates.







 FIB Subscription — Production Go-Live Readiness Plan
  
 Context

 FIB (First Iraqi Bank) emailed that our stage/testing phase is complete and sent a
 Pre-Production Subscription Checklist (Preproduction Subscription Checklist-Tutelage Institute.docx).
 This is the final step before they issue live (production) credentials. They also require a
 500×500 PNG logo and note a 1% commission on all subscription transactions (business owner should be aware).

 The integration is already functionally complete and wired end-to-end:
 - Backend (src/modules/subscriptions/): POST /initiate-fib, GET /fib/:id/status, DELETE /fib/:id, POST /webhook/fib — all built.
 - Own FIB client src/lib/fib-client.ts (replaced the broken fibsubscribe npm pkg) hits stage/prod base URLs, OAuth2 client-credentials, create/get/cancel.
 - Webhook re-verifies via getSubscription before mutating DB (anti-spoof) — correct.
 - Frontend: real billing page, SubscriptionPanel.vue, FibPaymentModal.vue (QR + app link + 5-min polling), useSubscription.ts composable. Visible + reachable from dashboard sidebar + marketing pricing.

 So this task is not new feature work — it is (1) production-hardening a handful of code items, (2) refreshing the stale docs/payment doc, and (3) producing a completed checklist answer sheet + go-live runbook so we can 
 confidently submit and receive the real API.

 User decisions for this task:
 - Hosting/domain: decided but not yet deployed → checklist uses planned URLs flagged "pending deploy"; code parameterized via env.
 - Reconciliation cron job: yes, add it (safety net for missed webhooks).
 - Business-data fields (account/IBAN/contacts/logo): leave as clearly-marked TODOs for the user to fill before exporting the PDF.

 ---
 Part 1 — Code Hardening (production-readiness)

 1.1 Webhook should return 202 Accepted (not 200)

 FIB's suggested workflow (Section D) explicitly says the callback must "respond with valid status codes
 (e.g., 202 ACCEPTED, 4xx, 5xx)". We currently return 200.
 - src/modules/subscriptions/subscriptions.controller.ts:44 — res.sendStatus(200) → res.sendStatus(202); update the comment on line 41 (200→202).
 - src/modules/subscriptions/subscriptions.router.ts — update the webhook Swagger @response annotation 200→202.

 1.2 Fail fast if FIB_WEBHOOK_URL is missing in production

 Today subscriptions.service.ts:78-80 silently falls back to http://localhost:<PORT>/... — unreachable by FIB in prod, so paid subscriptions would never activate via webhook.
 - Add a cross-field check in src/config/env.ts (a .superRefine on the schema): if NODE_ENV === "production" and FIB_CLIENT_ID is set and FIB_WEBHOOK_URL is missing → fail validation (server refuses to boot with a clear 
 message). Keeps the localhost fallback for dev only.

 1.3 Document FIB_WEBHOOK_URL in .env.example

 It is referenced in code but absent from .env.example (only FIB_CLIENT_ID/SECRET/ENV are listed).
 - Add FIB_WEBHOOK_URL= under the FIB section (.env.example:71-76) with a comment: "public HTTPS URL FIB POSTs status changes to; required in production, omit in local dev (polling fallback)".

 1.4 Reconciliation cron job (NEW)

 Missed webhooks are currently only recovered if the user reopens the status screen. Add a periodic reconciler.
 - Refactor first to remove duplication: extract the shared status-sync transaction (currently duplicated in getFibStatus and handleFibWebhook, subscriptions.service.ts:147-188 and :279-318) into one helper
 applyFibStatusChange(record, details) in the service. Reuse it in get-status, webhook, and the new job.
 - New file src/jobs/fib-reconcile.job.ts: query FibSubscription rows that are non-terminal (fibStatus = DRAFT) and not past validUntil, plus optionally recently-active rows, call fib.getSubscription() for each, and run 
 applyFibStatusChange. No-op if fib is null. Structured logger output like the other jobs.
 - Register in src/jobs/index.ts (e.g. every 15 min: */15 * * * *), update the startup log count "3 jobs"→"4 jobs".

 1.5 Logging hygiene in src/lib/fib-client.ts

 Replace raw console.log/console.error (lines 106, 134, 154) with the structured logger. Do not log full request bodies or raw auth responses at info level in production — they can contain payment payloads. Keep concise 
 error logging (status + message) via logger.error. Never log client_secret.

 ---
 Part 2 — Refresh docs/payment/fib-web-payments-api.md

 The doc is accurate on endpoints/payloads but stale in a few places:
 - The "Subscription API" section still says "use the fibsubscribe SDK" — we built our own src/lib/fib-client.ts. Update the client-setup section to reflect reality (own client, manual OAuth caching).
 - Pricing table (lines 615-628): replace all "TBD" with the live values from subscriptions.service.ts:16-19 (GOLD 25k/70k/130k/250k; PREMIUM 45k/125k/230k/440k IQD).
 - Document FIB_WEBHOOK_URL as a required production env var (the "Required Env Vars" block lists only 3); fix the FIB_ENV note that mentions a dev value (enum is only stage|prod).
 - Document the 202 callback response and the new reconciliation job.
 - Add a "Go-Live Runbook" section: ordered steps to flip stage→prod — (1) set FIB_ENV=prod + real FIB_CLIENT_ID/SECRET in Infisical prod, (2) set FIB_WEBHOOK_URL to deployed
 https://<backend>/api/v1/subscriptions/webhook/fib, (3) set CORS_ORIGIN to the live frontend domain, (4) deploy, (5) smoke-test one real low-value subscription end-to-end and confirm webhook hits + status syncs +       
 cancel works, (6) verify the reconciliation job runs.

 ---
 Part 3 — Checklist Answer Sheet (NEW doc)

 Create docs/payment/fib-preproduction-checklist.md — a question-by-question answer sheet the user
 transfers into the Word file and exports as PDF. Technical fields filled from code; business fields = TODO (business).

 - Section A — Business/Purpose: Business name/activity → TODO (business). Use case → draftable: "AI-powered ESL learning platform; FIB Subscription API powers recurring GOLD/PREMIUM monthly/quarterly/yearly plans."     
 - Section B — Security: statuscallbackurl = YES; functional public HTTPS w/ SSL = YES (once deployed); endpoint = https://<PLANNED-BACKEND-HOST>/api/v1/subscriptions/webhook/fib (pending deploy).
 - Section C — UI/UX: Visible & highlighted = YES (billing page /dashboard/billing, sidebar "Upgrade now" card for FREE users, marketing #pricing). Reachable = YES.
 - Section D — Workflow: YES — webhook as primary + check-status as fallback (+ now a reconciliation job). D3 = API (own client, not an SDK). D4 = N/A (not using FIB SDK/plugin). D5 check-status = YES. D6 cancel = YES.  
 - Section E — Account: Main vs terminal / account type / name / phone / IQD-IBAN → TODO (business). Currency = IQD.
 - Section F — Website/App: Website URL = https://<PLANNED-FRONTEND-DOMAIN> (pending deploy); App URLs (iOS/Android) → none / web-only (TODO confirm); Tech stack = "Backend: Bun + Express 5 + TypeScript +
 Prisma/PostgreSQL. Frontend: Nuxt 4 + Vue 3 + Tailwind."; Technical team contacts → TODO (business).
 - Section G — Contacts: all → TODO (business).
 - Section H — Branding: Logo 500×500 PNG → TODO (business) — deliverable to attach to the reply email.
 - Footer note: 1% FIB commission applies — confirm pricing accounts for it.

 ---
 Verification

 cd backend
 bun run typecheck            # type-clean
 bun test                     # subscriptions + full suite
 bun run generate:types       # regen frontend/types/api.ts (Swagger 200→202 change) + commit
 - Startup guard: with NODE_ENV=production + FIB_CLIENT_ID set + no FIB_WEBHOOK_URL, server must refuse to boot with a clear error.
 - Stage smoke test: run the sandbox flow (frontend FibPaymentModal or /subscriptions/fib-test harness) with a sandbox account; confirm webhook returns 202, status syncs DRAFT→ACTIVE, and cancel downgrades to FREE       
 ACTIVE.
 - Reconciliation job: invoke once manually against stage; confirm it syncs a DRAFT that activated without a delivered webhook.
 - Section A — Business/Purpose: Business name/activity → TODO (business). Use case → draftable: "AI-powered ESL learning platform; FIB Subscription API powers recurring GOLD/PREMIUM monthly/quarterly/yearly plans."     
 - Section B — Security: statuscallbackurl = YES; functional public HTTPS w/ SSL = YES (once deployed); endpoint = https://<PLANNED-BACKEND-HOST>/api/v1/subscriptions/webhook/fib (pending deploy).
 - Section C — UI/UX: Visible & highlighted = YES (billing page /dashboard/billing, sidebar "Upgrade now" card for FREE users, marketing #pricing). Reachable = YES.
 - Section D — Workflow: YES — webhook as primary + check-status as fallback (+ now a reconciliation job). D3 = API (own client, not an SDK). D4 = N/A (not using FIB SDK/plugin). D5 check-status = YES. D6 cancel = YES.  
 - Section E — Account: Main vs terminal / account type / name / phone / IQD-IBAN → TODO (business). Currency = IQD.
 - Section F — Website/App: Website URL = https://<PLANNED-FRONTEND-DOMAIN> (pending deploy); App URLs (iOS/Android) → none / web-only (TODO confirm); Tech stack = "Backend: Bun + Express 5 + TypeScript +
 Prisma/PostgreSQL. Frontend: Nuxt 4 + Vue 3 + Tailwind."; Technical team contacts → TODO (business).
 - Section G — Contacts: all → TODO (business).
 - Section H — Branding: Logo 500×500 PNG → TODO (business) — deliverable to attach to the reply email.
 - Footer note: 1% FIB commission applies — confirm pricing accounts for it.

 ---
 Verification

 cd backend
 bun run typecheck            # type-clean
 bun test                     # subscriptions + full suite
 bun run generate:types       # regen frontend/types/api.ts (Swagger 200→202 change) + commit
 - Startup guard: with NODE_ENV=production + FIB_CLIENT_ID set + no FIB_WEBHOOK_URL, server must refuse to boot with a clear error.
 - Stage smoke test: run the sandbox flow (frontend FibPaymentModal or /subscriptions/fib-test harness) with a sandbox account; confirm webhook returns 202, status syncs DRAFT→ACTIVE, and cancel downgrades to FREE       
 ACTIVE.
 - Reconciliation job: invoke once manually against stage; confirm it syncs a DRAFT that activated without a delivered webhook.

 Out of scope (flag only)

 - Frontend FREE message-limit inconsistency: plan-limits.ts (50/60) vs advertised "20 msgs/session". Minor, user-facing — reconcile separately, not a FIB blocker.
 - Actual deployment/domain registration is the user's infra step; this plan parameterizes everything via env so go-live is config-only.



Redis Caching — Implementation Plan
1. Goals
Eliminate the DB hit on every page load (GET /auth/me — called on every navigation)
Eliminate 6 parallel DB queries per dashboard open (GET /dashboard/overview)
Never crash the app if Redis is unavailable (graceful degradation to DB)
Never serve stale data after mutations (explicit invalidation for high-impact writes)
Zero changes to the test suite (cache is disabled in test environment automatically)
2. What Gets Cached — Two Caches Only
Scope is deliberately narrow. Don't cache everything — cache the two most expensive paths that run on every page load.

Cache A: user:auth:{userId} → AuthUser
Source: getMe(userId) in auth.service.ts

Hit pattern: Every page navigation (frontend calls /auth/me as a token probe)

DB work it replaces: 1 User + 1 Subscription JOIN query

TTL: 300s (5 minutes)

What AuthUser contains: id, username, email, displayName, role, avatarUrl, isActive, emailVerified, subscription.plan, subscription.status

Cache B: user:dashboard:{userId} → DashboardOverviewData
Source: getDashboardOverview(userId) in dashboard.service.ts

Hit pattern: Every time the student opens the dashboard

DB work it replaces: 6 parallel builders = ~14 individual Prisma queries

TTL: 120s (2 minutes) — shorter because streak/due-vocab update frequently

3. Cache Key Design

user:auth:{userId}           → AuthUser shape
user:dashboard:{userId}      → DashboardOverviewData shape
Rules:

Always namespaced by user: prefix → easy bulk-delete per entity type
Always scoped to userId → never bleed between users
Never include the JWT token as part of the key → key survives token refresh
4. TTL Strategy
Cache	TTL	Rationale
user:auth:{userId}	300s	Role/subscription changes visible within 5 min. Admin deactivation (isActive=false) visible within 5 min max — acceptable for a small platform
user:dashboard:{userId}	120s	SRS due-cards and streak are time-sensitive. User expects "I just reviewed a card, dashboard should update" — 2 min is acceptable
TTL is the safety net. Explicit invalidation (below) is the primary freshness mechanism for high-impact mutations.

5. Invalidation Map — Every Function That Must Invalidate
This is the most critical section. For each function, what cache key(s) to delete and why.

Invalidate user:auth:{userId}
File	Function	Reason
auth.service.ts	verifyEmail()	Sets emailVerified=true, activates subscription INACTIVE→ACTIVE
auth.service.ts	linkGoogle()	Sets emailVerified=true, activates subscription
auth.service.ts	logout()	Clean up; prevents stale profile on next login from same device
users.service.ts	updateMyProfile()	displayName, avatarUrl, phoneNumber change
users.service.ts	updateUserAvatar()	avatarUrl changes
admin.service.ts	updateUser()	role or isActive change — security-critical
admin.service.ts	assignSubscription()	plan and status change
admin.service.ts	cancelSubscription()	status changes to CANCELLED
admin.service.ts	adminUpdateProfile()	Admin editing a user's basic fields
admin.service.ts	adminUploadAvatar()	Admin replacing a user's avatar
subscriptions.service.ts	applyFibStatusChange()	plan/status upgrade via FIB webhook/polling
Invalidate user:dashboard:{userId}
File	Function	Reason
sessions.service.ts	endSession()	Streak, study minutes, skills, recentSessions all update
vocabulary.service.ts	reviewVocabulary()	dueVocabCount changes immediately
vocabulary.service.ts	addVocabulary()	totalWords and vocab chart change
vocabulary.service.ts	deleteVocabulary()	totalWords and vocab chart change
goals.service.ts	createGoal()	nextUp.primary may change
goals.service.ts	updateGoal()	Goal progress/status change → nextUp changes
goals.service.ts	deleteGoal()	nextUp changes
users.service.ts	updateMyLearnerProfile()	weeklyGoalMinutes → goalMins in greetingHero
What is NOT explicitly invalidated (covered by TTL)
Cron job subscription expiry (subscription-expiry.job.ts) — runs at 01:00 UTC, TTL covers it
Cron job streak reset (streak-reset.job.ts) — runs at 00:00 UTC, TTL covers it
Cron job stale session cleanup — only closes zombie sessions, no UI impact
6. Architecture
New file: src/config/cache.ts
This is the single cache abstraction. Everything else imports from here. It wraps ioredis and provides:


// Connection management
export async function connectRedis(): Promise<void>
export async function disconnectRedis(): Promise<void>

// Typed operations — all silently no-op if Redis is unavailable
export async function getCache<T>(key: string): Promise<T | null>
export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void>
export async function deleteCache(...keys: string[]): Promise<void>

// Key factories — single source of truth for key names
export const cacheKeys = {
  authUser:  (userId: string) => `user:auth:${userId}`,
  dashboard: (userId: string) => `user:dashboard:${userId}`,
}
Graceful degradation rule: Every function in cache.ts is wrapped in try/catch. On any Redis error: log a warn via Winston, return null (for get) or undefined (for set/delete). The app never throws because of a cache failure.

Test environment rule: If env.NODE_ENV === "test", connectRedis() is a no-op, all cache ops return null/undefined immediately. The 347 tests continue to work without any Redis instance.

Dev without Redis rule: If Redis connection fails at startup, log a warning and set redisAvailable = false — all subsequent ops skip Redis entirely. The server boots normally.

Updated file: src/config/redis.ts
Replace the placeholder with the real ioredis client instance used by cache.ts. Keep connection options:

lazyConnect: true — don't attempt connection on import, only when connectRedis() is called explicitly
maxRetriesPerRequest: 1 — fail fast on cache miss, don't hang the request retrying
enableReadyCheck: false — don't wait for READY signal on reconnect
TLS: enabled automatically when URL is rediss:// (Upstash requires this)
7. Implementation Order
Build in this order to keep the app working at every step:

Step	Task	Risk if skipped
1	bun add ioredis	Nothing works
2	src/config/redis.ts — real client with graceful degradation	Nothing works
3	src/config/cache.ts — helpers + key factories	Nothing works
4	src/config/index.ts — export connectRedis/disconnectRedis	App won't connect
5	src/index.ts — call connect/disconnect in bootstrap/shutdown	Won't connect
6	auth.service.ts — cache getMe, invalidate on mutations	Biggest win
7	dashboard.service.ts — cache getDashboardOverview	Second biggest win
8	Invalidation in sessions.service.ts	Dashboard stale after sessions
9	Invalidation in users.service.ts	Profile stale after edits
10	Invalidation in vocabulary.service.ts	Dashboard stale after vocab
11	Invalidation in goals.service.ts	Dashboard stale after goals
12	Invalidation in admin.service.ts	Auth cache stale after admin ops
13	Invalidation in subscriptions.service.ts	Auth stale after FIB payment
14	docs/services/redis.md — update docs	Just docs
15	docs/services/README.md — update status	Just docs
8. Complete File List
Install
bun add ioredis (in backend/)
New files (2)
File	Purpose
src/config/cache.ts	Redis helpers, key factories, graceful degradation
(Note: src/config/redis.ts already exists as a placeholder — we replace its content)

Modified files (13)
File	What changes
src/config/redis.ts	Replace placeholder with real ioredis client
src/config/index.ts	Add connectRedis, disconnectRedis to barrel
src/index.ts	connectRedis() in bootstrap; disconnectRedis() in shutdown
src/modules/auth/auth.service.ts	Cache hit/write in getMe; invalidate in verifyEmail, linkGoogle, logout
src/modules/dashboard/dashboard.service.ts	Cache hit/write in getDashboardOverview
src/modules/sessions/sessions.service.ts	Invalidate both caches at end of endSession()
src/modules/users/users.service.ts	Invalidate auth in updateMyProfile, updateUserAvatar; invalidate both in updateMyLearnerProfile
src/modules/admin/admin.service.ts	Invalidate auth in updateUser, assignSubscription, cancelSubscription, adminUpdateProfile, adminUploadAvatar
src/modules/subscriptions/subscriptions.service.ts	Invalidate auth in applyFibStatusChange
src/modules/vocabulary/vocabulary.service.ts	Invalidate dashboard in addVocabulary, deleteVocabulary, reviewVocabulary
src/modules/goals/goals.service.ts	Invalidate dashboard in createGoal, updateGoal, deleteGoal
docs/services/redis.md	Update from placeholder to real implementation details
docs/services/README.md	Update Redis row status
Total: 1 install + 1 new file + 12 modified files

9. Security Rules
REDIS_URL stays in Infisical — never in .env.example with a real value. The example already has REDIS_URL=redis://localhost:6379 (local dev only).
Always use rediss:// in production (Upstash requires TLS). The s is the TLS flag. Validate this: if NODE_ENV === "production" and REDIS_URL starts with redis:// (no TLS), log a security warning.
Cache only derived read data, never write-path inputs — keys come from the DB, not from request bodies. No cache poisoning possible.
Per-user scoping is strict — the userId always comes from req.user.id (decoded from a verified JWT), not from request parameters. This is already how the service functions are called.
No tokens or passwords in cache — AuthUser contains id, role, plan, status, not the JWT itself or any credential.
Eviction policy on Upstash — set allkeys-lru so Redis never runs out of memory and silently drops writes. Without this, Redis can throw OOM command not allowed errors when full.
10. What Stays Out of This Phase
Intentionally deferred — mention in plan, do not implement:

Rate limiter Redis store (rate-limit-redis) — in-memory is fine for single-server. Upgrade when horizontal scaling.
GET /users/me (getMyProfile) caching — lower traffic than /auth/me, defer.
Thundering herd protection — Redis SET NX PX lock. Not needed at this scale.
Cache hit/miss metrics — useful for monitoring, but adds complexity. Add after Redis is stable.
Pub/sub for cross-instance cache invalidation — only needed if running multiple server instances.
11. One Setup Step for You (before we code)
Create the Upstash Redis database and add the URL to Infisical:

Go to upstash.com → Create account → New Database
Name: tutelage-cache, Region: match your Neon region (Frankfurt or closest), TLS: on
Copy the Redis URL (starts with rediss://)
In Infisical → esl-chatbot → dev environment → add REDIS_URL = the URL
Also add it to prod environment
Set Eviction Policy in Upstash dashboard: allkeys-lru
That's it on your side — everything else is code.

