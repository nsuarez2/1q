var express = require('express'),
    app = express(),
    $ = require('jquery'),
    http = require('http'),
    server = http.createServer(app), 
    io = require('socket.io').listen(server),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    swig = require('swig'),
    collections = require('pycollections'),
    SpotifyWebApi = require('spotify-web-api-node'),
    favicon = require('serve-favicon'),
    consolidate = require('consolidate');

var appKey = '20535ac1ce784763a79e16c952b9cfe8';
var appSecret = 'f19da400224c4f968acaf580111f534e';
var spotifyApi = new SpotifyWebApi({
  clientId : appKey,
  clientSecret : appSecret,
  redirectUri : 'https://www.oneq.us/callback'
});

var playlists = new collections.DefaultDict([].constructor);
var q_id = 0;

app.set('port', (process.env.PORT || 6969));
server.listen(app.get('port'), function() {
  console.log('1Q is running on port', app.get('port'));
});

app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/styles'));
app.use(favicon(__dirname + '/favicon.ico'));
app.engine('html', consolidate.swig);


app.get('/', function(req, res) {
  res.render('qname.html', { title: 'Welcome to '});
});

app.get('/:r_id', function(req, res) {
  r_id = req.params.r_id;
  if (!r_id) {
    res.render('qname.html', { title: 'Welcome to '});
  } else {
    res.render('amigoIndex.html', 
      { 
        r_id: r_id, 
        title: 'Contributing | '
      });
  }
});

app.post('/', function(req, res) {
    var qname = req.body.qname;

    qname = qname.replace(/\s+/g, '-').toLowerCase();

    res.redirect('/'+ qname + '/host');
});

app.get('/:r_id/host', function(req, res) {
  var r_id = req.params.r_id;
  res.render('hostIndex.html', 
    { 
      user: req.user, 
      room_id: r_id, 
      title: 'Hosting | '
    });
});

app.post('/:r_id/searchTrack', function(req, res) {
  var r_id = req.params.r_id;
  var search = req.body.amigo.search;

  if (!search) {
    search = "SexyBack";
  }
  spotifyApi.searchTracks(search, {limit: 50})
  .then(function(data) {
    var topTrack = data.body.tracks.items[0];
    res.render('searchResults.html', 
      {
        user: req.user, 
        tracks: data.body.tracks.items,
        r_id: r_id,
        title: 'Search results for ' + search + ' | '
      });
  }, function(err) {
    console.error(err);
  });
});

io.sockets.on('connection', function (socket) {

  socket.on('joinq', function(room) {
    socket.room = room;
    socket.join(room);
    socket.emit('providePlaylist', playlists.get(room));
    socket.broadcast.to(room).emit('providePlaylist', playlists.get(room));
  });

  socket.on('newq', function(room) {
    socket.room = room;
    socket.join(room);
    socket.emit('providePlaylist', playlists.get(room));
    socket.broadcast.to(room).emit('providePlaylist', playlists.get(room));
  });

  socket.on('sendTrack', function(msg) {
    var room = msg.room;
    var data = msg.data

    if (data.match(/^spotify:track:\w*$/)) {
      var trackid = data.replace(/^spotify:track:(.*)$/, '$1');
      spotifyApi.getTrack(trackid)
        .then(function(trackData) {
            playlists.get(room).push(trackData.body);
            socket.join(room);
            socket.broadcast.to(room).emit('providePlaylist', playlists.get(room));
        });
    } else {
      console.log('Malformed data recieved');
    }
  });
  
  socket.on('getPlaylist', function(msg) {
    var room = socket.room;
    socket.broadcast.to(room).emit('providePlaylist', playlists.get(room));
  });
});
