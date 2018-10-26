const io = require('socket.io-client');
const readline = require('readline');
const socket = io('http://localhost:6789');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let loginUsername = false;
const userList = new Set();

const consoleInput = (prompt) => new Promise((resolve) => rl.question(prompt, (answer) => { resolve(answer); }));


socket.on('userOnline', (user) => {
  console.log(`用户${user}已上线`);
  userList.add(user);
});
socket.on('userOffline', (user) => {
  console.log(`用户${user}已下线`);
  userList.delete(user);
});
socket.on('userList', (ul) => {
  for (const u of ul) {
    if (u!==loginUsername) {
      userList.add(u);
    }
  }
});
socket.on('chat', (msg) => {
  const msgJson = JSON.parse(msg);
  console.log(`${msgJson.username} @ ${new Date(msgJson.time).toLocaleString()} 发来: ${msgJson.content}`);
});
socket.on('heartbeat', () => {
  socket.emit('heartbeat', loginUsername);
});

const waitForReg = (done) => {
  socket.once('loginResult', (msg) => {
    console.log(JSON.parse(msg).msg);
    loginUsername = JSON.parse(msg).username;
    done();
  });
};
const waitForLogin = (done) => {
  socket.once('regResult', (msg) => {
    console.log(JSON.parse(msg).msg);
    loginUsername = JSON.parse(msg).username;
    done();
  });
};

(async function() {
  let username = '';
  let password = '';
  while (true) {
    if (loginUsername) {
      const opt1 = await consoleInput('请输入要进行聊天的用户ID（输入 \'999\'手动获取在线用户）\n');
      switch (opt1) {
      case ('999'):
        if (userList.size) {
          console.log('目前的在线用户有:');
          for (const u of userList.keys()) { console.log(u); }
        } else {
          console.log('目前没有其他在线用户.');
        }
        break;
      default:
        if (userList.has(opt1)) {
          const content = await consoleInput('请输入聊天的内容:\n');
          socket.emit('chat', JSON.stringify({
            from: loginUsername,
            to: opt1,
            content,
            time: new Date()
          }));
        } else {
          console.log('不存在该在线用户');
        }
        break;
      }
    } else {
      const opt2 = await consoleInput('请输入选项：1.登陆 2.注册：\n');
      switch (opt2) {
      case ('1'):
        username = await consoleInput('请输入用户名：');
        password = await consoleInput('请输入密码：');
        socket.emit('login', JSON.stringify({
          username,
          password
        }));
        await new Promise(waitForLogin);
        break;
      case ('2'):
        username = await consoleInput('请输入用户名：');
        password = await consoleInput('请输入密码：');
        socket.emit('reg', JSON.stringify({
          username,
          password
        }));
        await new Promise(waitForReg);
        break;
      default: break;
      }
    }

  }
}());


