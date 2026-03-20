1. we need diffrent Versions of API, so when we push to production we can use load balancer to distribute the traffic to multiple instances of the API

+ for that we use:
    * Nginx: it is a reverse proxy server that can be used to distribute the traffic to multiple instances of the API
    * Canary Deployment algorithm: we send 10% for the new version and 90% for the old version, if the new version is stable we increase step by step to 100% traffic
    * diffrent Ports for diffrent versions, for example: 
        * version 1: port 3001
        * version 2: port 3002
    * pm2: it is a process manager that can be used to manage multiple instances of the API
        
- Big Bang Deployment: is bad, we don't push everything to production at once
- Blue-Green Deployment: is not bad, we have two environments, blue and green, we deploy the new version to green and test it, if it is stable we switch the traffic from blue to green - but we don't use it for this project.


2. rate limiting: we need to implement rate limiting to prevent abuse of the API
* we can use Nginx to implement rate limiting
* we can use Redis to implement rate limiting
