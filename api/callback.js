// Força runtime Node (serverless) — evita Edge quirks
export const config = { runtime: "nodejs18.x" };

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Detecta domínio atual dinamicamente caso vc esqueça de atualizar a env
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const redirectUri =
      process.env.OAUTH_REDIRECT_URI || `${proto}://${host}/api/callback`;

    if (!code) return res.status(400).json({ error: "Missing code" });
    if (!clientId || !clientSecret)
      return res.status(500).json({ error: "Missing GITHUB_CLIENT_ID/SECRET envs" });

    // Troca o code por access_token (modo mais compatível)
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
        "Accept": "application/json",
      },
      body,
    });

    const text = await tokenRes.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) {
      // GitHub deveria devolver JSON, mas se não, joga o texto pro diagnóstico
      return res.status(500).send(`<!doctype html><pre>Token exchange failed:\n${text}</pre>`);
    }

    if (!tokenRes.ok || !data.access_token) {
      return res.status(500).send(`<!doctype html><pre>GitHub error:\n${JSON.stringify(data, null, 2)}</pre>`);
    }

    const token = data.access_token;

    // Envia o token em TODOS os formatos aceitos
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
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "callback failed" });
  }
}
