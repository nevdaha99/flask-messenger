import flask_sqlalchemy, flask_migrate
from .settings import project

project.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///data.db"
DATABASE = flask_sqlalchemy.SQLAlchemy(project)
MIGRATE = flask_migrate.Migrate(project, DATABASE)
