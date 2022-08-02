const playerSize = {
  x: 4*17,
  y: 4*21
}

const maxFuel = 300;

const airFriction = 0.95;
const wallFriction = 0.9;
const gravity = 0.3;

const fs = require('fs');

var walls = JSON.parse(fs.readFileSync(__dirname + '/../client/map/walls.json'), function(k, v) {
    return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
});

var spawnPoints = JSON.parse(fs.readFileSync(__dirname + '/../client/map/spawnPoints.json'), function(k, v) {
    return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
});

module.exports = class Player {
  constructor(position,velocity,acceleration,username,skin,id){
    this.pos = position;
    this.speed = velocity;
    this.acc = acceleration;
    this.shooting = false;
    this.shootingTeleport = false;
    this.shootCooldown = 0;
    this.teleportCooldown = 0;
    this.username = username;
    this.id = id;
    this.color = "blue"
    this.fuel = maxFuel;
    this.angle = 0;
    this.size = playerSize;
    this.kills = 0;
    this.deaths = 0;
    this.ping = 0;
    this.skin = skin;
    this.animationState = 1;
    this.animationCount = 0;
  }

  respawn(){
    this.pos = {... spawnPoints[Math.floor(Math.random()*spawnPoints.length)].pos};
    this.fuel = maxFuel;
  }

  collide(){
    var tl = {};
    var br = {};
    var delta = {};

    var bttmRP = {};
    var bttmRW = {};
    var distances = [];
    for (var i = 0; i < walls.length; i++) {
      //bottom right
      bttmRP.x = this.pos.x+this.size.x;
      bttmRP.y = this.pos.y+this.size.y;

      bttmRW.x = walls[i].pos.x+walls[i].size.x;
      bttmRW.y = walls[i].pos.y+walls[i].size.y;

      if( this.pos.x < bttmRW.x && bttmRP.x > walls[i].pos.x && this.pos.y < bttmRW.y && bttmRP.y > walls[i].pos.y){
        //btm player to top wall
        distances.push(dist(bttmRP.y,walls[i].pos.y));
        //top player to btm wall
        distances.push(dist(this.pos.y,bttmRW.y));
        //right player to left wall
        distances.push(dist(bttmRP.x,walls[i].pos.x));
        //left player to right wall
        distances.push(dist(this.pos.x,bttmRW.x));

        if(smallestIndex(distances) == 0){
          return {
            wall: walls[i],
            side: "top"
          };
        }else if (smallestIndex(distances) == 1) {
          return {
            wall: walls[i],
            side: "bottom"
          };
        }else if (smallestIndex(distances) == 2) {
          return {
            wall: walls[i],
            side: "left"
          };
        }else if (smallestIndex(distances) == 3) {
          return {
            wall: walls[i],
            side: "right"
          };
        }

      }

    }
    return false;
  }

  update(){

    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    }

    if(this.teleportCooldown > 0){
      this.teleportCooldown--;
    }

    //jetpack fuel
    if(this.fuel < maxFuel){
      this.fuel += 1;
    }

    //gravity
    this.acc.y += gravity;

    //classic physics

    this.pos.x += this.speed.x;
    this.pos.y += this.speed.y;

    this.speed.x += this.acc.x;
    this.speed.y += this.acc.y;

    this.speed.x *= airFriction;
    this.speed.y *= airFriction;

    this.acc.x *= airFriction/2;
    this.acc.y *= airFriction/2;


    //collisions

    var collidingWall = this.collide();

    if(collidingWall != false){
      if(collidingWall.side == "top"){
        this.pos.y = collidingWall.wall.pos.y-this.size.y;
        this.speed.x *= wallFriction;
        this.speed.y = 0;
        this.acc.y = 0;
        this.fuel = maxFuel;
      }else if (collidingWall.side == "bottom"){
        this.pos.y = collidingWall.wall.pos.y+collidingWall.wall.size.y;
        this.speed.x *= wallFriction;
        this.speed.y = 0;
        this.acc.y = gravity;
      }else if (collidingWall.side == "left"){
        this.pos.x = collidingWall.wall.pos.x-this.size.x;
        this.speed.x = 0;
        this.acc.x = 0;
      }else if (collidingWall.side == "right"){
        this.pos.x = collidingWall.wall.pos.x+collidingWall.wall.size.x;
        this.speed.x = 0;
        this.acc.x = 0;
      }
    }

    if(Math.abs(this.speed.x) > 0.5 && this.animationCount >= 10){
      if(this.animationState < 4){
        this.animationState++;
      }else{
        this.animationState = 1;
      }
      this.animationCount = 0;
    }else if(Math.abs(this.speed.x) > 0.5){
      this.animationCount++;
    }else{
      this.animationState = 1;
    }
  }


  updateAngle(pos){
    this.angle = Math.atan2((this.pos.y+this.size.y/2-pos.y),(this.pos.x+this.size.x/2-pos.x))+Math.PI/2;
  }
};

function dist(a,b){
  return Math.abs(a-b);
}

function smallestIndex(arr){
  var best = [9999, "BUG"];
  for (var i = 0; i < arr.length; i++) {
    if(arr[i] < best[0]){
      best[0] = arr[i];
      best[1] = i;
    }
  }

  return best[1];
}
