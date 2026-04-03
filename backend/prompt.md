* Start by reading CLAUDE.md to understand the project structure and conventions.

## Update database/users model
* the database should follow this workflow:
* user can registe with google too. we just need to get 1 google API for that. but we have 'not null' for password. what should we do?
* user can register, by defult after registration, they will have their account, but they can not have access to the chat-bot-AI, for that access they need Subscription. so I think we might need another new enum column to 'unsubscriped , subscriped'(or something like that). so we know the user's accesss status.
* without subscription user still can join class, of course for the joining he needs the ClassCode of the class...
* how does this workflow seem? do we need to change anything else from the database? check and see how it works?

## before starting the task:
* ask me questions if you have any doubts. or want to confirm your understanding.
* provide recommendations to improve the task.

## After completing the task:
* update the claude.md according to changes related to it.
* make sure to update the related files according to changes related to it.
* update the swagger documentation to the frontend team if needed.

## TASK: update databaes, classes table
* we need to allow the tutor to set an refresh date to the classCode, like this example below:
* tutor set a classCodeExireDate to 1 week, 

## update docs/services/database
* explain more in detail, like a guidline, what should the developer do? how we create new project in neon, what server to choose, what steps from 0 to hero, to prepare the database and connect it to our project

## Task: update backend port,
* we have a bug, cuurently both backend express port and postgreSQL are on same port "8080", so change the backend port to something better, but not 3000!, because 3000 is taken by my frontend application, 
* what port is the best for express.js backend? cant be 8080 and 3000!


* update the seeds "prisma/seed.ts" file according to changes related to it.

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
