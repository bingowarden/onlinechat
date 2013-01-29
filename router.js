var os = require('os');
module.exports = function(app){
	app.get('/',function(req,res,next){
		res.render('index',{
            host : req.headers.host.split(':')[0]
        });
	});
	app.get('/user',function(req,res,next){
		res.render('user');
	});
	app.get('/kefu',function(req,res,next){
		res.render('kefu');
	});
}