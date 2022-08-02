const express = require('express')
const app = express()
const serv = require('http').Server(app);

const fs = require('fs')

const archiver = require('archiver');

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/map-editor.html');
});

app.use('/client',express.static(__dirname + '/client'));

app.get('/download',async function (req, res){
  await zipDirectory("./map", "map.zip");
  res.download(__dirname + "/map.zip");
});

function zipDirectory(source, out) {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on('error', err => reject(err))
      .pipe(stream)
    ;

    stream.on('close', () => resolve());
    archive.finalize();
  });
}

serv.listen(11033);

console.log("Started!");

const io = require('socket.io')(serv,{});

io.sockets.on('connection', function (socket){
  console.log("Socket connection");

  socket.on("save", function (data){
    console.log("data:");
    console.log(data.walls);
    console.log(JSON.stringify(data.walls).replace(/"\d/g, ''));
    fs.writeFileSync('./map/walls.json', JSON.stringify(data.walls) , 'utf-8');
  });
});
