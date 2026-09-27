import flask
import flask_login
import flask_socketio

from main_app.app import chat_online_users, online_users
from main_app.models import Chat, Messages, User
from project.db import DATABASE
from project.settings import socketio


@socketio.on("connect")
def hendle_connect():
    print("connect")
    user_id = flask_login.current_user.id
    flask_socketio.join_room("global_room", flask.request.sid)
    if user_id not in online_users.keys():
        online_users[user_id] = set()
    online_users[user_id].add(flask.request.sid)
    socketio.emit("online", list(online_users.keys()), to="global_room")


@socketio.on("disconnect")
def hendle_disconnect():
    user_id = flask_login.current_user.id
    flask_socketio.leave_room("global_room", flask.request.sid)
    if user_id in online_users.keys():
        online_users[user_id].discard(flask.request.sid)
        if not online_users[user_id]:
            online_users.pop(user_id)
    for chat in chat_online_users:
        if user_id in chat_online_users[chat]:
            chat_online_users[chat].discard(user_id)
    socketio.emit("online", list(online_users.keys()), to="global_room")


@socketio.on("sendMessage")
def hendle_message(data):
    chat = flask.session.get("current_chat")
    if chat:
        user_id = flask_login.current_user.id
        chat_id = chat.split("_")[1]

        message = Messages(text=data, sender_id=user_id, chat_id=chat_id)
        DATABASE.session.add(message)
        DATABASE.session.commit()
        for chat_user_id in chat_online_users.get(chat_id, set()):
            user = User.query.get(chat_user_id)
            if user and user not in message.readers:
                message.readers.append(user)
        DATABASE.session.commit()
        sender_user = message.sender
        display_name = (
            sender_user.email.split("@")[0]
            if sender_user.email
            else "Пользователь"
        )

        formatted_time = message.date.strftime("%I:%M %p")

        flask_socketio.emit(
            "message",
            {
                "username": display_name,
                "id": message.id,
                "chat_id": chat_id,
                "sender_id": user_id,
                "time": formatted_time,
                "text": data,
            },
            to=chat,
        )
        flask_socketio.emit(
            "send_notification",
            {
                "chat_id": chat_id,
                "text": data,
            },
            to="global_room",
        )


@socketio.on("connectChat")
def hendle_connect_chat(id):
    chat = Chat.query.get(int(id))
    if chat:
        old_chat = flask.session.get("current_chat")
        if old_chat:
            flask_socketio.leave_room(old_chat)
            old_chat_id = old_chat.split("_")[1]
            if old_chat_id in chat_online_users:
                chat_online_users[old_chat_id].discard(
                    flask_login.current_user.id
                )
        if id not in chat_online_users:
            chat_online_users[id] = set()
        chat_online_users[id].add(flask_login.current_user.id)
        print(chat_online_users)
        flask_socketio.join_room(f"chat_{id}", flask.request.sid)
        flask.session["current_chat"] = f"chat_{id}"
