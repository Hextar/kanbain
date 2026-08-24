#!/bin/sh
set -eu

flask db upgrade
flask seed
exec gunicorn --bind "0.0.0.0:${PORT:-3000}" --workers 2 wsgi:app
