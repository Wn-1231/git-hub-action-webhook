## 1.持续集成和布署

-   技术栈 前台Vue,后台Node.js
-   服务器 前台nginx,后台Node.js

![webhookscicd2](http://img.zhufengpeixun.cn/webhookscicd2.png)

## 2.编写后端服务

### 2.1 package.json

/usr/projects/git-hub-vue-server/package.json

```
{
  "name": "git-hub-vue-server",
  "version": "0.0.0",
  "private": true,
  "scripts": {
+    "start": "node ./server.js "
  }
}

```

### 2.2 server.js

/usr/projects/git-hub-vue-server/server.js

```
let http = require('http');
let users = [{id:1,name:'zhufeng1'},{id:2,name:'zhufeng2'},{id:3,name:'zhufeng3'}];
let server = http.createServer(function(req,res){
  console.log(req.method,req.url);
  if(req.url == '/api/users'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.end(JSON.stringify(users));
  }else{
    res.end('Now Found!');
  }
});
server.listen(3000,()=>{
  console.log('服务正在3000端口上启动!');
});

```

### 2.3 .gitignore

/usr/projects/git-hub-vue-server/.gitignore

```
node_modules
lib
package-lock.json

```

## 3.前端项目

### 3.1 安装脚手架生成项目

```
cnpm i @vue/cli -g
vue create git-hub-vue
cd git-hub-vue 
cnpm i axios -S

```

### 3.2 App.vue

/usr/projects/git-hub-vue/src/App.vue

```
<template>
  <ul>
    <li v-for="(user) in users" :key="user.id">
      {{user.id}}:{{user.name}}
    </li>
  </ul>
</template>

<script>
import axios from 'axios';
export default {
  name: 'app',
  data(){
    return {
      users:[]
    }
  },
  mounted(){
    axios.get('http://localhost:3000/api/users').then(response=>{
      this.users = response.data;
    });
  }
}
</script>

<style>
</style>

```

## 4\. CICD服务器

-   [webhooks文档](https://developer.github.com/webhooks/)
-   [pushevent](https://developer.github.com/v3/activity/events/types/#pushevent)

![githubhook](http://img.zhufengpeixun.cn/githubhook.png)

### 4.1 生成项目

```
mkdir git-hub-webhook
cd git-hub-web
cnpm init -y
cnpm i nodemailer -S

```

### 4.2 webhook.js

/usr/projects/git-hub-webhook/webhook.js

```
let http = require('http');
let crypto = require('crypto');
var spawn = require('child_process').spawn;
let sendMail = require('./sendMail');
const SECRET = '123456';
function sign (data) {
  return 'sha1=' + crypto.createHmac('sha1', SECRET).update(data).digest('hex')
}
let server = http.createServer(function(req,res){
  console.log(req.method,req.url);
  if(req.url == '/webhook' && req.method =='POST'){
    let buffers = []; 
    req.on('data',function(data){
      buffers.push(data);
    });
    req.on('end',function(){
      let body = Buffer.concat(buffers);
      let sig   = req.headers['x-hub-signature'];
      let event = req.headers['x-github-event'];
      let id    = req.headers['x-github-delivery'];
      if(sig !== sign(body)){
        return res.end('Not Allowed');
      }
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({"ok":true}));
      //===========分割线===================
      if(event === 'push'){
        let payload = JSON.parse(body);
        let child = spawn('sh', [`./${payload.repository.name}.sh`]);
        let buffers = [];
        child.stdout.on('data', function (buffer) { buffers.push(buffer)});
        child.stdout.on('end', function () {
          let logs = Buffer.concat(buffers).toString();
          sendMail(`
            <h1>部署日期: ${new Date()}</h1>
            <h2>部署人: ${payload.pusher.name}</h2>
            <h2>部署邮箱: ${payload.pusher.email}</h2>
            <h2>提交信息: ${payload.head_commit&&payload.head_commit['message']}</h2>
            <h2>布署日志: ${logs.replace("\r\n",'<br/>')}</h2>
        `);
        });
      }
    });
  }else{
    res.end('Now Found!');
  }
});
server.listen(4000,()=>{
  console.log('服务正在4000端口上启动!');
});

```

### 4.3 sendMail.js

-   [nodemailer](https://nodemailer.com/smtp/well-known/)

/usr/projects/git-hub-webhook/sendMail.js

```
const nodemailer = require('nodemailer');
let transporter = nodemailer.createTransport({
    // host: 'smtp.ethereal.email',
    service: 'qq', // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
    port: 465, // SMTP 端口
    secureConnection: true, // 使用了 SSL
    auth: {
        user: '[email protected]',
        // 这里密码不是qq密码，是你设置的smtp授权码
        pass: 'zpdf0teyhjfbpcaff',
    }
});


function sendMail(message){
    let mailOptions = {
        from: '"83687401" <[email protected]>', // 发送地址
        to: '[email protected]', // 接收者
        subject: '部署通知', // 主题 
        html:message // 内容主体
    };
    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
}
module.exports = sendMail;
`

```

### 4.4 package.json

/usr/projects/git-hub-webhook/package.json

```
{
  "name": "git-hub-webhooks",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
+    "start": "pm2 start ./webhook.js --watch --name='git-hub-webhook'",
+    "stop": "pm2 stop git-hub-webhook"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "nodemailer": "^6.3.0"
  }
}

```

## 5\. 配置服务器

### 5.1 更新系统

```
#升级所有包同时也升级软件和系统内核
yum update 
#只升级所有包，不升级软件和系统内核
yum upgrade 

```

### 5.2 docker是什么?

-   Docker 属于 Linux 容器的一种封装，提供简单易用的容器使用接口。
-   Docker 将应用程序与该程序的依赖，打包在一个文件里面。运行这个文件，就会生成一个虚拟容器。程序在这个虚拟容器里运行，就好像在真实的物理机上运行一样

![dockercontainer](http://img.zhufengpeixun.cn/dockercontainer.png)

### 5.3 安装docker

```
yum install -y yum-utils   device-mapper-persistent-data   lvm2
yum-config-manager \
    --add-repo \
    https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io

```

### 5.4 阿里云加速

```
mkdir -p /etc/docker
tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://fwvjnv59.mirror.aliyuncs.com"]
}
EOF
# 重载所有修改过的配置文件
systemctl daemon-reload
systemctl restart docker

```

### 5.5 生成公钥并添加github

-   [https://github.com/settings/keys](https://github.com/settings/keys)

```
ssh-keygen -t rsa -b 4096 -C "[email protected]"
cat /root/.ssh/id_rsa.pub

```

### 5.6 安装git

```
yum install git -y
git clone [email protected]:zhufengnodejs/git-hub-vue.git
git clone [email protected]:zhufengnodejs/git-hub-vue-server.git
git clone [email protected]:zhufengnodejs/git-hub-webhook.git

```

~.gitconfig

```
[alias]
    a = add -A
    c = commit -m"msg"
    p = push origin master

```

### 5.7 安装node和npm

-   [nvm](https://github.com/nvm-sh/nvm)
    
    ```
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
    source /root/.bashrc
    nvm install stable
    npm i nrm -g
    nrm use taobao
    npm i pm2 -g
    
    ```
    

### 5.8 安装启动服务

#### 5.8.1 git-hub-vue-server

```
cd /usr/projects/git-hub-vue-server
npm i 
npm run start
curl http://localhost:3000

```

#### 5.8.2 git-hub-vue

```
cd /usr/projects/git-hub-vue
npm i 
npm run serve
curl http://localhost:8080

```

#### 5.8.3 git-hub-webhook

```
cd /usr/projects/git-hub-webhook
npm i
npm run start 
curl http://localhost:4000
curl http://47.104.15.123:4000/webhook

```

## 6\. 后台布署

### 6.1 git-hub-vue-server.sh

/usr/projects/git-hub-webhook/git-hub-vue-server.sh

```
#!/bin/bash
WORK_PATH='/usr/projects/git-hub-vue-server'
cd $WORK_PATH
echo "清理代码"
git reset --hard origin/master
git clean -f
echo "拉取最新代码"
git pull origin master
echo "开始构建镜像"
docker build -t git-hub-vue-server .
echo "删除旧容器"
docker stop git-hub-vue-server-container
docker rm git-hub-vue-server-container
echo "启动新容器"
docker container run -p 3000:3000 -d --name git-hub-vue-server-container git-hub-vue-server

```

### 6.2 Dockerfile

/usr/projects/git-hub-vue-server/Dockerfile

```
FROM node
LABEL name="git-hub-vue-server"
LABEL version="1.0"
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 3000
CMD npm start

```

### 6.3 .dockerignore

/usr/projects/git-hub-vue-server/.dockerignore

```
.git
node_modules
package-lock.json
Dockerfile
.dockerignore

```

## 7\. 前台布署

### 7.1 git-hub-vue.sh

/usr/projects/git-hub-webhook/git-hub-vue.sh

```
#!/bin/bash
WORK_PATH='/usr/projects/git-hub-vue'
cd $WORK_PATH
echo "清理代码"
git reset --hard origin/master
git clean -f
echo "拉取最新代码"
git pull origin master
echo "打包最新代码"
npm run build
echo "开始构建镜像"
docker build -t git-hub-vue .
echo "删除旧容器"
docker stop git-hub-vue-container
docker rm git-hub-vue-container
echo "启动新容器"
docker container run -p 80:80 -d --name git-hub-vue-container git-hub-vue

```

### 7.2 Dockerfile

/usr/projects/git-hub-vue/Dockerfile

```
FROM nginx
LABEL name="git-hub-vue"
LABEL version="1.0"
COPY  ./dist/ /usr/share/nginx/html/
COPY ./git-hub-vue.conf /etc/nginx/conf.d/
EXPOSE 80

```

### 7.3 git-hub-vue.conf

/usr/projects/git-hub-vue/git-hub-vue.conf

```
server {
    listen       80;
    server_name  47.104.15.123;
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    location /api {
      proxy_pass http://47.104.15.123:3000;
    }
}

```

### 7.4 .dockerignore

/usr/projects/git-hub-vue/.dockerignore

```
.git
node_modules
package-lock.json
Dockerfile
.dockerignore

```

## 8\. 集成部署

-   Compose 通过一个配置文件来管理多个Docker容器
-   在配置文件中，所有的容器通过services来定义，然后使用docker-compose脚本来启动、停止和重启应用和应用中的服务以及所有依赖服务的容器
-   最后，运行docker-compose up，Compose 将启动并运行整个应用程序 配置文件组成

### 8.1 docker-compose.yml

/usr/projects/docker-compose.yml

```
version: '2'
services:
 api:
  build:
    context: ./git-hub-vue-server
    dockerfile: Dockerfile
  ports:
    - "3000:3000"
 web:
  build:
    context: ./git-hub-vue
    dockerfile: Dockerfile
  ports:
    - "80:80"

```

### 8.2 安装docker-compose

```
curl -L https://github.com/docker/compose/releases/download/1.23.2/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

```

### 8.3 启动服务

```
docker-compose up
docker-compuse up -d

```

### 8.4 cicd.sh

/usr/projects/git-hub-webhook/cicd.sh

```
#!/bin/bash
WORK_PATH='/usr/projects/git-hub-vue-server'
cd $WORK_PATH
echo "清理后台代码"
git reset --hard origin/master
git clean -f
echo "拉取后台最新代码"
git pull origin master


WORK_PATH='/usr/projects/git-hub-vue'
cd $WORK_PATH
echo "清理前台代码"
git reset --hard origin/master
git clean -f
echo "拉取前台最新代码"
git pull origin master
echo "打包前台最新代码"
npm run build

cd /usr/projects
echo "删除老资源"
docker-compose down
echo "重启所有服务"
docker-compose up -d

```

Powered by [idoc](https://github.com/jaywcjlove/idoc). Dependence [Node.js](https://nodejs.org) run.



