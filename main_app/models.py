import datetime

import flask_login

from project.db import DATABASE


class User(DATABASE.Model, flask_login.UserMixin):
    __tablename__ = "user"
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    email = DATABASE.Column(DATABASE.String)
    password = DATABASE.Column(DATABASE.String)
    is_active = DATABASE.Column(DATABASE.Boolean)
    verify_code = DATABASE.Column(DATABASE.String)
    chat = DATABASE.relationship(
        "Chat", backref="user", uselist=False, cascade="all, delete-orphan"
    )
    messages = DATABASE.relationship(
        "Messages", backref="sender", cascade="all, delete-orphan"
    )


class Chat(DATABASE.Model):
    __tablename__ = "chat"
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    name = DATABASE.Column(DATABASE.String)
    avatar = DATABASE.Column(DATABASE.String)
    user_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("user.id"), unique=True
    )
    messages = DATABASE.relationship(
        "Messages", backref="chat", cascade="all, delete-orphan"
    )

    def get_unread_count(self, user_id):
        return Messages.query.filter(
            Messages.chat_id == self.id,
            Messages.sender_id != user_id,
            ~Messages.readers.any(User.id == user_id),
        ).count()

    def get_last_message(self):
        last_message = (
            Messages.query.filter(
                Messages.chat_id == self.id,
            )
            .order_by(Messages.date.desc())
            .first()
        )
        return last_message

    def get_last_message_time(self):
        last_message = self.get_last_message()
        if last_message:
            delta = datetime.datetime.now() - last_message.date
            seconds = int(delta.total_seconds())
            if seconds < 60:
                return f"{seconds}с тому"
            elif seconds < 60 * 60:
                return f"{seconds // 60}хв тому"
            elif seconds < 60 * 60 * 24:
                return f"{seconds // 60 // 60}год тому"
            else:
                return f"{seconds // 60 // 60 // 24}д тому"


class Messages(DATABASE.Model):
    __tablename__ = "messages"
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    text = DATABASE.Column(DATABASE.String)
    date = DATABASE.Column(DATABASE.DateTime, default=datetime.datetime.now)
    readers = DATABASE.relationship(
        "User", backref="readed_messages", secondary="message_readers"
    )
    sender_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("user.id")
    )
    chat_id = DATABASE.Column(DATABASE.Integer, DATABASE.ForeignKey("chat.id"))


class MessageReaders(DATABASE.Model):
    __tablename__ = "message_readers"
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    user_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("user.id"), nullable=False
    )
    message_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("messages.id"), nullable=False
    )
