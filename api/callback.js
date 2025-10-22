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

    // Cookie de fallback (não é obrigatório para o Decap, mas ajuda)
    res.setHeader('Set-Cookie', [
      `decap_token=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=3600`
    ]);

    // Resposta no formato esperado pelo Decap CMS (popup -> postMessage -> close)
    const payload = JSON.stringify({ token, provider: 'github' });
    const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Auth</title></head>
  <body>
    <script>
      (function () {
        function send(status, data) {
          var msg = 'authorization:github:' + status + ':' + JSON.stringify(data);
          // envia para a janela que abriu o popup
          if (window.opener) {
            window.opener.postMessage(msg, '*');
          }
          window.close();
        }
        try {
          var data = ${payload};
          send('success', data);
        } catch (e) {
          send('error', {message: e && e.message ? e.message : 'unknown'});
        }
      })();
    </script>
  </body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    // Também devolve HTML de erro no formato que o Decap entende
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
