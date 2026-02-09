// Simple image proxy to make client-side compression more reliable.
// GET /api/proxy-image?url=https%3A%2F%2F...

export default async function handler(req, res) {
  try {
    const u = req.query?.url;
    if (!u) {
      res.statusCode = 400;
      res.end('Missing url');
      return;
    }

    const url = decodeURIComponent(Array.isArray(u) ? u[0] : u);
    // Basic allow-list: only http(s)
    if (!/^https?:\/\//i.test(url)) {
      res.statusCode = 400;
      res.end('Invalid url');
      return;
    }

    const r = await fetch(url, {
      // Some CDNs require a User-Agent
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; StarterHomePDF/1.0)',
        'accept': 'image/*,*/*;q=0.8',
      },
    });

    if (!r.ok) {
      res.statusCode = r.status;
      res.end(`Upstream error: ${r.status}`);
      return;
    }

    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await r.arrayBuffer());

    res.statusCode = 200;
    res.setHeader('Content-Type', ct);
    // Cache a bit on Vercel edge
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.end(buf);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Proxy failed');
  }
}
