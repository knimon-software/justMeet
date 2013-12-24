var socket = io.connect('http://localhost:3000/room');
var userName = '#{userName}';
var userImage = '#{userImage}';

socket.on('connect',function(){
   socket.on('roomId',function(data){
      var roomId = data;
      var instanceRoom = io.connect('http://localhost:3000/room/' + roomId);
      instanceRoom.on('connect',function(){
         instanceRoom.on('msg',function(msgData){
            displayChat(msgData.name,msgData.image,msgData.msg);
         });
      });

      function sendMessage(){
         var msg = $('#textArea').val();
         $('#textArea').val('').focus();
         instanceRoom.emit('msg',msg);
      }
      $('#btn').click(function(e){
         sendMessage();
      })

      $('#textArea').keypress(function(e){
         if(e.which == 13){
            return sendMessage();
         }
      });
   });
});

//発言内容を表示する
function displayChat(name,image, msg) {
   console.log('chat: from=' + name + ', msg=' + msg);
   var msgBox = $('<div>',{class : 'media'});
   var msgBody = $('<div>',{class : 'media-body'});
   msgBody.html("<h4>"+name+"</h4>"+msg);
   
   var pull = $('<a>',{class : 'pull-left',href : '#'});
   var userImg = $('<img>',{src : image});

   pull.append(userImg);
   msgBox.append(pull);
   msgBox.append(msgBody);
   $('#msgList').prepend(msgBox);
}
