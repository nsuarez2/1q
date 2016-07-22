var express = require('express'),
    app = express(),
    http = require('http'),
    server = http.createServer(app), 
    io = require('socket.io').listen(server),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    swig = require('swig'),
    SpotifyStrategy = require('./index').Strategy,
    net = require('net'),
    network = require('network'),
    cheerio = require('cheerio'),
    $ = require('jquery'),
    SpotifyWebApi = require('spotify-web-api-node');

var consolidate = require('consolidate');

var appKey = '20535ac1ce784763a79e16c952b9cfe8';
var appSecret = 'f19da400224c4f968acaf580111f534e';
var playlists = {};
var q_id = 0;

io.sockets.on('connection', function (socket) {

  socket.on('joinq', function(room) {
    socket.room = room;
    socket.join(room);
    // echo to client they've connected
    socket.emit('providePlaylist', playlists[room]);
    socket.broadcast.to(room).emit('providePlaylist', playlists[room]);
    // echo to room 1 that a person has connected to their room
    //socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
    //socket.emit('updaterooms', rooms, 'room1');
  });

  socket.on('newq', function(room) {
    socket.room = room;
    socket.join(room);
  });

  socket.on('sendTrack', function(msg) {
    var room = msg.room;
    var data = msg.data

    if (data.match(/^spotify:track:\w*$/)) {
      var trackid = data.replace(/^spotify:track:(.*)$/, '$1');
      spotifyApi.getTrack(trackid)
        .then(function(trackData) {
            playlists[room].push(trackData.body);
            socket.join(room);
            socket.broadcast.to(room).emit('newTrack', playlists[room]);
            socket.broadcast.to(room).emit('providePlaylist', playlists[room]);

        });
    } else {
      console.log('Malformed data recieved');
    }
  });
  
  socket.on('getPlaylist', function(msg) {
    var room = socket.room;
    socket.broadcast.to(room).emit('providePlaylist', playlists[room]);
  });
  
});

var spotifyApi = new SpotifyWebApi({
  clientId : appKey,
  clientSecret : appSecret,
  redirectUri : 'localhost:6969/callback'
  //redirectUri : 'https://onequeue.herokuapp.com/callback'
});


app.set('port', (process.env.PORT || 6969));
server.listen(app.get('port'), function() {
  console.log('1Q is running on port', app.get('port'));
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session. Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. Howevr, since this example does not
//   have a database of user records, the complete spotify profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the SpotifyStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and spotify
//   profile), and invoke a callback with a user object.
passport.use(new SpotifyStrategy({
  clientID: appKey,
  clientSecret: appSecret,
  callbackURL: '//localhost:6969/callback'
  //callbackURL: 'https://onequeue.herokuapp.com/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's spotify profile is returned to
      // represent the logged-in user. In a typical application, you would want
      // to associate the spotify account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }));

// configure Express
app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({ 
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/styles'));

app.engine('html', consolidate.swig);

app.get('/', function(req, res) {
  res.redirect('/auth/spotify');
});

app.get('/login', function(req, res) {
  res.render('login.html');
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account.html', { user: req.user });
});

app.get('/host/:r_id', function(req, res) {

  var r_id = req.params.r_id;
  res.render('hostIndex.html', { user: req.user, msg: msg, room_id: r_id});
});

app.get('/amigo/:r_id', function(req, res) {

  r_id = req.params.r_id;
  res.render('amigoIndex.html', { r_id: r_id});
});

// GET /auth/spotify
//   Use passport.authenticate() as route middleware to authenticate the
//   request. The first step in spotify authentication will involve redirecting
//   the user to spotify.com. After authorization, spotify will redirect the user
//   back to this application at /auth/spotify/callback
app.get('/auth/spotify',
  passport.authenticate('spotify', {scope: ['user-read-email', 'user-read-private'], showDialog: false}),
  function(req, res){
// The request will be redirected to spotify for authentication, so this
// function will not be called.
});

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {

    
    var room_id = q_id;
    q_id += 1;

    playlists[room_id] = [];

    res.redirect('/host/' + room_id);
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/searchTrack/:r_id', function(req, res) {
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
        r_id: r_id
      });
  }, function(err) {
    console.error(err);
  });
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};
