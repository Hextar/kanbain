# Software product delivery

A typical product slice is: clarify the user outcome, shape the thinnest vertical, stand up the repo and environments, implement the core path, add tests, instrument, and ship behind a flag.

Default epics often look like foundation (auth, project model, CI), core workflow (the job the user hired the product for), quality (tests, observability, a11y), and launch (docs, rollout, support).

Do not skip a first vertical that a real user can complete. Infrastructure-only first milestones stall learning.

Call out API contracts, data model, and the first migration as explicit cards. Hidden schema work is how software plans slip.
