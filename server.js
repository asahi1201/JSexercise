const Koa = require('koa');
const app = new Koa();
const serve = require('koa-static');
app.use(serve('public'));
const chatdb = require('./mongoDB');

const server = require('http').Server(app.callback());
const io = require('socket.io')(server);
const sockets = {};
const heartbeatAck = {};
server.listen(6789);
console.log('服务器在6789端口监听.');


// 连接
io.on('connection', (socket) => {
  console.log('a user connect.');
  // 对每个客户端，每5秒发送一次心跳请求
  setInterval(() => {
    for (const u in sockets) {
      sockets[u].emit('heartbeat');
      heartbeatAck[u] = false;
    }
  }, 5000);
  // 对每个客户端，每13秒确认一次心跳
  setInterval(() => {
    for (const u in heartbeatAck) {
      if (!heartbeatAck[u]) {
        sockets[u].disconnect();
        delete sockets.u;
        delete heartbeatAck.u;
        // 用户下线广播
        socket.broadcast.emit('userOffline', u);
      }
    }
  }, 13000);

  socket.on('heartbeat', (username) => {
    heartbeatAck[username] = true;
  });



  // 登陆
  socket.on('login', (loginMsg) => {
    chatdb.auth(loginMsg, (loginResult) => {
      if (loginResult.username) {
        console.log(`loginResult:${JSON.stringify(loginResult)}`);
        new Promise((resolve) => {
          socket.emit('loginResult', JSON.stringify({
            username: loginResult.username,
            msg: '登陆成功'
          }));
          sockets[loginResult.username] = socket;
          // 用户上线广播
          socket.broadcast.emit('userOnline', loginResult.username);
          heartbeatAck[loginResult.username] = true;
          resolve();
        }).then(() => {
          // 发送在线用户列表
          socket.emit('userList', Object.keys(sockets));
        });

      } else {
        socket.emit('loginResult', JSON.stringify({
          // 仅当登陆成功时具有username属性
          msg: '用户不存在或密码错误'
        }));
      }
    });
  });

  // 注册
  socket.on('reg', (regMsg) => {
    console.log(`regMsg:${regMsg}`);
    chatdb.reg(regMsg, (regResult) => {
      socket.emit('regResult', JSON.stringify(regResult));
      if (regResult.result) {
        sockets[regResult.username] = socket;
        socket.broadcast.emit('userOnline', regResult.username);
        socket.emit('userList', Object.keys(sockets));
      }
    });
  });

  socket.on('chat', (chatMsg) => {
    const chatJson = JSON.parse(chatMsg);
    console.log(`聊天信息：${JSON.stringify(chatJson)}`);
    // 私聊
    sockets[chatJson.to].emit('chat', JSON.stringify({
      username: chatJson.from,
      content: chatJson.content,
      time: chatJson.time
    }));
    // 群聊
    /*
         */
  });



  socket.on('disconnetion', (logoutMsg) => {
    const logoutJson = JSON.parse(logoutMsg);
    delete sockets[logoutJson.username];
    socket.broadcast.emit('userOffline', logoutJson.username);
  });
});
