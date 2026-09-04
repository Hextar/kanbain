from app.mail import (
    ConsoleEmailProvider,
    OutgoingEmail,
    ResendEmailProvider,
    SmtpEmailProvider,
    build_mail_provider,
)


def test_build_mail_provider_defaults_to_console():
    assert isinstance(build_mail_provider("console"), ConsoleEmailProvider)
    assert isinstance(build_mail_provider("unknown"), ConsoleEmailProvider)
    assert isinstance(build_mail_provider("smtp"), SmtpEmailProvider)
    assert isinstance(build_mail_provider("resend"), ResendEmailProvider)


def test_console_provider_records_outbox(app):
    mail = app.extensions["mail"]
    message = OutgoingEmail(to="ada@example.com", subject="Hello", text="Hi")
    with app.app_context():
        mail.send(message)
    assert mail.outbox[-1] == message


def test_smtp_requires_host(app):
    provider = SmtpEmailProvider()
    with app.app_context():
        app.config["SMTP_HOST"] = ""
        try:
            provider.send(
                OutgoingEmail(to="ada@example.com", subject="Hello", text="Hi")
            )
        except RuntimeError as exc:
            assert "SMTP_HOST" in str(exc)
        else:
            raise AssertionError("expected RuntimeError")


def test_resend_posts_payload(app, monkeypatch):
    calls = []

    class FakeResponse:
        ok = True
        status_code = 200
        text = "{}"

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append(
            {"url": url, "headers": headers, "json": json, "timeout": timeout}
        )
        return FakeResponse()

    monkeypatch.setattr("app.mail.requests.post", fake_post)
    provider = ResendEmailProvider()
    with app.app_context():
        app.config["RESEND_API_KEY"] = "re_test"
        app.config["MAIL_FROM"] = "KanbAIn <noreply@example.com>"
        provider.send(
            OutgoingEmail(to="ada@example.com", subject="Hello", text="Hi")
        )
    assert calls[0]["url"] == "https://api.resend.com/emails"
    assert calls[0]["headers"]["Authorization"] == "Bearer re_test"
    assert calls[0]["json"]["to"] == ["ada@example.com"]
    assert calls[0]["json"]["from"] == "KanbAIn <noreply@example.com>"
