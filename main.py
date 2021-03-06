#!/usr/bin/env python

import os
import json
import random
import logging

import cyclone.web
import cyclone.websocket
import txws

import twisted.internet.protocol
import twisted.internet.reactor
import twisted.internet.task
import txosc.async
import txosc.dispatch

class Environment:
	def __init__(self):
		self.admin = set()
		self.callback = set()
		self.vote = {}

		self.switch = True
		self.color = [[255, 255, 255]]
		self.bpm = 120
		self.rhythm = '10'
		self.img = ''

	def getEnv(self):
		return json.dumps(map(str, random.choice(self.color) + [self.bpm, self.rhythm]))

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
			c.transport.write(self.getMessage())

	def updateAdmin(self, exclude = None):
		for c in self.admin:
			if c != exclude:
				c.transport.write(self.getAdminMessage())

	def getVote(self):
		return json.dumps({'vote': self.vote.keys()})

	def sendVote(self):
		for c in self.callback:
			c.transport.write(self.getVote())

	def saveVote(self):
		path = os.path.join(os.path.dirname(__file__), 'webroot', 'vote.json')
		file = open(path, 'w')
		file.write(json.dumps(self.vote))
		file.close()

	def getImage(self):
		return json.dumps({'img': self.img})

	def sendImage(self, img):
		self.img = img

		for c in self.callback:
			c.transport.write(self.getImage())

env = Environment()


class MainSocketHandler(twisted.internet.protocol.Protocol):
	def connectionMade(self):
		env.callback.add(self)
		self.transport.write(env.getMessage())
		self.transport.write(env.getVote())
		self.transport.write(env.getImage())

	def connectionLost(self, reason):
		if self in env.callback:
			env.callback.remove(self)

	def dataReceived(self, message):
		data = json.loads(message)
		if 'vote' in data and data['vote'] in env.vote:
			env.vote[data['vote']] += 1

class MainSocketFactory(twisted.internet.protocol.Factory):
	protocol = MainSocketHandler


class AdminSocketHandler(twisted.internet.protocol.Protocol):
	def connectionMade(self):
		env.admin.add(self)
		self.transport.write(env.getAdminMessage())

	def connectionLost(self, reason):
		if self in env.admin:
			env.admin.remove(self)

	def dataReceived(self, message):
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
			env.rhythm = data['rhythm']

		env.update()
		env.updateAdmin(self)

class AdminSocketFactory(twisted.internet.protocol.Factory):
	protocol = AdminSocketHandler


class VoteSocketHandler(twisted.internet.protocol.Protocol):
	def dataReceived(self, message):
		self.transport.write(json.dumps(env.vote))

class VoteSocketFactory(twisted.internet.protocol.Factory):
	protocol = VoteSocketHandler


class OSCHandler(object):
	def __init__(self, port):
		routes = [
			('/cylume/*', self.cylume_handler),
			('/vote/*', self.vote_handler),
			('/image/*', self.image_handler)
		]

		self.receiver = txosc.dispatch.Receiver()
		self.receiver.fallback = self.fallback
		for path, handler in routes:
			self.receiver.addCallback(path, handler)

		twisted.internet.reactor.listenUDP(port, txosc.async.DatagramServerProtocol(self.receiver))

	def cylume_handler(self, message, address):
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
			env.vote = {}
			for i in value:
				if type(i) == str:
					env.vote[i.decode('UTF-8')] = 0
			env.sendVote()
		elif function == 'end':
			env.vote = {}
			env.sendVote()

	def image_handler(self, message, address):
		function = message.address.split('/')[2]
		value = message.getValues()

		if function == 'upload' and len(value) == 1:
			env.sendImage(value[0])
		elif function == 'dismiss':
			env.sendImage('')

	def fallback(self, message, address):
		print message, address


def main():
	twisted.internet.reactor.listenTCP(8888, txws.WebSocketFactory(MainSocketFactory()))
	twisted.internet.reactor.listenTCP(8889, txws.WebSocketFactory(AdminSocketFactory()))
	twisted.internet.reactor.listenTCP(8890, txws.WebSocketFactory(VoteSocketFactory()))

	OSCHandler(51227)

	timer = twisted.internet.task.LoopingCall(env.saveVote)
	timer.start(1.0)

	twisted.internet.reactor.run()

if __name__ == '__main__':
	main()
