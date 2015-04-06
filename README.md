## Homework 4 Deployment Process and Data Migration

### Blue-Green infrastructure and Blue-Green redis instances
Create a folder structure as follows:

* Blue-GreenDeployment/

    blue.git/
    blue-www/
    green.git/
    green-www/

Create "bare" repository and add hook script as follows:

    cd deploy/green.git
    git init --bare
    cd ..
    cd blue.git
    git init --bare

Create a `post-receive` file under `../green.git/hooks/` , and place the following command:

    GIT_WORK_TREE=../green-www/ git checkout -f

Add executable permissions using `chmod +x post-receive`. Repeat above steps for blue instance.

### Git/hook Setup for triggering deployment on push
After above steps, we can git push App repo to blue-www and green-www.

    fred@acer:~/Blue-GreenDeployment/App$ git push blue master
    Counting objects: 5, done.
    Delta compression using up to 4 threads.
    Compressing objects: 100% (3/3), done.
    Writing objects: 100% (3/3), 291 bytes | 0 bytes/s, done.
    Total 3 (delta 2), reused 0 (delta 0)
    To ../blue.git
    a047abc..4281bfc  master -> master

Setup two redis instances on server
Install redis and setup two redis instances (port:6379 and port:6380) [on server.] (http://devopsmb.blogspot.com/2014/02/add-multiple-redis-instances-on-server.html)

    service redis_6379 start
    service redis_6380 start

### Switch Route and Data Migration
Add switch route into main.js in App repository, when you visit the http://localhost:8383/switch, it will automatically redirect you to Green instance. If visit http://localhost:8383/switch again, it will redirect you to Blue instance. By triggering a switch, it can switch from "Blue" to "Green" instance and vice versa.

    Blue slice instance.
    Green slice instance.
    switch to green http://127.0.0.1:5060
    Migrate data from Blue to Green.
    switch to blue http://127.0.0.1:9090
    Migrate data from Green to Blue.

### "Mirroring" Flag
Before test mirror flag, it needs to turn `mirrorFlag` on from `infrastructure.js`. Then, upload an img from img folder, such as:
    curl -F "image=@./img/hairypotter.jpg" localhost:8383/upload

Check pictures on 'localhost:5060/meow' and 'localhost:9090/meow', you will see the same picture on your page.
![alt tag](https://github.com/maxlpy/Blue-GreenDeployment/tree/master/Deployment/MirrorFlag1.png)
![alt tag](https://github.com/maxlpy/Blue-GreenDeployment/tree/master/Deployment/MirrorFlag2.png)
