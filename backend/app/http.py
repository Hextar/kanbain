from flask import jsonify


def error_response(message: str, status: int):
    return jsonify({"message": message}), status
