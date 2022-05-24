let http = require("http");
let crypto = require("crypto");
var spawn = require("child_process").spawn;
let sendMail = require("./sendMail");

// github 配置自定义验证的秘钥
const SECRET = "123456";
// 加密验证
function sign(data) {
  return "sha1=" + crypto.createHmac("sha1", SECRET).update(data).digest("hex");
}
// 启动 ci/cd 服务器
let server = http.createServer(function (req, res) {
  // 监听 git hub webhook
  if (req.url == "/webhook" && req.method == "POST") {
    let buffers = [];
    req.on("data", function (data) {
      buffers.push(data);
    });
    req.on("end", function () {
      let body = Buffer.concat(buffers);
      let sig = req.headers["x-hub-signature"];
      let event = req.headers["x-github-event"];
      // 验证加密
      if (sig !== sign(body)) {
        return res.end("Not Allowed");
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));


      //=========== 监听 push 事件，根据仓库名称，触发对应仓库的构建脚本 ===================
      if (event === "push") {
        let payload = JSON.parse(body);
        // 触发 CI/CD 脚本
        let child = spawn("sh", [`../${payload.repository.name}/${payload.repository.name}.sh`]);
        let buffers = [];
        // 监听CI/CD 脚本运行日志
        child.stdout.on("data", function (buffer) {
          buffers.push(buffer);
        });
        // 监听CI/CD 构建结果，发送邮件进行通知
        child.stdout.on("end", function () {
          let logs = Buffer.concat(buffers).toString();
          sendMail(`
            <h1>部署日期: ${new Date()}</h1>
            <h2>部署人: ${payload.head_commit.author.name}</h2>
            <h2>部署邮箱: ${payload.head_commit.author.email}</h2>
            <h2>提交信息: ${
              payload.head_commit && payload.head_commit["message"]
            }</h2>
            <h2>布署日志:</h2>
            <div>log: </br> 
              ${logs.replace("\r\n", "<br/>")}
            </div>
            `,payload.repository.name);
        });
      }
    });
  } else {
    res.end("Now Found!");
  }
});
server.listen(4000, () => {
  console.log("服务正在4000端口上启动!");
});
