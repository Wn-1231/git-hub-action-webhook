const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  // host: 'smtp.ethereal.email',
  service: "qq", // 使用了内置传输发送邮件 查看支持列表：https://nodemailer.com/smtp/well-known/
  port: 465, // SMTP 端口
  secureConnection: true, // 使用了 SSL
  auth: {
    // 发送者邮箱
    user: "610643143@qq.com",
    // 这里密码不是qq密码，是你设置的smtp授权码
    pass: "hyvhyifzhopmbfch",
  },
});

function sendMail(message,name) {
  let mailOptions = {
    from: '610643143@qq.com',     // 发送者邮箱
    to: "wang610643143@163.com",  // 接收者
    subject: `部署通知-${name}`,   // 主题
    html: message, // 内容主体
  };
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);
  });
}
module.exports = sendMail;
