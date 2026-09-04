from __future__ import annotations

import logging
import sys

from flask import Flask


def configure_logging(app: Flask) -> None:
    if app.logger.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)
    app.logger.propagate = False
