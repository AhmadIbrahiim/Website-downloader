// Download full website pages.
var wget = require('../wget');

module.exports=(io)=>{

    io.on('connection', function (socket) {
        socket.on('request', function (data) {
            console.log("Request connection received %s",data.token)
            // now graphing the website 
            wget(io,data)
        });
      });
}