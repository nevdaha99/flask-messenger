import os

import flask_login
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer

from main_app.models import User
from project.settings import project

load_dotenv()
project.secret_key = os.getenv("SECRET_KEY")
serializer = URLSafeTimedSerializer(project.secret_key)
login_manager = flask_login.LoginManager(project)


@login_manager.user_loader
def load_user(id):
    return User.query.get(id)
