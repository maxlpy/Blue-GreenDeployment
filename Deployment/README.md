# Homework 4 Deployment Process and Data Migration

### Git/hook Setup for triggering deployment on push

### Blue/Green infrastructure and Blue/Green redis instances
#### Blue/Green infrastructure
Create a folder structure as follows:

* deploy/
  * blue.git/
  * blue-www/
  * green.git/
  * green-www/

Create "bare" repository and add hook script

    cd deploy/green.git
    git init --bare
    cd ..
    cd blue.git
    git init --bare

Create a `post-receive` file under `../green.git/hooks/` , place the following:

    GIT_WORK_TREE=../green-www/ git checkout -f

Add executable permissions using `chmod +x post-receive`. Repeat above steps for blue.

#### Setup two redis instances on server
[Add two redis instances on server.] (http://devopsmb.blogspot.com/2014/02/add-multiple-redis-instances-on-server.html)
    service redis_6379 start
    service redis_6380 start

### Switch Route and Data Migration
Add switch route into App repository, when you visit the http://localhost:8282/switch, it will redirect you to Green instance. If visit http://localhost:8282/switch again, it will go back to Blue instance. By triggering a switch, it can switch from trigger a switch from "Blue" to "Green" and vice versa.
By visit the http://localhost:8181/switch, you will be redirected to the http://localhost:8181 page. However, at this time, the server is connected to the green server(port 5060). You will need to refresh the page to see the change of the content on index page. You will also get a notice in your console when the switch is triggered. When you trigger the server switch, in the backend blue redis server(port 6379) will copy the existing data into the green redis server (port 6380).

### "Mirroring" Flag