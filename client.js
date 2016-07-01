var net = require('net');

var client = new net.Socket();
client.connect(8080, 'localhost', function() {
	console.log('Connected');
	client.write('Hello, server! Love, Client.');
});

client.on('data', function(data) {
	console.log('Received: ' + data);
});

client.on('close', function() {
	console.log('Connection closed');
});

client.on('error', function(err) {
	console.log(err);
});