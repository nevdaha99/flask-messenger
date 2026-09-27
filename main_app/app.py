import flask

main = flask.Blueprint(
    "main",
    "main_app",
    static_folder="static",
    static_url_path="/main_static",
    template_folder="templates",
)

online_users = {}
chat_online_users = {}
