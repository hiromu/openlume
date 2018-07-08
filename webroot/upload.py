#!/usr/bin/env python

import os
import cgi
import sys
import uuid

from txosc import osc
from txosc import sync

if os.environ['REQUEST_METHOD'] != 'POST':
	print 'Status: 403 Forbidden\r\n'
	sys.exit()

form = cgi.FieldStorage()
if not form.has_key('img'):
	print 'Status: 403 Forbidden\r\n'
	sys.exit()

item = form['img']
if not item.file:
	print 'Status: 403 Forbidden\r\n'
	sys.exit()

name = str(uuid.uuid4())
path = os.path.join(os.path.dirname(__file__), 'img', name)

out = open(path, 'wb')
while True:
	data = item.file.read(2<<16)
	if not data:
		break
	out.write(data)
out.close()

try:
	sender = sync.UdpSender('localhost', 51227)
except socket.error, e:
	print 'Status: 500 Internal Server Error\r\n'
else:
	sender.send(osc.Message('/image/upload', name))
	sender.close()
	print 'Status: 200 OK\r\n'
