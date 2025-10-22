export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri = process.env.OAUTH_REDIRECT_URI || `${proto}://${host}/api/callback`;

    if (!code) return res.status(400).json({ error: "Missing code" });
    if (!clientId || !clientSecret) return res.status(500).json({ error: "Missing GitHub OAuth env vars" });

    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {"Content-Type":"application/json","Accept":"application/json"},
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
    });
    const data = await r.json();
    if (!data.access_token) return res.status(500).json({ error: data.error_description || "Token exchange failed" });

    const token = data.access_token;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<!doctype html><html><body><script>
      (function(){
        if(window.opener){ window.opener.postMessage({ token: "${token}" }, "*"); window.close(); }
        else { document.body.innerText = "OAuth OK. Token: ${token}"; }
      })();
    </script></body></html>`);
  } catch (e) {
    res.status(500).json({ error: e.message || "callback failed" });
  }
}
