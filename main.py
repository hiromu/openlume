#!/usr/bin/env python

import os
import json
import random
import logging

import cyclone.web
import cyclone.websocket

import twisted.internet.reactor
import txosc.async
import txosc.dispatch

class Environment:
	def __init__(self):
		self.admin = set()
		self.callback = set()
		self.vote = None

		self.switch = True
		self.color = [[255, 255, 255]]
		self.bpm = 120
		self.rhythm = '10'

	def getEnv(self):
		return map(str, random.choice(self.color) + [self.bpm, self.rhythm])

	def getMessage(self):
		color = random.choice(self.color)
		params = {'color': 'rgb(%d, %d, %d)' % tuple(color), 'bpm': self.bpm, 'rhythm': self.rhythm}

		if not self.switch:
			params['bpm'] = 0
			params['rhythm'] = '0'

		return json.dumps(params)

	def getAdminMessage(self):
		params = {'color': self.color, 'bpm': self.bpm, 'rhythm': self.rhythm}
		return json.dumps(params)

	def update(self):
		for c in self.callback:
			c.sendMessage(self.getMessage())

	def updateAdmin(self, exclude = None):
		for c in self.admin:
			if c != exclude:
				c.sendMessage(self.getAdminMessage())

env = Environment()


class MainHandler(cyclone.web.RequestHandler):
	def get(self):
		self.render('index.html', color = env.getEnv())

class MainColorHandler(cyclone.websocket.WebSocketHandler):
	def connectionMade(self):
		env.callback.add(self)
		self.sendMessage(env.getMessage())

	def connectionLost(self, reason):
		if self in env.callback:
			env.callback.remove(self)


class AdminHandler(cyclone.web.RequestHandler):
	def get(self):
		self.render('admin.html', color = env.getEnv())

class AdminColorHandler(cyclone.websocket.WebSocketHandler):
	def connectionMade(self):
		env.admin.add(self)
		self.sendMessage(env.getAdminMessage())

	def connectionLost(self, reason):
		if self in env.admin:
			env.admin.remove(self)

	def messageReceived(self, message):
		data = json.loads(message)

		if 'color' in data:
			env.color = []
			for color in data['color']:
				if len(color) != 3:
					continue
				for i in range(3):
					if type(color[i]) != int:
						color[i] = 0
					else:
						color[i] = max(0, min(255, color[i]))
				env.color.append(color)
		if 'bpm' in data and type(data['bpm']) == int:
			env.bpm = data['bpm']
		if 'rhythm' in data and type(data['rhythm']) == unicode:
			env.rhythm = str(data['rhythm'])

		env.update()
		env.updateAdmin(self)


class OSCHandler(object):
	def __init__(self, port):
		routes = [
			('/cyluim/*', self.cyluim_handler),
			('/vote/*', self.vote_handler)
		]

		self.receiver = txosc.dispatch.Receiver()
		self.receiver.fallback = self.fallback
		for path, handler in routes:
			self.receiver.addCallback(path, handler)

		twisted.internet.reactor.listenUDP(port, txosc.async.DatagramServerProtocol(self.receiver))

	def cyluim_handler(self, message, address):
		function = message.address.split('/')[2]
		value = message.getValues()

		if function == 'switch' and len(value) == 1:
			if value[0] == 0:
				env.switch = False
			elif value[0] == 1:
				env.switch = True

		elif function == 'color' and len(value) % 3 == 0:
			env.color = []
			for i in range(0, len(value), 3):
				color = [0, 0, 0]
				for j in range(3):
					if type(value[i + j]) == int:
						color[j] = max(0, min(255, value[i + j]))
				env.color.append(color)

		elif function == 'bpm' and len(value) == 1:
			if type(value[0]) == int:
				env.bpm = value[0]

		elif function == 'rhythm' and len(value) == 1:
			if type(value[0]) == str:
				env.rhythm = value[0]

		env.update()
		env.updateAdmin()

	def vote_handler(self, message, address):
		function = message.address.split('/')[2]
		value = message.getValues()

		if function == 'start' and len(value) != 0:
			pass
		elif function == 'get':
			pass
		elif function == 'end':
			pass

		print message, address

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
