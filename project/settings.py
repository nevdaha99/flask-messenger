import flask
import flask_socketio

project = flask.Flask("project")
socketio = flask_socketio.SocketIO(project)
