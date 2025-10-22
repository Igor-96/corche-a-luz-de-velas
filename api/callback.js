export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://crochealuzdevelas.vercel.app');
    const code = url.searchParams.get('code');
    if (!code) throw new Error('Missing code');

    const gh = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI
      })
    });

    const data = await gh.json();
    const token = data.access_token;
    if (!token) throw new Error('No access_token from GitHub');

    // Cookie só como fallback (não é o que o Decap usa de fato)
    res.setHeader('Set-Cookie', [
      `decap_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600`
    ]);

    // HTML exato que o Decap espera (popup -> postMessage -> close)
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Auth</title></head>
  <body>
    <script>
      (function () {
        var msg = 'authorization:github:success:' + JSON.stringify({ token: ${JSON.stringify(token)} });
        try {
          if (window.opener) window.opener.postMessage(msg, '*');
        } finally {
          window.close();
        }
      })();
    </script>
  </body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    const html = `<!doctype html>
<html><body><script>
  (function () {
    var msg = 'authorization:github:error:' + JSON.stringify({ message: ${JSON.stringify(e.message)} });
    if (window.opener) window.opener.postMessage(msg, '*');
    window.close();
  })();
</script></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}
