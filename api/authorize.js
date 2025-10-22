export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: process.env.GITHUB_SCOPE || 'public_repo',
    redirect_uri: process.env.OAUTH_REDIRECT_URI, // https://crochealuzdevelas.vercel.app/api/callback
  });
  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`
  });
  res.end();
}
