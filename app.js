var express = require('express'),
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
    SpotifyWebApi = require('spotify-web-api-node'),
    app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http);

var consolidate = require('consolidate');

var appKey = '20535ac1ce784763a79e16c952b9cfe8';
var appSecret = 'f19da400224c4f968acaf580111f534e';
var server;
var client;
var IP;
var msg ='';
var queue = [];

var spotifyApi = new SpotifyWebApi({
  clientId : appKey,
  clientSecret : appSecret,
  redirectUri : 'localhost:6969/callback'
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

var app = express();

// configure Express
app.set('views', __dirname + '/templates');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(session({ secret: 'keyboard cat' }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/styles'));

app.engine('html', consolidate.swig);

app.get('/', function(req, res){
  res.redirect('/auth/spotify');
});

app.get('/login', function(req, res) {
  res.render('login.html');
})


app.get('/join/:ip', function(req, res) {

  IP = req.params.ip;

  http.listen(8080, function(){

  });
  res.redirect('/amigo');
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account.html', { user: req.user });
});

app.get('/hostIndex', function(req, res) {
  res.render('hostIndex.html', { user: req.user, ip: IP, msg: msg});
});

app.get('/amigo', function(req, res) {
  res.render('amigoIndex.html', { ip: IP});
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

var playlist = [];
var data_dict;

io.on('connection', function(socket){

  socket.on('sendTrack', function(msg){
    parse_data(String(msg.data));
  });
  
  socket.on('getPlaylist', function(msg){
    io.sockets.emit('providePlaylist', playlist);
  });
});

function parse_data(data) {
    if (data.match(/^spotify:track:\w*$/)) {
      var trackid = data.replace(/^spotify:track:(.*)$/, '$1');
      spotifyApi.getTrack(trackid)
        .then(function(trackData) {
            playlist.push(trackData.body);
            io.sockets.emit('newTrack', playlist);
        });
    } else {
      console.log('Malformed data recieved');
    }
}

// GET /auth/spotify/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request. If authentication fails, the user will be redirected back to the
//   login page. Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/callback',
  passport.authenticate('spotify', { failureRedirect: '/login' }),
  function(req, res) {

    network.get_private_ip(function(err, ip) {
      if (err) {
        console.log(err)
      } else {
        IP = ip; 
      }

      http.listen(8080, function(){});
      res.redirect('/hostIndex');
    });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.post('/searchTrack', function(req, res) {
  var search = req.body.amigo.search;
  if(!search) {
    search = "SexyBack";
  }
  spotifyApi.searchTracks(search, {limit: 50})
  .then(function(data) {
    var topTrack = data.body.tracks.items[0];
    res.render('searchResults.html', 
      {
        user: req.user, 
        ip: IP,
        tracks: data.body.tracks.items
      });
  }, function(err) {
    console.error(err);
  });
});

app.listen(6969);
console.log('Listening on 6969');

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed. Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};
