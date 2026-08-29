from app.lookups import get_project
from app.planner.prompt import compose_user_prompt, format_prompt_for_log, compose_messages


def test_prompt_includes_goal_deadline_and_members(client, app):
    created = client.post(
        "/api/projects",
        json={
            "name": "Launch site",
            "goal": "Ship a marketing site",
            "deadlineKind": "hard",
            "deadlineAt": "2026-12-01T00:00:00Z",
            "members": [{"name": "Ada", "role": "engineer", "seniority": "senior", "capacity": 1}],
        },
    )
    project_id = created.get_json()["id"]

    with app.app_context():
        prompt = compose_user_prompt(get_project(project_id))
        rendered = format_prompt_for_log(compose_messages(get_project(project_id)))

    assert "Ship a marketing site" in prompt
    assert "Ada" in prompt
    assert "engineer" in prompt
    assert "2026-12-01" in prompt
    assert "hard" in prompt
    assert "expert project manager" in rendered
    assert "SYSTEM:" in rendered
    assert "USER:" in rendered
