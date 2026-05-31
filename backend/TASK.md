1-you added a new endpoint called vcerify-email so after sign up the user should verify its email, so we dont need to get the access, and refresh token before verifying the email!, and when the user hits register the account will create then it asks for verifying iits email, so if the user bypass this verification they acn still log in without verifying their email(if its their email!), the best solution is : dont create the account till the email is verified successfully, you can watch the user by token getting it from the body or params... 

 and we have this error when sendign request to the resend endpoint: Unknown field `emailVerified`
 2- the email is not getting any code.. 

 3-add delet user too for the user table 

