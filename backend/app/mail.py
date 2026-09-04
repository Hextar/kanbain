from __future__ import annotations

import smtplib
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import Protocol

import requests
from flask import Flask, current_app


@dataclass(frozen=True)
class OutgoingEmail:
    to: str
    subject: str
    text: str


class EmailProvider(Protocol):
    def send(self, email: OutgoingEmail) -> None: ...


@dataclass
class ConsoleEmailProvider:
    outbox: list[OutgoingEmail] = field(default_factory=list)

    def send(self, email: OutgoingEmail) -> None:
        self.outbox.append(email)
        current_app.logger.info(
            "Mail [%s] to %s\n%s\n%s",
            email.subject,
            email.to,
            "-" * 40,
            email.text,
        )


class SmtpEmailProvider:
    def send(self, email: OutgoingEmail) -> None:
        host = (current_app.config.get("SMTP_HOST") or "").strip()
        if not host:
            raise RuntimeError("SMTP_HOST is required when MAIL_PROVIDER=smtp")
        port = int(current_app.config.get("SMTP_PORT") or 587)
        user = (current_app.config.get("SMTP_USER") or "").strip()
        password = current_app.config.get("SMTP_PASSWORD") or ""
        message = _mime_message(email)
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=10) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(message)
            return
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(message)


class ResendEmailProvider:
    def send(self, email: OutgoingEmail) -> None:
        api_key = (current_app.config.get("RESEND_API_KEY") or "").strip()
        if not api_key:
            raise RuntimeError("RESEND_API_KEY is required when MAIL_PROVIDER=resend")
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": _mail_from(),
                "to": [email.to],
                "subject": email.subject,
                "text": email.text,
            },
            timeout=10,
        )
        if not response.ok:
            current_app.logger.error(
                "Resend rejected mail to %s: %s %s",
                email.to,
                response.status_code,
                response.text,
            )
            raise RuntimeError(
                f"Resend rejected the message ({response.status_code}): {response.text}"
            )
        current_app.logger.info("Resend accepted mail to %s", email.to)


def init_mail(app: Flask) -> None:
    app.extensions["mail"] = build_mail_provider(
        (app.config.get("MAIL_PROVIDER") or "console").strip().lower()
    )


def build_mail_provider(name: str) -> EmailProvider:
    if name == "smtp":
        return SmtpEmailProvider()
    if name == "resend":
        return ResendEmailProvider()
    return ConsoleEmailProvider()


def send_mail(email: OutgoingEmail) -> None:
    current_app.extensions["mail"].send(email)


def try_send_mail(email: OutgoingEmail) -> None:
    try:
        send_mail(email)
    except Exception:
        current_app.logger.exception(
            "Failed to send %s to %s", email.subject, email.to
        )


def activation_email(*, to: str, name: str, url: str) -> OutgoingEmail:
    greeting = name.strip() or "there"
    return OutgoingEmail(
        to=to,
        subject="Activate your KanbAIn account",
        text=(
            f"Hi {greeting},\n\n"
            "Confirm your email by opening this link:\n"
            f"{url}\n\n"
            "The link expires in 24 hours. If you did not create a KanbAIn "
            "account, you can ignore this message.\n"
        ),
    )


def password_reset_email(*, to: str, name: str, url: str) -> OutgoingEmail:
    greeting = name.strip() or "there"
    return OutgoingEmail(
        to=to,
        subject="Reset your KanbAIn password",
        text=(
            f"Hi {greeting},\n\n"
            "Choose a new password by opening this link:\n"
            f"{url}\n\n"
            "The link expires in one hour. If you did not request a reset, "
            "you can ignore this message.\n"
        ),
    )


def _mail_from() -> str:
    configured = (current_app.config.get("MAIL_FROM") or "").strip()
    if configured:
        return configured
    user = (current_app.config.get("SMTP_USER") or "").strip()
    return user or "KanbAIn <noreply@localhost>"


def _mime_message(email: OutgoingEmail) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = email.subject
    message["From"] = _mail_from()
    message["To"] = email.to
    message.set_content(email.text)
    return message
