var app = require('express')();
var http = require('http');
var server = http.createServer(app).listen(process.env.PORT || '8080', function () {
    console.log('App listening on port %s', server.address().port);
    console.log('Press Ctrl+C to quit.');
  });
var app_pirateio = require('express')();
var server1 = require('http').Server(app_pirateio);
var io = require('socket.io')(server1,{transports: ['websocket']});

var uuid = require('uuid4');
app.get('/', function(req, res){
 
    res.send('GameTime:'+GAME_TIME);
  });
   


server1.listen(65080);


var DEFAULT_SPEED = 0.01;
var MAX_COIN = 25;
var CURRENT_COIN = 0;
var RESPAWN_COIN_INTERVAL = 5;
var LAST_RESPAWN_COIN_TIME = 0;
var PLAYER_LIST = {};
var COIN_LIST = {};
var PROJECTILE_LIST = {};
var WORLD = 
{
    x : 10,
    y : 10
}
var LEVEL_TABLE = 
[
    {
        LEVEL:0,
        EXP:0,
        CANNON_QTY:2,
        SPEED:DEFAULT_SPEED
    },
    {
        LEVEL:1,
        EXP:500,
        CANNON_QTY:2,
        SPEED:0.015
    },
    {
        LEVEL:2,
        EXP:1000,
        CANNON_QTY:2,
        SPEED:0.02
    },
    {
        LEVEL:3,
        EXP:2000,
        CANNON_QTY:4,
        SPEED:0.02
    },
    {
        LEVEL:4,
        EXP:4000,
        CANNON_QTY:4,
        SPEED:0.025
    },
    {
        LEVEL:5,
        EXP:8000,
        CANNON_QTY:4,
        SPEED:0.03
    },
    {
        LEVEL:6,
        EXP:16000,
        CANNON_QTY:6,
        SPEED:0.03
    },
    {
        LEVEL:7,
        EXP:32000,
        CANNON_QTY:6,
        SPEED:0.035
    },
    {
        LEVEL:8,
        EXP:50000,
        CANNON_QTY:8,
        SPEED:0.035
    },
]


var GAME_TIME = 0;
var Player = function(id,name,x,y,z)
{
    var self = {
        id:id,
        name:name,
        x:x,
        y:y,
        z:z,

        level:1,
        nextLevelCoin:LEVEL_TABLE[1].EXP,
        coin:0,
        cannon:LEVEL_TABLE[1].CANNON_QTY,
        speed:DEFAULT_SPEED,
        fireTStamp:0,
        fireCooldown:1.5,

        input_left:false,
        input_right:false,
        input_fire:false
    }
    return self;
}
var Coin = function(id,x,y,value)
{
    var self = {
            id:id,
            x:x,
            y:y,
            value:value
        }
    return self;
}
var Projectile = function(id,owner,x,y,z,speed,ttl)
{
    var self = {
        id:id,
        owner:owner,
        x:x,
        y:y,
        z:z,
        speed:speed,
        ttl:ttl
    }
    return self;

}

io.on('connection', function(socket){
    console.log("client "+ socket.id +" has connected");
    socket.emit('InitCoin',COIN_LIST);
    socket.emit('InitPlayer',PLAYER_LIST);

    socket.on('Play',function(data){
 
        var posx = RandomRange(-WORLD.x,WORLD.x);
        var posy = RandomRange(-WORLD.y,WORLD.y);
        var rot = RandomRange(0,359);
        var player = Player(socket.id,data,posx,posy,rot);
        PLAYER_LIST[socket.id] = player;
     
        socket.emit('PlayerJoined',player);
        socket.broadcast.emit('OnOtherPlayerJoined',player);
        console.log("player "+ data +" has joined");
 
    });


 
    socket.on('PlayerInput',function (data) {
        //console.log('player'+ PLAYER_LIST[socket.id].name + " has "+ data   );
        var player  = PLAYER_LIST[socket.id];
        if(player != null)
        {
            if(data === 'LEFT_DOWN') player.input_left = true;
            //else if(data === 'LEFT_UP') player.input_left = false;

            else if(data === 'RIGHT_DOWN') player.input_right = true;
            //else if(data === 'RIGHT_UP') player.input_right = false;

            else if(data ==='SPACE_DOWN') player.input_fire = true;
        }

    });

    socket.on('PlayerQuit',function(){
        console.log('player'+ socket.id + " has quit");
        var player = PLAYER_LIST[socket.id];
        socket.broadcast.emit('quit',player);
        socket.emit('quit',player);
        delete PLAYER_LIST[socket.id];
    });

    socket.on('disconnect',function () {
        console.log('player'+ socket.id + " has disconnected");
        var player = PLAYER_LIST[socket.id];
        socket.broadcast.emit('dis',player);
    
        delete PLAYER_LIST[socket.id];
    });
   
});
 

function InitCoin()
{
    for (var i = 0; i < MAX_COIN; i++) {
       var coin =  CreateCoin();
       COIN_LIST[coin.id] = coin;
    }
  
}
function CreateCoin()
{
    var id = uuid();
    var x = RandomRange(-WORLD.x,WORLD.x);
    var y = RandomRange(-WORLD.y,WORLD.y);
    var value = 100;
    var coin = Coin(id,x,y,value);
    CURRENT_COIN++;
    return coin;
}
function Clamp(num,min,max)
{
    return Math.min(Math.max(num,min),max);
}
function Distance(x1,y1,x2,y2)
{
    var deltaX = x1-x2;
    var deltaY = y1-y2;

    return Math.sqrt(deltaX*deltaX + deltaY*deltaY);
}
function RandomRange(min,max)
{
    return Math.random() * (max - min) + min;
}



function UpdatePlayer()
{
    for(var i in PLAYER_LIST)
        {
           
            var player = PLAYER_LIST[i];
            //Movement
           if(player.input_left) 
           {
            player.z += 1;
            if(player.z >= 360)player.z = 0;
           }
           
           if(player.input_right) 
           {
            player.z -= 1;
            if(player.z <= 0)player.z = 360;
           }

           var rad = player.z * (Math.PI/180)
           player.x -= Math.sin(rad) * player.speed;
           player.y += Math.cos(rad) * player.speed;
           
           player.x = Clamp(player.x,-WORLD.x,WORLD.x);
           player.y = Clamp(player.y,-WORLD.y,WORLD.y);

           //Player Fire
           if(player.input_fire &&player.fireTStamp + player.fireCooldown <= GAME_TIME) 
           {
            var owner = player.id;
            var x = player.x;
            var y = player.y;
            var cannOneSide = player.cannon/2;
       
            for (var i = 0; i < cannOneSide; i++) { 
                var id1 = uuid();
                var id2 = uuid();

                var zDelta=  ((i-1)* cannOneSide*10);
                var z1 = (player.z + 65)  +  zDelta;
                var z2 = (player.z - 65)  -  zDelta;
            
                var projectile1 = Projectile(id1,owner,x,y,z1,0.03,100);
                var projectile2 = Projectile(id2,owner,x,y,z2,0.03,100);

                PROJECTILE_LIST[id1] = projectile1;
                PROJECTILE_LIST[id2] = projectile2;
                io.emit('SpawnProjectile',projectile1);
                io.emit('SpawnProjectile',projectile2);
            }
            player.fireTStamp = GAME_TIME;

           }
           player.input_left = false;
           player.input_right = false;
           player.input_fire = false;
           //Check Collision

           //Pick up Coin
           for(var j in COIN_LIST)
           {     
               var coin = COIN_LIST[j];
               var distance = Distance(player.x,player.y,coin.x,coin.y);

               if(distance <=1)
               {
                   GainCoin(player,coin.value);

                   io.emit('PickupCoin',coin);
                   delete COIN_LIST[j];
                   CURRENT_COIN--;
               }
           }
           for(var i in PROJECTILE_LIST)
           {     
               var projectile = PROJECTILE_LIST[i];
               var distance = Distance(player.x,player.y,projectile.x,projectile.y);

               if(distance <=0.75 && projectile.owner!= player.id)
               {
                   io.emit('PlayerDie',player);
                   io.emit('DestroyProjectile',projectile);
                  
               }
           }
        }
}
function UpdateProjectile()
{
    for(var i in PROJECTILE_LIST)
    {
       var projectile =  PROJECTILE_LIST[i];
        var rad = projectile.z * (Math.PI/180);
        projectile.x -= Math.sin(rad) * projectile.speed;
        projectile.y += Math.cos(rad) * projectile.speed;
        //Check collison
       projectile.ttl--;
       if(projectile.ttl<=0)
       {
        delete PROJECTILE_LIST[i];
        io.emit('DestroyProjectile',projectile);
       }
    }


}
function LevelUp(player)
{
    if(player.level < LEVEL_TABLE.length)
    {
        player.level++;
        player.nextLevelCoin = LEVEL_TABLE[player.level].EXP;
        player.speed = LEVEL_TABLE[player.level].SPEED;
        player.cannon = LEVEL_TABLE[player.level].CANNON_QTY;
        io.emit('PlayerLevelUp',player);
    }
}
function GainCoin(player,coin)
{
    player.coin += coin;
    if(player.coin >= player.nextLevelCoin)
    {
        LevelUp(player);
    }
}
function UpdateCoin()
{
   if(GAME_TIME >= LAST_RESPAWN_COIN_TIME + RESPAWN_COIN_INTERVAL)
   { 
        if(CURRENT_COIN < MAX_COIN)
        {
            var coin_list = {};
            for (var i = CURRENT_COIN ; i <  MAX_COIN ; i++) {
                var coin = CreateCoin();
               
                coin_list[coin.id] = coin;
                COIN_LIST[coin.id] = coin;
                console.log('new coin has been created ' + coin.id);
             }
            io.emit('SpawnCoins',coin_list);
        }   
        LAST_RESPAWN_COIN_TIME = GAME_TIME;
   }

}
InitCoin();
setInterval(function()
{
    GAME_TIME+=0.01;

    UpdatePlayer();
    UpdateProjectile();
    UpdateCoin();

    io.emit('UpdatePlayer',PLAYER_LIST);
    io.emit('UpdateProjectile',PROJECTILE_LIST);
},10);
