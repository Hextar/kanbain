import gzip

from flask import jsonify

GZIP_MIN_BYTES = 1024
GZIP_TYPES = frozenset({"application/json", "text/plain"})


def error_response(message: str, status: int):
    return jsonify({"message": message}), status


def gzip_response(request, response):
    if response.direct_passthrough or response.headers.get("Content-Encoding"):
        return response
    if request.method == "HEAD" or "gzip" not in (
        request.headers.get("Accept-Encoding") or ""
    ):
        return response
    mime = (response.content_type or "").split(";", 1)[0].strip()
    if mime not in GZIP_TYPES:
        return response
    data = response.get_data()
    if len(data) < GZIP_MIN_BYTES:
        return response
    compressed = gzip.compress(data, compresslevel=5)
    if len(compressed) >= len(data):
        return response
    response.set_data(compressed)
    response.headers["Content-Encoding"] = "gzip"
    response.headers["Content-Length"] = str(len(compressed))
    vary = response.headers.get("Vary")
    response.headers["Vary"] = (
        f"{vary}, Accept-Encoding" if vary else "Accept-Encoding"
    )
    return response

