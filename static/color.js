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

function setVote(socket, choice) {
	$('div.choice').remove();
	for(var i = 0; i < choice.length; i++)
		$('#vote').append('<div class="choice"><button>' + choice[i] + '</button></div>');
	$('div.choice').css('height', 100 / choice.length + '%');
	$('div.choice>button').click(function(event, ui) {
		var params = {
			'vote': $(event.target).text()
		}
		socket.send(JSON.stringify(params));
		$('div.choice').remove();
	});
}

function openSocket(host) {
	var socket = new WebSocket(host);

	socket.onopen = function(event) {
		clearInterval(retry);
		retry = null;
	};

	socket.onmessage = function(event) {
		var json = JSON.parse(event.data);
		if('vote' in json) {
			setVote(socket, json['vote']);
		} else {
			$('#main').css('background-color', json['color']);
			setFlash(json['bpm'], json['rhythm']);
		}
	};

	socket.onclose = function(event) {
		$('div.choice').remove();
		if(retry)
			return;
		retry = setInterval(function() {
			openSocket(host);
		}, 1000);
	};
	socket.onerror = socket.onclose;

	return socket;
}

$(function() {
	var host = 'ws://' + location.host + '/socket';
	socket = openSocket(host);

	$('#main').css('background-color', 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');
	setFlash(color[3], color[4]);
});
