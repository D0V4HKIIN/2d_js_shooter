var c = document.getElementById("frame");
var ctx = c.getContext("2d");
ctx.webkitImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled  = false;

const canvas = document.querySelector('canvas');

var background = new Image();
background.src = "client/map/background.jpg";
var backgroundRatio = 1;
var backgroundOffset = 0;

background.onload = () => {
  backgroundRatio = (background.width * canvas.height/background.height);
};


var walls = [];

function loadJSON(file, callback) {
  var xobj = new XMLHttpRequest();
   xobj.overrideMimeType("application/json");
   xobj.open('GET', file, true);
   xobj.onreadystatechange = function () {
   if (xobj.readyState == 4 && xobj.status == "200") {
     callback(xobj.responseText);
   }
   };
   xobj.send(null);
 }

 loadJSON("./client/map/walls.json", function (data){
   walls = JSON.parse(data);
   walls.forEach(function (wall){
     wall.pos.x /= sizeMultiplier;
     wall.pos.y /= sizeMultiplier;
     wall.size.x /= sizeMultiplier;
     wall.size.y /= sizeMultiplier;
   });
 });

var loadedSkins = {};
var loadedTextures = {};

function loadTextures(textures){
  var skins = textures.skins;
  Object.keys(skins).map(function(objectKey, index){
    var temp = {};
    temp.static = new Image();
    temp.static.src = skins[objectKey].static;
    temp.walking = {};

    Object.keys(skins[objectKey].walking).map(function(walkKey, i){
      temp.walking[walkKey] = new Image();
      temp.walking[walkKey].src = skins[objectKey].walking[walkKey];
    });

    loadedSkins[objectKey] = temp;
  });

  if(document.getElementById("skinSelect")){
    Object.keys(loadedSkins).map(function(objectKey, index){
      document.getElementById("skinSelect").innerHTML += "<option value='"+objectKey+"'>"+objectKey+"</option>"
    });
    refreshSkin();
  }

  var bullet = textures.bullet;
  loadedTextures.bullet = {};
  Object.keys(bullet).map(function(objectKey, index){
    loadedTextures.bullet[objectKey] = new Image();
    loadedTextures.bullet[objectKey].src = bullet[objectKey];
  });
}

var drawPlayersFunc = () => {};

socket.on("sendTextures", function (data){
  loadTextures(data.textures);
  drawPlayersFunc = drawPlayers;
});

function drawBackground(){
  ctx.drawImage(background, backgroundOffset+backgroundRatio,0, backgroundRatio, canvas.height);
  ctx.drawImage(background, backgroundOffset,0, backgroundRatio, canvas.height);
  if(backgroundOffset > -backgroundRatio){
    backgroundOffset -= 0.15;
  }else{
    backgroundOffset = 0;
  }
}

function drawWalls(){
  walls.forEach(function (wall){
    ctx.fillStyle = "#696969";
    ctx.fillRect(wall.pos.x,wall.pos.y,wall.size.x,wall.size.y);
  });
}

const canonWidth = 20/sizeMultiplier;
const canonHeight = 50/sizeMultiplier;
const fontSize = 20/Math.pow(sizeMultiplier, 1/4);
const fuelSize = 10/Math.pow(sizeMultiplier, 1/4);
const gap = 15/Math.pow(sizeMultiplier, 1/3);

const drawPlayers = (players) => {
  for (var i = 0; i < players.length; i++) {
    //canon
    ctx.fillStyle = "green";
    ctx.save();
    ctx.translate(players[i].pos.x+players[i].size.x/2,players[i].pos.y+players[i].size.y/2);
    ctx.rotate(players[i].angle);
    ctx.fillRect(-canonWidth/2,0,canonWidth, canonHeight);
    ctx.restore();

    //player hitbox
    //ctx.fillStyle = players[i].color;
    //ctx.fillRect(players[i].pos.x,players[i].pos.y,players[i].size.x, players[i].size.y);

    //skins
    ctx.save();

    if(Math.abs(players[i].speed.x) > 0.5){
      if(players[i].angle > 0 && players[i].angle < Math.PI){
        ctx.translate(players[i].size.x+canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(loadedSkins[players[i].skin].walking[players[i].animationState.toString()],canvas.width-players[i].pos.x,players[i].pos.y,players[i].size.x,players[i].size.y);
      }else{
        ctx.drawImage(loadedSkins[players[i].skin].walking[players[i].animationState.toString()],players[i].pos.x,players[i].pos.y,players[i].size.x,players[i].size.y);
      }
    }else{
      if(players[i].angle > 0 && players[i].angle < Math.PI){
        ctx.translate(players[i].size.x+canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(loadedSkins[players[i].skin].static,canvas.width-players[i].pos.x,players[i].pos.y,players[i].size.x,players[i].size.y);
      }else{
        ctx.drawImage(loadedSkins[players[i].skin].static,players[i].pos.x,players[i].pos.y,players[i].size.x,players[i].size.y);
      }
    }
    ctx.restore();

    //fuel
    ctx.fillStyle = "red";
    ctx.fillRect(players[i].pos.x,players[i].pos.y-gap,players[i].fuel/(300/players[i].size.x),fuelSize);

    //username
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.font = fontSize + "px Arial";
    ctx.fillText(players[i].username, players[i].pos.x+players[i].size.x/2, players[i].pos.y-gap-5);
  }
}

function drawBullets(bullets){
  for (var i = 0; i < bullets.length; i++) {
    ctx.save();
    ctx.translate(bullets[i].pos.x, bullets[i].pos.y);
    ctx.rotate(Math.atan2(bullets[i].speed.y, bullets[i].speed.x));

    //hitbox

    /*ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(0, 0, bullets[i].size, 0, 2 * Math.PI);
    ctx.fill()
    ctx.stroke();*/

    ctx.drawImage(loadedTextures.bullet[bullets[i].texture], -bullets[i].size*2, -bullets[i].size, bullets[i].size*4, bullets[i].size*2);
    ctx.restore();
  }
}

const scoreSize = {x:canvas.width/2, y:canvas.height/2};
const playerOnScore = 6;
const scoreboardDef = ["Name", "Kills", "Deaths", "K/D", "Ping"];
const halfGrid = {x: scoreSize.x/scoreboardDef.length/2, y: scoreSize.y/playerOnScore/2};

function createScoreboard(players){
  players.sort(function (a,b){return b.kills-a.kills});

  var scoreboard = [scoreboardDef];

  for (var i = 0; (i < players.length) && (i <= playerOnScore-2); i++) {
    scoreboard.push([players[i].username, players[i].kills, players[i].deaths, players[i].kills/players[i].deaths, players[i].ping+" ms"]);
  }

  return scoreboard;
}

function drawPlayerScore(players, size){
  const scoreboard = createScoreboard(players);

  drawGrid(scoreboard);

  //draw scores
  ctx.save();
  ctx.translate(canvas.width/4,canvas.height/4);

  for (var i = 0; i < scoreboard.length; i++) {
    for (var j = 0; j < scoreboard[i].length; j++) {

      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.font = 26 + "px Arial";
      ctx.fillText(scoreboard[i][j], scoreSize.x/(scoreboardDef.length)*(j+1)-halfGrid.x, scoreSize.y/(playerOnScore)*(i+1)-halfGrid.y+13);
    }
  }
  ctx.restore();
}

function drawGrid(board){
  ctx.save();
  ctx.translate(canvas.width/4, canvas.height/4);
  for (var i = 0; i < playerOnScore; i++) {
    const place = scoreSize.y/playerOnScore*(i+1);
    ctx.beginPath();
    ctx.moveTo(0, place);
    ctx.lineTo(scoreSize.x, place);
    ctx.stroke();
  }

  for (var i = 0; i < board[0].length; i++) {
    const place = scoreSize.x/(board[0].length)*(i+1);
    ctx.beginPath();
    ctx.moveTo(place, 0);
    ctx.lineTo(place, scoreSize.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRectCenter(pos, size, color, alpha){
  //score rect
  ctx.fillStyle = color;
  pos.x -= size.x/2;
  pos.y -= size.y/2;

  ctx.save();

  ctx.globalAlpha = alpha;

  ctx.fillRect(pos.x, pos.y, size.x, size.y);
  ctx.restore();

  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.rect(pos.x, pos.y, size.x, size.y);
  ctx.stroke();
}

const drawScore = function (players){
  drawRectCenter({x:canvas.width/2, y:canvas.height/2}, scoreSize, "white", 0.6);
  drawPlayerScore(players);
}

var overlays = [];

function drawOverlays(players){
  overlays.forEach(function (drawFunc){
    drawFunc(players);
  });
}

function drawTeleports(teleports){
  for (var i = 0; i < teleports.length; i++) {
  ctx.fillStyle = "black";
  ctx.fillRect(teleports[i].pos.x,teleports[i].pos.y,teleports[i].size.x, teleports[i].size.y);
  }
}

function drawNextFrame(data){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawWalls();
  drawTeleports(data.teleports);
  drawPlayersFunc(data.players);
  drawBullets(data.bullets);

  drawOverlays([...data.players]);
}
