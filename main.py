#!/usr/bin/env python

import os
import json
import logging

import tornado.ioloop
import tornado.web
import tornado.websocket

callback = set()
color = (255, 255, 255, 0, '1')

class MainHandler(tornado.web.RequestHandler):
	def get(self):
		self.render('index.html', color = map(str, color))


class MainColorHandler(tornado.websocket.WebSocketHandler):
	def open(self):
		callback.add(self)
		self.write_message(json.dumps({'color': 'rgb(%d, %d, %d)' % color[:3], 'bpm': color[3], 'pattern': color[4]}))

	def on_close(self):
		if self in callback:
			callback.remove(self)


class AdminHandler(tornado.web.RequestHandler):
	def get(self):
		self.render('admin.html', color = map(str, color))

class AdminColorHandler(tornado.websocket.WebSocketHandler):
	def on_message(self, message):
		global color

		try:
			data = json.loads(message)
			color = (data['red'], data['green'], data['blue'], data['bpm'], data['pattern'])
			message = json.dumps({'color': 'rgb(%d, %d, %d)' % color[:3], 'bpm': color[3], 'pattern': color[4]})
			for c in callback:
				c.write_message(message)
		except:
			return


def main():
	routes = [
		(r'/', MainHandler),
		(r'/admin', AdminHandler),
		(r'/socket', MainColorHandler),
		(r'/socket/admin', AdminColorHandler)
	]

	app = tornado.web.Application(routes,
		template_path = os.path.join(os.path.dirname(__file__), 'templates'),
		static_path = os.path.join(os.path.dirname(__file__), 'static'))
	app.listen(8888)
	tornado.ioloop.IOLoop.instance().start()


if __name__ == '__main__':
	main()
