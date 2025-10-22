export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const scope = process.env.GITHUB_OAUTH_SCOPE || "public_repo,user:email";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const redirectUri = process.env.OAUTH_REDIRECT_URI || `${proto}://${host}/api/callback`;
  if (!clientId) return res.status(500).json({ error: "Missing GITHUB_CLIENT_ID" });

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);

  res.writeHead(302, { Location: url.toString() });
  res.end();
}
