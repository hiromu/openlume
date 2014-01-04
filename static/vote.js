var timer = null;
var retry = null;

function update(vote) {
	$('#vote').empty();
	for(var key in vote)
		$('#vote').append('<div class="choice"><p class="label">' + key + '</p><p class="count">' + vote[key] + '票</p></div>');
}

function openSocket(host) {
	var socket = new WebSocket(host);

	socket.onopen = function(event) {
		clearInterval(retry);
		retry = null;

		if(timer)
			return;
		timer = setInterval(function() {
			socket.send('');
		}, 1000);
	};

	socket.onmessage = function(event) {
		var data = JSON.parse(event.data);
		update(data);
	};

	socket.onclose = function(event) {
		clearInterval(timer);
		timer = null;

		if(retry)
			return;
		retry = setInterval(function() {
			openSocket(host);
		}, 2000);
	};
	socket.onerror = socket.onclose;
}

$(function() {
	var host = 'ws://' + location.host + '/socket/vote';
	openSocket(host);
	update(vote);
});
