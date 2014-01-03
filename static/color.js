var flash = null;
var retry = null;

function setFlash(bpm, rhythm) {
	clearInterval(flash);

	if(rhythm.length == 0)
		rhythm = '1';

	if(bpm) {
		var count = 0;
		flash = setInterval(function() {
			if(rhythm[count] == '1')
				$('#main').css('visibility', 'visible');
			else
				$('#main').css('visibility', 'hidden');

			count++;
			if(count >= rhythm.length)
				count %= rhythm.length;
		}, 60000 / bpm);
	} else {
		if(rhythm.length && rhythm[0] == '1')
			$('#main').css('visibility', 'visible');
		else
			$('#main').css('visibility', 'hidden');
	}
}

function openSocket(host) {
	var socket = new WebSocket(host);

	socket.onopen = function(event) {
		clearInterval(retry);
		retry = null;
	}

	socket.onmessage = function(event) {
		var json = JSON.parse(event.data);
		$('#main').css('background-color', json['color']);
		setFlash(json['bpm'], json['rhythm']);
	}

	socket.onclose = function(event) {
		if(retry)
			return;

		retry = setInterval(function() {
			openSocket(host);
		}, 1000);
	}
	
	socket.onerror = socket.onclose;
}

$(function() {
	var host = 'ws://' + location.host + '/socket';
	openSocket(host);

	$('#main').css('background-color', 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');
	setFlash(color[3], color[4]);
});
