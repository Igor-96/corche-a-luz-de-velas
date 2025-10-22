export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(
`envs:
 GITHUB_CLIENT_ID set: ${!!process.env.GITHUB_CLIENT_ID}
 GITHUB_CLIENT_SECRET length: ${(process.env.GITHUB_CLIENT_SECRET || "").length}
 OAUTH_REDIRECT_URI: ${process.env.OAUTH_REDIRECT_URI}
 url: ${req.url}
`
  );
}
