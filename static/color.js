var flash = null;
var retry = null;

function setFlash(bpm, rhythm) {
	clearInterval(flash);

	if(rhythm.length == 0)
		rhythm = '1';

	if(bpm) {
		var count = 0;
		flash = setInterval(function() {
			var main = document.getElementById('main');
			if(rhythm[count] == '1')
				main.style.visibility = 'visible';
			else
				main.style.visibility = 'hidden';

			count++;
			if(count >= rhythm.length)
				count %= rhythm.length;
		}, 60000 / bpm);
	} else {
		var main = document.getElementById('main');
		if(rhythm.length && rhythm[0] == '1')
			main.style.visibility = 'visible';
		else
			main.style.visibility = 'hidden';
	}
}

function removeChoice() {
	var vote = document.getElementById('vote');
	for(var i = vote.childNodes.length - 1; i > -1; i--)
		vote.removeChild(vote.childNodes[i]);
}

function setVote(socket, choice) {
	var vote = document.getElementById('vote');
	for(var i = 0; i < choice.length; i++) {
		var button = document.createElement('button');
		button.innerText = choice[i];
		button.onclick = function(event) {
			var params = {
				'vote': event.target.innerText
			};
			socket.send(JSON.stringify(params));
			removeChoice();
		}

		var div = document.createElement('div');
		div.className = 'choice';
		div.style.height = 100 / choice.length + '%';
		div.appendChild(button);
		vote.appendChild(div);
	}
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
			var main = document.getElementById('main');
			main.style.backgroundColor = json['color'];
			setFlash(json['bpm'], json['rhythm']);
		}
	};

	socket.onclose = function(event) {
		removeChoice();
		if(retry)
			return;
		retry = setInterval(function() {
			openSocket(host);
		}, 2000);
	};
	socket.onerror = socket.onclose;

	return socket;
}

function init() {
	var host = 'ws://' + location.host + '/socket';
	socket = openSocket(host);

	var main = document.getElementById('main');
	main.style.backgroundColor = 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')';
	setFlash(color[3], color[4]);
}
