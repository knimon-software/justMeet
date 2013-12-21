
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

// passport configuration
var passport = require('passport')
   ,TwitterStrategy = require('passport-twitter').Strategy;

passport.serializeUser(function(userInfo,done){
   done(null,userInfo);
});

passport.deserializeUser(function(userInfo,done){
   done(null,userInfo);
});

passport.use(new TwitterStrategy({
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "http://localhost:3000/auth/twitter/callback"
   },
   function(token, tokenSecret, profile, done){
      profile.twitter_token = token;
      profile.twitter_tokenSecret = tokenSecret;

      process.nextTick(function() {
         return done(null,profile);
      });
   }
));

//express configuration
var app = express();
var MemoryStore = express.session.MemoryStore
   ,sessionStore = new MemoryStore();

app.configure(function(){
   app.set('port', process.env.PORT || 3000);
   app.set('views', __dirname + '/views');
   app.set('view engine', 'jade');
   app.use(express.favicon());
   app.use(express.logger('dev'));
   app.use(express.bodyParser());
   app.use(express.methodOverride());
   //session configuration
   app.use(express.cookieParser());
   app.use(express.session({
      secret: "secretKey",
      store: sessionStore
   }));
   app.use(passport.initialize());
   app.use(passport.session());

   app.use(app.router);
   app.use(express.static(path.join(__dirname,'public')));
});


app.configure('development',function(){
   app.use(express.errorHandler());
});

//express routing
app.get('/',routes.index); //index & login page
app.get('/auth/twitter',passport.authenticate('twitter'));
app.get('/auth/twitter/callback',
   passport.authenticate('twitter',{successRedirect: '/room',failureRedirect: '/'}));
app.get('/logout',function(req,res){
   req.logout();
   res.redirect('/');
});

app.get('/room',isLogined,function(req,res){
   //res user profile
   res.render('room',{
      userName : req.user.displayName,
      userImage : req.user.photos[0].value,
   });
});

//check authenticated
function isLogined(req,res,next){
   //アクセス時にroomidが付加されている場合はクッキーに保存する
   if(req.query.id){
      res.cookie('id',req.query.id);
   }

   if(req.isAuthenticated()){
      console.log('authenticated');
      return next();
   }

   res.redirect('/');
}

var server = http.createServer(app);
server.listen(app.get('port'),function(){
   console.log("Express server listening on port " + app.get('port'));
});

//socket.io configuration
var io = require('socket.io').listen(server);
var parseSignedCookie = require('connect').utils.parseSignedCookie;
var cookie            = require('express/node_modules/cookie');

//クライアントからアクセスされてきたときにhandshakeDataにルームIDをセットするため処理
// /room?idでアクセスしてきた場合にはidのnamespaceを作成(存在しなければ。)
var Loby = io.of('/room').authorization(function(handshakeData,callback){

   if(handshakeData.query.id){
      var id = handshakeData.query.id;
   }else{
      //指定がなければIDを作成
      var id = generateHashString(handshakeData);
   }

   handshakeData.roomId=id;
   console.log('authenticated: ' + handshakeData.roomId);

   if(!io.namespaces.hasOwnProperty('/room/' + id )){
      //createRoom & shared session
      var instantRoom = io.of('/room/' + id).authorization(function(handshakeData,callback){
         if(handshakeData.headers.cookie){
            var cookie = handshakeData.headers.cookie;
            console.log(cookie);
            var sessionID = parseSignedCookie(cookie['connect.sid'],'secretKey');

            //get session from sessionStorage
            sessionStore.get(sessionID,function(err,session){
               if(err){
                  callback(err.message,false);
               }else{
                  //authorized
                  handshakeData.session = session;
                  callback(null,true);
               }
            });
         }else{
            return callback('not found cookie',false);
         }
      });


      instantRoom.on('connection',function(socket){
         //main Logic
         socket.on('msg',function(msgData){
            socket.emit('msg',msgData);
         });
      });
   }

   callback(null,true);
});

Loby.on('connection',function(socket){
   console.log('handshakedata : ' + socket.handshake);
   socket.emit('roomId',socket.handshake.roomId);
});

/*generate Hash String from Current Date + HandShake Data */
function generateHashString(handshake){
   var currentDate = new Date();
   var dateString = "" + currentDate.getFullYear()  + currentDate.getMonth() + currentDate.getDate();
   dateString += "" + currentDate.getHours() + currentDate.getMinutes() + currentDate.getMilliseconds();
   var sha1 = require('crypto').createHash('sha1');

   sha1.update(dateString + handshake.address.address);

   return sha1.digest('hex');
}
