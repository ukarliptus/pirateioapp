var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/', express.static('public'));

io.on('connection', function(socket){
  socket.on('login', function(){
    console.log("connected");
  });
 socket.on('disconnect', function(){
   console.log("disconnect");
});
});

app.set('port',(process.env.PORT || 3000))
http.listen(app.get('port'), function () {
  console.log('Example app listening on port ' + app.get('port'));
});