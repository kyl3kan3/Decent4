# Health API session integration

The standalone health server no longer treats `x-user-id` as authentication.
All health-data endpoints now return **503** until a real application session
verifier is configured. The unauthenticated `/health` liveness endpoint remains.

Set `HEALTH_AUTH_MODULE` to an absolute path to a trusted server-side ES module
exporting `authenticateSession(request)`. It must verify the existing application's
session cookie or signed bearer token, load the authenticated user, and return
`{ id: positiveIntegerUserId }` or `null`. Never derive identity from `x-user-id`,
query parameters, an unsigned token, or an unverified request body.

The original `server/db-storage.js`, `server/openai-supplements.js`, and actual
session implementation are missing from this repository. They must be supplied
by the host application; a secure production integration cannot be demonstrated
from this checkout alone. No replacement identity system is assumed.

Before deployment, run `node --test tests/health-auth.test.mjs`, then test with the
actual session provider: no session and forged user IDs must fail; one signed-in
user must only receive their own records. Deploy behind HTTPS. Do not expose
the other diagnostic/demo servers as production health-data APIs.
