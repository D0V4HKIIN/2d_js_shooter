const gravity = 0.1;

const fs = require('fs');

var walls = JSON.parse(fs.readFileSync(__dirname + '/../client/map/walls.json'), function(k, v) {
    return (typeof v === "object" || isNaN(v)) ? v : parseInt(v, 10);
});

module.exports = class Bullet {
  constructor(position,velocity,from){

    this.pos = position;
    this.speed = velocity;

    //give players id
    this.from = from;

    this.size = 12;

    this.texture = 1;
    this.animationCount = 0;
  }

  hitCorners(obj){
    if(Math.pow(this.pos.x-obj.pos.x, 2)+Math.pow(this.pos.y-obj.pos.y, 2) < this.size*this.size){
      return true;
    }else if(Math.pow(this.pos.x-obj.pos.x-obj.size.x, 2)+Math.pow(this.pos.y-obj.pos.y, 2) < this.size*this.size){
      return true;
    }else if(Math.pow(this.pos.x-obj.pos.x, 2)+Math.pow(this.pos.y-obj.pos.y-obj.size.y, 2) < this.size*this.size){
      return true;
    }else if(Math.pow(this.pos.x-obj.pos.x-obj.size.x, 2)+Math.pow(this.pos.y-obj.pos.y-obj.size.y, 2) < this.size*this.size){
      return true;
    }
    return false;
  }

  collideRect(obj){

    //"outside"
    try {
      if(this.pos.x > obj.pos.x-this.size && this.pos.x < obj.pos.x+obj.size.x+this.size && this.pos.y > obj.pos.y && this.pos.y < obj.pos.y+obj.size.y){
        return true;
      }

      if(this.pos.y > obj.pos.y-this.size && this.pos.y < obj.pos.y+obj.size.y+this.size && this.pos.x > obj.pos.x && this.pos.x < obj.pos.x+obj.size.x){
        return true;
      }

      if(this.hitCorners(obj)){
        return true;
      }
    } catch (e){
      console.log(e);
    }

    return false;
  }

  update(){

    this.pos.x += this.speed.x;
    this.pos.y += this.speed.y;

    this.speed.y += gravity;

    if(this.animationCount >= 5){
      if(this.texture < 3){
        this.texture++;
      }else{
        this.texture = 1;
      }
      this.animationCount = 0;
    }else{
      this.animationCount++;
    }
  }
}
