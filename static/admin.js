var flash = null;

function updateColor(event, ui) {
	var color = Array();
	for(var i = 0; i < $('.colors div.slider').length; i++) {
		var element = $('.colors div.slider').eq(i);

		if(ui && element.has(ui.handle).length)
			var value = ui.value;
		else
			var value = element.slider('value');

		if(!element.slider('option', 'disabled'))
			element.parent().find('label').text(value);
		color.push(value);
	}
	$('.color>button.delete.active').css('background-color', 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')');

	$('.bpm label').text($('.bpm div.slider').slider('value'));
}

function disableSlider() {
	$('.colors div.slider').slider('value', 0);
	$('.colors div.slider').slider('disable');
	$('.colors label').text('');
}

function sendColor(socket) {
	var params = Array();
	for(var i = 0; i < $('.color>button.delete').length; i++) {
		var rgb = $('.color>button.delete').eq(i).css('background-color').match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		if(rgb)
			params.push(rgb.slice(1, 4).map(function(num) {
				return parseInt(num);
			}));
	}

	var message = {
		'color': params
	};
	socket.send(JSON.stringify(message));
}

function disableControl(event) {
	$('.slider').slider('disable');
	$('button').attr('disabled', 'disabled');
	$('input').attr('disabled', 'disabled');
}

$(function() {
	var flag = true;
	var host = 'ws://' + location.host + '/socket/admin';
	var socket = new WebSocket(host);

	socket.onclose = disableControl;
	socket.onerror = disableControl;
	socket.onopen = function(event) {
		$('.bpm div.slider').slider('option', 'disabled', false);
		$('button').removeAttr('disabled');
		$('input').removeAttr('disabled');
	};
	socket.onmessage = function(event) {
		var json = JSON.parse(event.data);
		if('bpm' in json)
			$('.bpm div.slider').slider('value', json['bpm']);
		if('rhythm' in json)
			$('#rhythm').attr('value', json['rhythm']);
		if('color' in json) {
			$('div.color:has(button.delete)').remove();
			for(var i = 0; i < json['color'].length; i++) {
				var color = 'rgb(' + json['color'][i][0] + ',' + json['color'][i][1] + ',' + json['color'][i][2] + ')';
				$('.color:last').before($('<div class="color"><button class="delete">-</button></div>'));
				$('.color>button.delete:last').css('background-color', color);
			}
			$('.color>button.add').trigger('mouseenter');
		}
	};

	$('.color>button.add').hover(function(event, ui) {
		$(this).addClass('active');

		$('.color>button.delete').removeClass('active');
		disableSlider();
	}, function(event, ui) {
		$(this).removeClass('active');
	});

	$('.color>button.add').click(function(event, ui) {
		$('.color:last').before($('<div class="color"><button class="delete">-</button></div>'));
		$('.color>button.delete:eq(0)').trigger('hover');
		sendColor(socket);
	});

	$(document).on('hover', '.color>button.delete', function(event, ui) {
		$(this).addClass('active');
		$('.color>button').not(this).removeClass('active');

		$('.colors div.slider').slider('enable');
		var rgb = $(this).css('background-color').match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		if(rgb) {
			for(var i = 0; i < $('.colors div.slider').length; i++)
				$('.colors div.slider').eq(i).slider('value', rgb[i + 1]);
		}
	});

	$(document).on('click', '.color>button.delete', function(event, ui) {
		if($('.color>button.delete').length == 1)
			return false;

		$(this).parent().remove();
		disableSlider();
		sendColor(socket);
	});

	$('div.slider').slider({
		min: 0, max: 255, step: 1, range: 'min',
		slide: updateColor, change: function(event, ui) {
			updateColor(null, null);
			if(event.originalEvent)
				sendColor(socket);
		}
	});

	$('.bpm div.slider').slider('option', 'max', 600);
	$('.bpm div.slider').slider('option', 'change', function(event, ui) {
		if(event.originalEvent) {
			var message = {
				'bpm': $('.bpm div.slider').slider('value')
			};
			socket.send(JSON.stringify(message));
		}
	});

	$('#rhythm').keyup(function(event, ui) {
		if(event.originalEvent) {
			var message = {
				'rhythm': $('#rhythm').attr('value')
			};
			socket.send(JSON.stringify(message));
		}
	});

	if(!socket.readyState)
		disableControl();
	else
		disableSlider();
});
