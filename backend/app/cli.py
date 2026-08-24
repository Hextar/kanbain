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
