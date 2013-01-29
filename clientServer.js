var express = require('express');
var router = require('./router.js');
var config = require('./config.js');

var app = express();
var server = require('http').createServer(app);

app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
app.use(express.bodyParser());
//app.use(express.cookieSession());
app.use(express.cookieParser());

var MemoryStore = require('./node_modules/express/node_modules/connect/lib/middleware/session/memory');
var session_store = new MemoryStore();

var parseCookie = require('./node_modules/express/node_modules/cookie/index.js').parse;
var parseSignedCookies = require('./node_modules/express/node_modules/connect/lib/utils').parseSignedCookies

app.use(express.session({ store: session_store,secret:'show' }));
app.use(function(req,res,next){
	req.session.username = 'wang';
	next();
})

var io = require('socket.io').listen(server);
var sockets = require('./sockets.js');
var userList = sockets.userList;
var kefuList = sockets.kefuList;

io.set('authorization', function(handshakeData, callback){
	// 通过客户端的cookie字符串来获取其session数据
	handshakeData.cookie = parseSignedCookies(parseCookie(handshakeData.headers.cookie),'show');
	// console.log('===============================================================')
	// console.log(handshakeData)
	// console.log('===============================================================')
	// console.log(session_store);
	var connect_sid = handshakeData.cookie['connect.sid'];
	if (connect_sid) {
		session_store.get(connect_sid, function(error, session){
			if (error) {
				// if we cannot grab a session, turn down the connection
				callback(error.message, false);
			}
			else {
				// save the session data and accept the connection
				handshakeData.session = session;
				callback(null, true);
			}
		});
	}
	else {
		callback('nosession');
	}
});

router(app);

server.listen(config.userport);

io.sockets.on('connection', function(socket){
	console.log("Connection " + socket.id + " accepted.");
	// console.log('===============================================================')
	// console.log(socket.handshake.session)
	// console.log(socket.handshake.session.username);
	// console.log('===============================================================')
	var user = {
		socket : socket,
		chating: false
	};
	userList[socket.id] = user;
	userList.len ++;
	socket.emit('searchkefu','寻找客服中....');
	search();
	//socket.broadcast.emit('systemMessage','公共信息~~~~新用户进入队列');
	
	function search(){
		var getKefu = false;
		for(var k in kefuList){
			if(kefuList.hasOwnProperty(k) && k!='len'){
				if(!kefuList[k].busy){
					kefuList[k].socket.emit('userConnect','有用户进入');
					getKefu = true;
					user.chating = true;
					kefuList[k].busy = true;
					user.kefu = kefuList[k];
					kefuList[k].user = user;
					socket.emit('getkefu','找到客服['+kefuList[k].socket.id+']为您服务');
					break;
				}
			}
		}
		if(!getKefu){
			socket.emit('getkefu','没有空闲客服，请稍后');
		}
	}
	socket.on('researchkefu',search);
	socket.on('disconnect',function(){
		if(userList[socket.id].kefu){
			userList[socket.id].kefu.busy = false;
			userList[socket.id].kefu.socket.emit('userleave','用户已退出');
			delete userList[socket.id];
			console.log('======================disconneect===================================');
		}
		userList.len --;
	});
	
	socket.on('sendusermsg',function(msg){
		var kefu = userList[socket.id].kefu;
		kefu.socket.emit('getusermsg',msg);
	});
});

