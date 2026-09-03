from types import SimpleNamespace

SAMPLE_LLM_PLAN = {
    "title": "Launch site",
    "milestones": [{"title": "Launch", "due": "2026-12-01"}],
    "epics": [
        {
            "title": "Launch site",
            "description": "Ship a marketing site",
            "priority": "high",
            "assignee": "Ada",
            "milestone": "Launch",
            "estimateTshirt": "L",
            "estimatePoints": 8,
            "estimateHours": 16,
            "due": None,
            "dependsOn": [],
            "acceptance": [],
            "stories": [
                {
                    "title": "Foundation",
                    "description": "Stand up the board",
                    "priority": "high",
                    "assignee": "Ada",
                    "milestone": "Launch",
                    "estimateTshirt": "M",
                    "estimatePoints": 3,
                    "estimateHours": 4,
                    "due": None,
                    "dependsOn": [],
                    "acceptance": [],
                    "tasks": [
                        {
                            "title": "Capture constraints",
                            "description": None,
                            "priority": "high",
                            "assignee": "Ada",
                            "milestone": "Launch",
                            "estimateTshirt": "S",
                            "estimatePoints": 1,
                            "estimateHours": 2,
                            "due": "2026-12-01",
                            "dependsOn": [],
                            "acceptance": ["Goal, team, and deadline are reflected on cards"],
                        },
                        {
                            "title": "Seed the backlog",
                            "description": None,
                            "priority": "medium",
                            "assignee": "Ada",
                            "milestone": "Launch",
                            "estimateTshirt": "S",
                            "estimatePoints": 2,
                            "estimateHours": 3,
                            "due": None,
                            "dependsOn": ["Capture constraints"],
                            "acceptance": ["First column holds the planned work"],
                        },
                    ],
                }
            ],
        }
    ],
}


def fake_openai_client(content: str, calls=None):
    def create(**kwargs):
        if calls is not None:
            calls.append(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )

    return SimpleNamespace(
        chat=SimpleNamespace(completions=SimpleNamespace(create=create))
    )
