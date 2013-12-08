var io = require('socket.io').listen(8080);

io.configure(function (){
   io.set('authorization', function(handshake,callback){
      var id = handshake.query.id;
      console.log('clientConnected id = ' + id);
      if(!io.namespaces.hasOwnProperty('/chat/' + id )){
         io.of('/chat/' + id).on('connection',function(socket){
            socket.emit('initMsg','welcome');
            socket.on('MsgEvent',function(msg){
               console.log('recvMessage : ' + msg);
               io.of('/chat/' + id).emit('bcMsg',"Hello" + msg);
            });
         });
      }

      callback(null,true);
   });
});


io.of('/createRoom').on('connection',function(socket){
   socket.emit('roomNum','12345');
});
