var flash = null;

function updateColor(event, ui) {
	var color = Array();
	for(var i = 0; i < $('.slider').length; i++) {
		var element = $('.color').eq(i);

		if(ui && element.has(ui.handle).length)
			var value = ui.value;
		else
			var value = element.find('.slider').slider('value');

		element.find('label').text(value);
		color.push(value);
	}
	$('#swatch').css('background-color', 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');

	clearInterval(flash);
	if(color[3]) {
		var pattern = $('#pattern').attr('value');
		var count = 0;

		if(pattern.length == 0)
			pattern = '1';

		flash = setInterval(function() {
			if(pattern[count] == '1')
				$('#swatch').css('visibility', 'visible');
			else
				$('#swatch').css('visibility', 'hidden');

			count++;
			if(count >= pattern.length)
				count %= pattern.length;
		}, 60000 / color[3]);
	} else {
		$('#swatch').css('visibility', 'visible');
	}
}

function sendData(socket) {
	var message = {
		'red': $('.red .slider').slider('value'),
		'green': $('.green .slider').slider('value'),
		'blue': $('.blue .slider').slider('value'),
		'bpm': $('.bpm .slider').slider('value'),
		'pattern': $('#pattern').attr('value')
	};
	socket.send(JSON.stringify(message));
	updateColor(null, null);
}

$(function() {
	var host = 'ws://' + location.host + '/socket/admin';
	var socket = new WebSocket(host);

	socket.onclose = function(event) {
		$('.slider').slider('disable');
		$('#pattern').attr('disabled', 'disabled');
	}
	
	socket.onerror = function(event) {
		$('.slider').slider('disable');
		$('#pattern').attr('disabled', 'disabled');
	}

	for(var i = 0; i < $('.slider').length; i++) {
		$('.color').eq(i).find('.slider').slider({
			value: color[i],
			min: 0, max: 255, step: 1, range: 'min',
			slide: updateColor,
			change: function() {
				sendData(socket);
			}
		});
	}

	$('.bpm .slider').slider('option', 'max', 300);

	$('#pattern').attr('value', color[4]);
	$('#pattern').keyup(function() {
		sendData(socket);
	});

	updateColor(null, null);
});
