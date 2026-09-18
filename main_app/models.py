import datetime

import flask_login

from project.db import DATABASE


class User(DATABASE.Model, flask_login.UserMixin):
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
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    name = DATABASE.Column(DATABASE.String)
    avatar = DATABASE.Column(DATABASE.String)
    user_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("user.id"), unique=True
    )
    messages = DATABASE.relationship(
        "Messages", backref="chat", cascade="all, delete-orphan"
    )


class Messages(DATABASE.Model):
    id = DATABASE.Column(DATABASE.Integer, primary_key=True)
    text = DATABASE.Column(DATABASE.String)
    date = DATABASE.Column(DATABASE.DateTime, default=datetime.datetime.now)
    sender_id = DATABASE.Column(
        DATABASE.Integer, DATABASE.ForeignKey("user.id")
    )
    chat_id = DATABASE.Column(DATABASE.Integer, DATABASE.ForeignKey("chat.id"))
