import click
from flask import Flask
from flask.cli import with_appcontext


def register_cli(app: Flask) -> None:
    @app.cli.command("seed")
    @with_appcontext
    def seed_command() -> None:
        from .seed import seed_defaults

        seed_defaults()
        click.echo("Database seeded.")

    @app.cli.command("rotate-encryption-key")
    @click.option(
        "--old-secret",
        envvar="OLD_SECRET_KEY",
        required=True,
        help="Passphrase that currently encrypts the stored OpenAI API key.",
    )
    @with_appcontext
    def rotate_encryption_key(old_secret: str) -> None:
        from .planner.keys import reencrypt_stored_openai_api_key

        try:
            hint = reencrypt_stored_openai_api_key(old_secret)
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc
        if hint is None:
            click.echo("No stored OpenAI API key to re-encrypt.")
            return
        click.echo(f"Re-encrypted the stored OpenAI API key (ends in {hint}).")

    @app.cli.command("invalidate-openai-keys")
    @click.option("--yes", is_flag=True, help="Do not prompt for confirmation.")
    @with_appcontext
    def invalidate_openai_keys(yes: bool) -> None:
        if not yes:
            click.confirm(
                "This deletes every stored OpenAI API key. Continue?",
                abort=True,
            )
        from .planner.keys import invalidate_stored_openai_api_keys

        count = invalidate_stored_openai_api_keys()
        if count == 0:
            click.echo(
                "No stored OpenAI API keys were present. Planning is blocked "
                "until a new key is saved in Settings."
            )
            return
        click.echo(
            f"Invalidated {count} stored OpenAI API key(s). "
            "Paste a new key in Settings to plan again."
        )
