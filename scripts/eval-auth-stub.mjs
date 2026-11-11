/**
 * Local operator-identity stub for the 5-Company Evaluation Gate.
 *
 * The real /api/auth/me lives on the primary SponZilla backend and requires
 * a live admin session. For a local eval run we point
 * SPONZILLA_AUTH_API_URL at this stub so the actual requireSponzillaAdmin
 * middleware, its Bearer parsing, role check and actor derivation all still
 * execute. Only the identity provider is replaced.
 *
 * Never deploy this. It is started only by the eval harness.
 */
import { createServer } from "node:http";

const port = Number(process.env.EVAL_AUTH_STUB_PORT ?? 4010);
const expectedToken = process.env.EVAL_OPERATOR_TOKEN ?? "eval-operator-token";

const server = createServer((req, res) => {
  if (req.method !== "GET" || req.url !== "/api/auth/me") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
    return;
  }

  const authorization = req.headers.authorization;
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (token !== expectedToken) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "UNAUTHORIZED" }));
    return;
  }

  res.writeHead(200, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      user: {
        id: "eval-operator-1",
        name: "Eval Operator",
        email: "eval-operator@localhost",
        role: "admin",
      },
    }),
  );
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[eval-auth-stub] listening on http://127.0.0.1:${port}`);
});
