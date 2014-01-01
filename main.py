#!/usr/bin/env python

import os
import json
import logging

import cyclone.web
import cyclone.websocket

import twisted.internet.reactor
import txosc.async
import txosc.dispatch

callback = set()
color = [255, 255, 255, 120, '10']
switch = True

def getMessage():
	if switch:
		return json.dumps({'color': 'rgb(%d, %d, %d)' % tuple(color[:3]), 'bpm': color[3], 'pattern': color[4]})
	else:
		return json.dumps({'color': 'rgb(%d, %d, %d)' % tuple(color[:3]), 'bpm': 0, 'pattern': '0'})

class MainHandler(cyclone.web.RequestHandler):
	def get(self):
		self.render('index.html', color = map(str, color))


class MainColorHandler(cyclone.websocket.WebSocketHandler):
	def connectionMade(self):
		callback.add(self)
		self.sendMessage(getMessage())

	def connectionLost(self, reason):
		if self in callback:
			callback.remove(self)


class AdminHandler(cyclone.web.RequestHandler):
	def get(self):
		self.render('admin.html', color = map(str, color))

class AdminColorHandler(cyclone.websocket.WebSocketHandler):
	def messageReceived(self, message):
		global color

		data = json.loads(message)
		color = [data['red'], data['green'], data['blue'], data['bpm'], data['pattern']]
		for c in callback:
			c.sendMessage(getMessage())

class OSCHandler(object):
	def __init__(self, port):
		routes = [
			('/cyluim/*', self.cyluim_handler)
		]

		self.receiver = txosc.dispatch.Receiver()
		self.receiver.fallback = self.fallback
		for path, handler in routes:
			self.receiver.addCallback(path, handler)

		twisted.internet.reactor.listenUDP(port, txosc.async.DatagramServerProtocol(self.receiver))

	def cyluim_handler(self, message, address):
		global color, switch

		function = message.address.split('/')[2]
		value = message.getValues()

		print function, value
		if function == 'switch' and len(value) == 1:
			if value[0] == 0:
				switch = False
			elif value[0] == 1:
				switch = True
		if function == 'color' and len(value) == 3:
			for i in range(3):
				if type(value[i]) == int and 0 <= value[i] <= 255:
					color[i] = value[i]
		elif function == 'bpm' and len(value) == 1:
			if type(value[0]) == int:
				color[3] = value[0]
		elif function == 'rhythm' and len(value) == 1:
			if type(value[0]) == str:
				color[4] = value[0]

		for c in callback:
			c.sendMessage(getMessage())

	def fallback(self, message, address):
		print message, address

def main():
	routes = [
		(r'/', MainHandler),
		(r'/admin', AdminHandler),
		(r'/socket', MainColorHandler),
		(r'/socket/admin', AdminColorHandler)
	]

	app = cyclone.web.Application(routes,
		template_path = os.path.join(os.path.dirname(__file__), 'templates'),
		static_path = os.path.join(os.path.dirname(__file__), 'static'))
	twisted.internet.reactor.listenTCP(8888, app)

	OSCHandler(31337)
	twisted.internet.reactor.run()

if __name__ == '__main__':
	main()
