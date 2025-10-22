// Usa runtime Node (não Edge)
export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Detecta o domínio atual se a ENV não estiver setada
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri =
      process.env.OAUTH_REDIRECT_URI || `${proto}://${host}/api/callback`;

    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }
    if (!clientId || !clientSecret) {
      res.status(500).json({ error: "Missing GITHUB_CLIENT_ID/SECRET envs" });
      return;
    }

    // Troca do code por access_token (modo compatível)
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }).toString();

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const text = await tokenRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res
        .status(500)
        .send(`<!doctype html><pre>Token exchange failed (non-JSON):\n${text}</pre>`);
      return;
    }

    if (!tokenRes.ok || !data.access_token) {
      res
        .status(500)
        .send(
          `<!doctype html><pre>GitHub error during token exchange:\n${JSON.stringify(
            data,
            null,
            2
          )}</pre>`
        );
      return;
    }

    const token = data.access_token;

    // Envia o token em TODOS os formatos aceitos (Decap/Netlify CMS)
    const html = `<!doctype html><html><body><script>
      (function () {
        try {
          if (window.opener) {
            try { window.opener.postMessage({ token: "${token}", provider: "github" }, "*"); } catch (e) {}
            try { window.opener.postMessage("authorization:github:${token}", "*"); } catch (e) {}
            try {
              var ev = new CustomEvent("authorization:github", { detail: { token: "${token}" }});
              window.opener.dispatchEvent(ev);
            } catch (e) {}
            window.close();
          } else {
            document.body.innerText = "OAuth OK. Token: ${token}";
          }
        } catch (e) {
          document.body.innerText = "OAuth error: " + (e && e.message ? e.message : e);
        }
      })();
    </script></body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send(`<!doctype html><pre>Callback crashed:\n${e?.message || e}</pre>`);
  }
}

