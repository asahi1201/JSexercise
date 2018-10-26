const mongoose = require('mongoose');
const config = require('config');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const models = [
  { name: 'user',
    schema: mongoose.Schema({
      username: String,
      password: String
    })
  },
  {
    name: 'group',
    schema: mongoose.Schema({
      groupname: String
    })
  },
];

const myHash = (pw) => bcrypt.hashSync(pw, saltRounds);

class chatdb {
  constructor() {
    const uri = config.mongo.uri || 'mongodb://localhost/ChatDatabase';
    mongoose.connect(uri);
    this.db = mongoose.connection;
    models.forEach(({name, schema}) => {
      this[name] = this.db.model(name, schema);
    });
  }

  async auth(loginMsg, callback) {
    const loginJson = JSON.parse(loginMsg);
    this.user.findOne({username: loginJson.username}, (err, doc) => {
      if (err) { console.log('there is an error'); }
      if (doc === null) { // 无记录
        // 仅当登陆成功时具有username属性
        callback({});
        return;
      }
      if (doc.password) { // 有记录有密码
        bcrypt.compare(
          loginJson.password, doc.password,
          (err2, res) => {
            if (err2) { console.log('there is an error'); }
            if (res) { callback({username: loginJson.username});
              return; }
            callback({}); // 密码错误

          }
        );
      }
      else { // 有记录无密码
        callback({username: loginJson.username});
        return;
      }
    });
  }

  async reg(regMsg, callback) {
    const regJson = JSON.parse(regMsg);
    this.user.findOne({username: regJson.username}, (err, doc) => {
      if (err) { console.log('there is an error'); }
      if (doc === null) {
        // 无记录，可以注册
        const newUser = new this.user({
          username: regJson.username,
          password: myHash(regJson.password)
        });
        this.user.create(newUser, (err3) => {
          if (err3) { console.log('there is an error'); }
          callback({
            username: regJson.username,
            result: true,
            msg: '注册成功，自动登录到系统'});
        });
      } else { callback({
        username: regJson.username,
        result: false,
        msg: '用户名已被占用'});
      return;
      }
    });
  }
}
module.exports = new chatdb();
