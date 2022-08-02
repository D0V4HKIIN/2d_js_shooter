const express = require('express');
const app = express();
const serv = require('http').Server(app);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/login.html');
});

app.get('/game', function (req, res) {
  res.sendFile(__dirname + '/client/game.html');
});

app.get('/setup', function (req, res) {
  res.sendFile(__dirname + '/client/setup.html');
});

app.use('/client',express.static(__dirname + '/client'));

serv.listen(11032);

console.log("Started!");

const io = require('socket.io')(serv,{});

const Player = require("./server/player.js");
const Bullet = require("./server/bullet.js");
const Teleport = require("./server/teleport.js");

const fs = require('fs');

var walls = JSON.parse(fs.readFileSync(__dirname + '/client/map/walls.json'), function(k, v) {
  return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
});

console.log(walls);

var players = [];
var bullets = [];
var teleports = [];
const playerSpeed = 0.4;
const jetpackPower = -1;
const gravity = 0.3;

const canonWidth = 20;
const canonHeight = 50;

var shootingSpeed = 0;
const teleportSpeed = 200;


const path = require('path');

var allTextures = {};

function readFolder(folder,name){
  var tempObject = {};
  const directoryPath = path.join(__dirname, folder);
  files = fs.readdirSync(directoryPath);
  files.forEach(function (file){
    if(fileExtension(file) == "png" || fileExtension(file) == "gif"){
      tempObject[file.slice(0,-4)] = folder+"/"+file;
    }else{
      tempObject[file] = readFolder(folder+"/"+file,file);
    }
  });
  return tempObject;
}

function fileExtension(filename){
  return filename.split('.').pop();
}

allTextures = readFolder("/client/images", "textures");

console.log(allTextures);


io.sockets.on('connection', function (socket){
  console.log("Socket connection");

  //socket.emit("sendWalls", {walls: walls});
  socket.emit("sendTextures", {textures: allTextures});

  var thisPlayer;
  var loggedIn = false;

  socket.on("sendBackPlayer", function (data){
    loggedIn = true;
    thisPlayer = new Player(
        {
          x: 100,
          y: 100
        },{
          x: 1,
          y: 1
        },{
          x: 0,
          y: 0
        },
        data.username,
        data.skin,
        nextId(players)
      );;

      players.push(thisPlayer);
  });

  socket.on("baseClockCallback", function (data){
    thisPlayer.updateAngle(data.mousePos);
    thisPlayer.shooting = data.shooting;
    thisPlayer.shootTeleport = data.shootTeleport;

  });

  socket.on("moveRight", function (){
    thisPlayer.acc.x = playerSpeed;
  });

  socket.on("moveLeft", function (){
    thisPlayer.acc.x = -playerSpeed;
  });

  socket.on("jump", function (){
    if(thisPlayer.fuel-5 > 0){
      thisPlayer.acc.y = jetpackPower;
      thisPlayer.fuel -= 5;
    }
  });

  socket.on("down", function (){
    thisPlayer.acc.y = gravity*5;
  });

  socket.on('disconnect', function () {
    if(loggedIn){
      console.log("disconnect");
      deletePlayer(thisPlayer.id);
    }
  });

  var pingTime;

  function sendPing() {
    pingTime = process.hrtime();
    socket.emit("sendPingRequest", {});
  }

  socket.on("sendPong", function (){
    var usrTime = process.hrtime();
    var deltaPing = Math.round(((usrTime[0] + usrTime[1]/1000000000)-(pingTime[0] + pingTime[1]/1000000000))*10000)/10;
    socket.emit("sendPing", {
      ping: deltaPing
    });
    thisPlayer.ping = deltaPing;
    setTimeout(sendPing, 1000);
  });

  sendPing();


  socket.on("updateSettings", function (data){
    console.log(data);
    shootingSpeed = data.shootSpeed;
    console.log("shootingS: "+shootingSpeed);
  });
});

function deletePlayer(id){
  for (var i = 0; i < players.length; i++) {
    if(players[i].id == id){
      players.splice(i,1);
    }
  }
}

function nextId(obj){
  var ids = [];
  for (var i = 0; i < obj.length; i++) {
    ids.push(obj[i].id);
  }
  for (var i = 0; i < ids.length; i++) {
    if(!contains(i, ids)){
      return i;
    }
  }
  return obj.length;
}

function contains(a, arr){
  for (var i = 0; i < arr.length; i++) {
    if(arr[i] == a){
      return true;
    }
  }
  return false;
}

function getPlayer(id){
  for (var i = 0; i < players.length; i++) {
    if(players[i].id == id){
      return i;
    }
  }
  console.log("error, no bullet owner!! Maybe left");
}

function collideWithWalls(){
  for (var i = 0; i < bullets.length; i++){
    for (var j = 0; j < walls.length; j++){
      if(bullets[i].collideRect(walls[j])){
        bullets.splice(i,1);
        collideWithWalls();
        break;
      }
    }
  }
}

function collideWithPlayers(){
  for (var i = 0; i < bullets.length; i++){
    for (var j = 0; j < players.length; j++){
      if(bullets[i].collideRect(players[j]) && bullets[i].from != players[j].id){

        players[getPlayer(bullets[i].from)].kills++;
        players[j].deaths++;

        bullets.splice(i,1);
        players[j].respawn();
        collideWithPlayers();
        break;
      }
    }
  }
}

function teleportCollisions(){
  for (var j = 0; j < walls.length; j++){
    for (var i = 0; i < teleports.length; i++){
      const coll = teleports[i].collide(walls[j]);
      if(coll){
        if(coll.side == "top"){
          teleports[i].pos.y = coll.wall.pos.y-teleports[i].size.y;
          for (var k = 0; k < players.length; k++) {
            if(teleports[i].from == players[k].id){
              players[k].pos.y = coll.wall.pos.y-players[k].size.y;
              players[k].pos.x = teleports[i].pos.x+teleports[i].size.x/2-players[k].size.x/2;
              teleports.splice(i,1);
              break;
            }
          }
        }else if (coll.side == "bottom"){
          teleports[i].pos.y = coll.wall.pos.y+coll.wall.size.y;
          teleports[i].speed.y *= -0.2;
        }else if (coll.side == "left"){
          teleports[i].pos.x = coll.wall.pos.x-teleports[i].size.x;
          teleports[i].speed.x = 0;
        }else if (coll.side == "right"){
          teleports[i].pos.x = coll.wall.pos.x+coll.wall.size.x;
          teleports[i].speed.x = 0;
        }
      }
    }
  }
}


function engine(){
  for (var i = 0; i < players.length; i++){
    players[i].update();
  }
  for (var i = 0; i < bullets.length; i++) {
    bullets[i].update();
  }
  for (var i = 0; i < teleports.length; i++) {
    teleports[i].update();
  }

  collideWithWalls();

  collideWithPlayers();

  teleportCollisions();

  for (var i = 0; i < players.length; i++) {
    if(players[i].pos.y > 850){
      players[i].respawn();
    }
  }

  for (var i = 0; i < bullets.length; i++) {
    if(bullets[i].pos.x < 0 || bullets[i].pos.x > 1500 || bullets[i].pos.y < 0 || bullets[i].pos.y > 850){
      bullets.splice(i,1);
    }
  }
}

function sendClock(){
  io.sockets.emit("baseClock", {
    players: players,
    bullets: bullets,
    teleports: teleports
  });
  engine();
  for (var i = 0; i < players.length; i++) {
    //bullets
    if (players[i].shooting && players[i].shootCooldown == 0){
      players[i].shootCooldown = shootingSpeed;
      bullets.push(new Bullet(
        {
          x: players[i].pos.x+players[i].size.x/2-Math.sin(players[i].angle)*canonHeight,
          y: players[i].pos.y+players[i].size.y/2+Math.cos(players[i].angle)*canonHeight
        },
        {
          x: 20*-Math.sin(players[i].angle),
          y: 20*Math.cos(players[i].angle)
        },
        players[i].id
      ));

      for (var j = 0; j < walls.length; j++) {
        if(bullets[bullets.length-1].collideRect(walls[j])){
          bullets.pop();
          break;
        }
      }
    }

    if(players[i].shootTeleport && players[i].teleportCooldown == 0){
      players[i].teleportCooldown = teleportSpeed;
      teleports.push(new Teleport(
        {
          x: players[i].pos.x+players[i].size.x/2-Math.sin(players[i].angle)*canonHeight,
          y: players[i].pos.y+players[i].size.y/2+Math.cos(players[i].angle)*canonHeight
        },
        {
          x: 20*-Math.sin(players[i].angle),
          y: 20*Math.cos(players[i].angle)
        },
        players[i].id
      ));
    }
  }
}

setInterval(sendClock,10);
