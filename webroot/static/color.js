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
	for(var i = vote.childNodes.length - 1; i >= 0; i--)
		vote.removeChild(vote.childNodes[i]);

	var length = 0;
	for(var i = 0; i < choice.length; i++)
		length = Math.max(length, choice[i].length);

	var height = document.body.offsetHeight / choice.length * 0.6;
	var width = document.body.offsetWidth * 0.6;
	var size = Math.min(height * 0.6, width * 0.6 / length);

	for(var i = 0; i < choice.length; i++) {
		var button = document.createElement('button');
		button.innerText = choice[i];
		button.style.fontSize = size + 'px';
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

function setImage(name) {
	var div = document.getElementById('image');
	for(var i = div.childNodes.length - 1; i >= 0; i--)
		div.removeChild(div.childNodes[i]);

	if(name) {
		var img = document.createElement('img');
		img.src = 'img/' + name;
		img.onclick = function(e) {
			e.stopPropagation();
		};

		var div = document.getElementById('image');
		div.appendChild(img);
		div.style.lineHeight = div.clientHeight + 'px';
		div.onclick = function() {
			setImage('');
		};
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
		} else if('img' in json) {
			setImage(json['img']);
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
	var host = 'ws://' + location.host + ':8888/';
	socket = openSocket(host);
}
