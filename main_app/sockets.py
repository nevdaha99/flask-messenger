import flask
import flask_login
import flask_socketio

from main_app.models import Chat, Messages
from project.db import DATABASE
from project.settings import socketio


@socketio.on("connect")
def hendle_connect():
    print(flask.request.sid)
    flask_socketio.join_room("global_room", flask.request.sid)


# @socketio.on("sendMessage")
# def hendle_message(data):
#     chat = flask.session.get("current_chat")
#     if chat:
#         user_id = flask_login.current_user.id
#         chat_id = chat.split("_")[1]
#         message = Messages(text=data, sender_id=user_id, chat_id=chat_id)
#         DATABASE.session.add(message)
#         DATABASE.session.commit()
#         flask_socketio.emit(
#             "message", {"sender": message.sender.email, "text": data}, to=chat
#         )
@socketio.on("sendMessage")
def hendle_message(data):
    chat = flask.session.get("current_chat")
    if chat:
        user_id = flask_login.current_user.id
        chat_id = chat.split("_")[1]

        # 1. Сохраняем сообщение
        message = Messages(text=data, sender_id=user_id, chat_id=chat_id)
        DATABASE.session.add(message)
        DATABASE.session.commit()

        # 2. Берем личный чат пользователя для получения его аватарки (если аватар хранится там)
        user_chat = Chat.query.filter_by(user_id=user_id).first()
        avatar_file = (
            user_chat.avatar
            if (user_chat and user_chat.avatar)
            else "avatar.png"
        )
        avatar_url = flask.url_for(
            "main.static", filename=f"img/{avatar_file}"
        )

        # 3. Достаем почту или имя напрямую из объекта User (message.sender)
        sender_user = message.sender
        display_name = (
            sender_user.email.split("@")[0]
            if sender_user.email
            else "Пользователь"
        )

        formatted_time = message.date.strftime("%I:%M %p")

        # 4. Отправляем в SocketIO
        flask_socketio.emit(
            "message",
            {
                "username": display_name,  # Теперь здесь будет имя/почта пользователя, а не чата
                "avatarUrl": avatar_url,
                "time": formatted_time,
                "text": data,
            },
            to=chat,
        )


@socketio.on("connectChat")
def hendle_connect_chat(id):
    chat = Chat.query.get(int(id))
    if chat:
        old_chat = flask.session.get("current_chat")
        if old_chat:
            flask_socketio.leave_room(old_chat)
        flask_socketio.join_room(f"chat_{id}", flask.request.sid)
        flask.session["current_chat"] = f"chat_{id}"
