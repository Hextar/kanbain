I'm working on a neighborhood tool-lending app for apartment buildings, so residents can borrow drills and ladders from neighbors instead of buying them.

Outcome

- In 6 weeks, a resident can create an account, list a tool with photos, request a borrow window, and complete handoff with a rating — on mobile web.

In scope

- Listings: photo, availability calendar, pickup location in the building
- Requests: owner approve/decline, reminder before pickup, mark returned
- Trust: building membership via invite code, ratings, report flow
- Launch: waitlist landing page, one building as the pilot

Out of scope

- Native apps, payments, insurance, multi-city, admin CMS

Constraints

- Stack: Next.js frontend, Flask API, Postgres
- Must work on a phone in a hallway with bad signal
- Invite-only for v1; no public signup
- Known risks: we have no designer, photo upload may be slow, building manager may change the invite rules mid-pilot

Definition of done

- Pilot building can list 20 tools and complete 5 real borrows
- Basic tests on request state machine; error tracking on
- Building manager can export a member list
