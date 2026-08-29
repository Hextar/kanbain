def test_settings_start_unconfigured(client):
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.get_json() == {
        "openaiApiKeyConfigured": False,
        "openaiApiKeyRevoked": False,
    }


def test_settings_put_get_and_clear(client):
    saved = client.put("/api/settings", json={"openaiApiKey": "sk-abcdefghijklmnopqrstuvwxyz"})
    assert saved.status_code == 200
    assert saved.get_json() == {
        "openaiApiKeyConfigured": True,
        "openaiApiKeyRevoked": False,
        "openaiApiKeyHint": "wxyz",
    }
    body = saved.get_data(as_text=True)
    assert "sk-abcdefghijklmnopqrstuvwxyz" not in body
    assert "enc:v1:" not in body

    loaded = client.get("/api/settings")
    assert loaded.get_json() == {
        "openaiApiKeyConfigured": True,
        "openaiApiKeyRevoked": False,
        "openaiApiKeyHint": "wxyz",
    }
    assert "sk-abcdefghijklmnopqrstuvwxyz" not in loaded.get_data(as_text=True)

    cleared = client.put("/api/settings", json={"openaiApiKey": None})
    assert cleared.status_code == 200
    assert cleared.get_json() == {
        "openaiApiKeyConfigured": False,
        "openaiApiKeyRevoked": False,
    }


def test_settings_env_fallback(client, app):
    app.config["OPENAI_API_KEY"] = "sk-from-env"
    response = client.get("/api/settings")
    assert response.get_json() == {
        "openaiApiKeyConfigured": True,
        "openaiApiKeyRevoked": False,
        "openaiApiKeyHint": "-env",
    }


def test_settings_requires_json_body(client):
    response = client.put("/api/settings", data="nope", content_type="text/plain")
    assert response.status_code == 400
    assert response.get_json()["message"] == "JSON body required"


def test_settings_requires_openai_api_key_field(client):
    response = client.put("/api/settings", json={})
    assert response.status_code == 400
    assert response.get_json()["message"] == "openaiApiKey is required"
