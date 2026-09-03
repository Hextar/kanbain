# Software quality bar

MVP quality bars stay lean: happy path, basic auth if users exist, smoke tests, a rollback note.

Production-grade plans add: automated tests for the critical path, error budgets or at least logging and alerts, accessibility on primary screens, security review of auth and data stores, and a staged rollout.

Risk-tolerant teams can defer polish. Low risk tolerance adds threat modeling, backups, and an on-call or owner for launch week.

Never invent teammates. Map frontend, backend, and design work onto the named roster; if a skill is missing, make that a risk, not a fake assignee.
