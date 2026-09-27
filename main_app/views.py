import flask
import flask_login
from werkzeug.security import check_password_hash, generate_password_hash

from project.db import DATABASE
from project.login_manager import serializer
from .app import online_users
from .mail import send_confirm_mail
from .models import Chat, Messages, User


def render_create_user():
    if flask_login.current_user.is_authenticated:
        return flask.redirect("/")
    if flask.request.method == "POST":
        user_email = flask.request.form.get("email")
        password = flask.request.form.get("password")
        verify_password = flask.request.form.get("verify_password")
        if password != verify_password:
            return flask.render_template(
                "create_user.html", error="Паролі не співпадають"
            )
        if User.query.filter_by(email=user_email).first():
            return flask.render_template(
                "create_user.html", error="Користувач з такою почтою вже існує"
            )

        password_hash = generate_password_hash(password)
        user = User(
            email=user_email,
            password=password_hash,
            is_active=False,
        )
        DATABASE.session.add(user)
        DATABASE.session.flush()
        token = serializer.dumps({"user_id": user.id})
        token_hash = generate_password_hash(token)
        user.verify_code = token_hash
        DATABASE.session.commit()
        send_confirm_mail(user_email, token)
        return flask.redirect("/user/successfully")
    return flask.render_template("create_user.html")


def render_successfully_create():
    return flask.render_template("create_successfully.html")


def verify_email(token):
    try:
        data = serializer.loads(token, max_age=3600)
        user_id = data["user_id"]
    except Exception:
        return "Посилання недійсне або його термін дії закінчився"
    user = User.query.get(user_id)
    if not user:
        return "Користувача не знайдено"
    if not check_password_hash(user.verify_code, token):
        return "Недійсний код підтвердження"
    user.is_active = True
    DATABASE.session.commit()
    return flask.redirect("/user/login")


def render_login_user():
    if flask_login.current_user.is_authenticated:
        return flask.redirect("/")
    if flask.request.method == "POST":
        user_email = flask.request.form.get("email")
        password = flask.request.form.get("password")
        try:
            user = User.query.filter_by(email=user_email).first()
            if not user:
                return "користувача з такою поштою не існує"
            if not user.is_active:
                return "акаунт необхідно активувати"
            if check_password_hash(user.password, password):
                flask_login.login_user(user)
                return flask.redirect("/")
        except Exception:
            print("error")

    return flask.render_template("login_user.html")


def render_main():
    if not flask_login.current_user.is_authenticated:
        return flask.redirect("/user/login")
    chat = flask_login.current_user.chat
    all_chat = Chat.query.all()
    all_users = User.query.all()
    all_online_users = online_users
    return flask.render_template(
        "main.html",
        chat=chat,
        all_chat=all_chat,
        all_users=all_users,
        all_online_users=all_online_users,
    )


def logout_user():
    if flask_login.current_user.is_authenticated:
        flask_login.logout_user()
    return flask.redirect("/")


@flask_login.login_required
def add_chat():
    if flask.request.method == "POST":
        chat_name = flask.request.form.get("chat_name")
        if chat_name:
            new_chat = Chat(
                name=chat_name,
                avatar="avatar.png",
                user=flask_login.current_user,
            )
            DATABASE.session.add(new_chat)
            DATABASE.session.commit()
            return flask.redirect("/")
    return flask.render_template("add_chat.html")


@flask_login.login_required
def delete_chat():
    user_chat = flask_login.current_user.chat
    if user_chat:
        DATABASE.session.delete(user_chat)
        DATABASE.session.commit()
    return flask.redirect("/")


@flask_login.login_required
def get_messages():
    chat_id = flask.request.args.get("chat_id")
    all_messages = Messages.query.filter_by(chat_id=chat_id).all()
    list_messages = []
    user = flask_login.current_user
    for message in all_messages:
        sender_user = message.sender
        if user not in message.readers:
            message.readers.append(user)
        display_name = (
            sender_user.email.split("@")[0]
            if sender_user.email
            else "Пользователь"
        )
        list_messages.append(
            {
                "username": display_name,
                "time": message.date.strftime("%I:%M %p"),
                "text": message.text,
            },
        )
    DATABASE.session.commit()
    return flask.jsonify(list_messages)
