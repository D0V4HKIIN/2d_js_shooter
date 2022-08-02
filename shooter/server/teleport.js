const gravity = 0.3;

const fs = require('fs');

var walls = JSON.parse(fs.readFileSync(__dirname + '/../client/map/walls.json'), function(k, v) {
    return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
});

module.exports = class Teleport {
  constructor(position,velocity,from){

    this.pos = position;
    this.speed = velocity;

    //give players id
    this.from = from;

    this.size = {
      x:25,
      y:15
    };
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

    this.pos.x += this.speed.x;
    this.pos.y += this.speed.y;

    this.speed.y += gravity;
    if (this.speed.y >= this.size.y) {
      this.speed.y = this.size.y-2;
    }
  }
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

function dist(a,b){
  return Math.abs(a-b);
}
