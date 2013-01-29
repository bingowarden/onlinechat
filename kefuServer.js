var express = require('express');
var router = require('./router.js');
var config = require('./config.js');

var app = express();
var server = require('http').createServer(app);

app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
app.use(express.bodyParser());
app.use(express.cookieParser());

router(app);

server.listen(config.kefuport);

var io = require('socket.io').listen(server);
var sockets = require('./sockets.js');
var kefuList = sockets.kefuList;
var userList = sockets.userList;
io.sockets.on('connection', function(socket){
	console.log("Connection " + socket.id + " accepted.");
	kefuList[socket.id] = {
		socket:socket,
		busy:false
	};
	
	kefuList.len ++;
	console.log(kefuList.len);
	searchUser();
	// console.log(sockets);
	function searchUser(){
		for(var u in userList){
			if(userList.hasOwnProperty(u) && u!='len'){
				if(!userList[u].chating){
					console.log('====================searchUser'+u+'=================================')
					kefuList[socket.id].busy = true;
					kefuList[socket.id].user = userList[u];
					userList[u].chating = true;
					userList[u].kefu = kefuList[socket.id];
					userList[u].socket.emit('getkefu','找到客服['+socket.id+']为您服务');
					socket.emit('userConnect','用户进入');
					break;
				}
			}
		}
	}
	
	socket.on('userleave',searchUser);
	
	socket.on('disconnect',function(){
		console.log('=======================kefudisconnect==============================')
		kefuList.len --;
		if(kefuList[socket.id].user){
			kefuList[socket.id].user.chating = false;
			kefuList[socket.id].user.socket.emit('kefuDisConnect','客服掉线');
			kefuList[socket.id].user.socket.emit('researchkefu','重新寻找客服中...');
			delete kefuList[socket.id].user.kefu;
			delete kefuList[socket.id];
		}
	});
	socket.on('sendkefumsg',function(msg){
		var user = kefuList[socket.id].user;
		user.socket.emit('getkefumsg',msg);
	});
});

