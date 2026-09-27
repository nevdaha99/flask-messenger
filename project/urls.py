from main_app import *

main.add_url_rule(
    "/user/create", view_func=render_create_user, methods=["POST", "GET"]
)

main.add_url_rule(
    "/user/successfully",
    view_func=render_successfully_create,
    methods=["POST", "GET"],
)

main.add_url_rule("/verify/<token>", view_func=verify_email)

main.add_url_rule(
    "/user/login", view_func=render_login_user, methods=["POST", "GET"]
)

main.add_url_rule("/", view_func=render_main, methods=["POST", "GET"])

main.add_url_rule("/user/logout", view_func=logout_user)

main.add_url_rule("/chat/add", view_func=add_chat, methods=["POST", "GET"])

main.add_url_rule(
    "/chat/delete", view_func=delete_chat, methods=["POST", "GET"]
)

main.add_url_rule("/get_messages/", view_func=get_messages)
