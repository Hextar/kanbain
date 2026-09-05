#!/bin/sh
set -eu

flask db upgrade
flask seed
exec gunicorn --bind "0.0.0.0:${PORT:-3000}" --workers 2 --threads 8 --timeout 90 --limit-request-line 4094 --limit-request-fields 50 wsgi:app
