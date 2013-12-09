var io = require('socket.io').listen(8080);

io.configure(function (){
   io.set('authorization', function(handshake,callback){
      var id = handshake.query.id;
      console.log('clientConnected id = ' + id);
      if(!io.namespaces.hasOwnProperty('/room/' + id )){
         io.of('/room/' + id).on('connection',function(socket){
            socket.on('MsgEvent',function(msg){
               console.log('recvMessage : ' + msg);
               io.of('/chat/' + id).emit('bcMsg','Hello' + msg);
            });
         });
      }
      callback(null,true);
   });
});

var createRoom = io.of('/createRoom').authorization(function(handshake,callback){
     handshake.hashString = generateHashString(handshake);
     callback(null,true);
}); 
      
createRoom.on('connection',function(socket){
   console.log('sendMessage : ' +socket.handshake.hashString); 
   socket.emit('roomID',socket.handshake.hashString);
});


/*generate Hash String from Current Date + HandShake Data */
function generateHashString(handshake){
   var currentDate = new Date();
   var dateString = "" + currentDate.getFullYear()  + currentDate.getMonth() + currentDate.getDate();
   dateString += "" + currentDate.getHours() + currentDate.getMinutes() + currentDate.getMilliseconds();
   var sha1 = require('crypto').createHash('sha1');

   sha1.update(dateString + handshake.address.address);

   console.log(dateString + ' : ' + handshake.address.address + ' : ' + handshake.address);
   return sha1.digest('hex');
};
