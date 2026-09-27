import email.message
import os
import smtplib

from dotenv import load_dotenv
import flask

load_dotenv()
secret_key = os.getenv("SECRET_KEY")


def send_confirm_mail(user_email, token):
    html = flask.render_template("message.html", token=token)
    message = email.message.EmailMessage()
    message["Subject"] = "login code"
    message["From"] = "mishapankov29@gmail.com"
    message["To"] = user_email
    message.add_alternative(html, subtype="html")
    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login("mishapankov29@gmail.com", secret_key)
        smtp.send_message(message)
