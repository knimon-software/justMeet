
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
      userImage : req.user.photos[0].value
   });
});

app.get('/room/:id',function(req,res){
  //初回にidつきでアクセスしてきた場合には、ログイン後当該ページへリダイレクトする 
}
//check authenticated
function isLogined(req,res,next){
   if(req.isAuthenticated()){
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
var parseCookie = require('connect').utils.parseCookie;

// /room?idでアクセスしてきた場合にはidのnamespaceを作成(存在しなければ。)
io.of('/room').authorization(function(handshakeData,callback){
   var id = handshake.query.id;
   console.log('clientConnected id = ' + id);

   if(!io.namespaces.hasOwnProperty('/room/' + id )){
      //createRoom & shared session
      var instantRoom = io.of('/room/' + id).authorization(function(handshakeData,callback){
         if(handshakeData.headers.cookie){
            var cookie = handshakeData.headers.cookie;
            var sessionID = parseCookie(cookie)['connect.sid'];

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
         socket.emit('msg','hello');
      });
   }
      callback(null,true);
});
