const mongoose = require('mongoose');
const config = require('config');
const bcrypt = require('bcrypt');
const fs = require('fs');
const saltRounds = 10;

const models = [
    {   name:'user',
        schema:mongoose.Schema({
            username : String,
            password : String
                })
    },
    {
        name:'group',
        schema:mongoose.Schema({
            groupname : String
        })
    },
];

const myHash = function(pw){
    return bcrypt.hashSync(pw,saltRounds);
}

class chatdb{
    constructor(){
        const uri = config.mongo.uri || 'mongodb://localhost/ChatDatabase';
        mongoose.connect(uri);
        this.db = mongoose.connection;
        models.forEach(({name,schema})=>{
            this[name] = this.db.model(name,schema);
        });
    }

    async auth(loginMsg,callback){
        let loginJson = JSON.parse(loginMsg);
        this['user'].findOne({username:loginJson['username']},(err,doc)=>{
            if(doc === null){//无记录
                //仅当登陆成功时具有username属性
                callback({});
                return;
            }
            fs.writeFile('log',JSON.stringify(doc),()=>{});
            if(doc['password']){//有记录有密码
                bcrypt.compare(loginJson['password'],doc.password,
                (err,res)=>{
                    if(res) callback({username:loginJson.username});
                    else callback({});//密码错误
                });
            }
            else{//有记录无密码
                fs.writeFile('pw',doc.hasOwnProperty('password'),()=>{});
                callback({username:loginJson.username});
            }
        });
    }
    async reg(regMsg,callback){
        let regJson = JSON.parse(regMsg);
        this['user'].findOne({username:regJson['username']},(err,doc)=>{
            if(doc === null){
                //无记录，可以注册
                const newUser = new this['user']({
                    username : regJson['username'],
                    password : myHash(regJson['password'])
                });
                this['user'].create(newUser,(err,docs)=>{
                    callback({
                        username : regJson['username'],
                        result : true,
                        msg : '注册成功，自动登录到系统'
                    });
                });
            }else callback({
                    username : regJson['username'],
                    result : false,
                    msg : '用户名已被占用'
                });
            
        });
    }
}
module.exports = new chatdb();