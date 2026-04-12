* Start by reading CLAUDE.md to understand the project structure and conventions.


## decide on the system's next move
* as a reminder, user can register and join class that are created by tutors, and user if they had subscprtion then they can use the chat-bot AI, the chatbot allows user to have conversation with voice-live or chat text, the bot is in purpose of learning language (for now all the eyes are on only english). and the application must monitor the students performance and help the student to level up...
* now I have to decide which part of the application to work on right now?
* fortunately the classes and students are kind of fine with joining/creating class and authentication of user. but here are some layers that we need to work on, especially the database and workflow of the system design 
* payments, chat-bot conversation, user profile in detail like a dashboard that shows all the users performance and stuff, and how the AI detects the users goal and performance and progress and goal...
* and maybe some more area that I don't remeremember right now, so what is your recommendation which area should we work on now?


## before starting the task:
* ask me questions if you have any doubts. or want to confirm your understanding.
* provide recommendations to improve the task.

## After completing the task:
* make sure to update the related files according to changes related to it.
* update any related API, routes and stuff
* update the swagger documentation to the frontend team if needed.
* update the claude.md according to changes related to it.
* update the seeds "prisma/seed.ts" file according to changes related to it.


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
