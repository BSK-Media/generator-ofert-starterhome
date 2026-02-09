import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Vercel Serverless Function
// POST /api/render-pdf { html: string, fileName?: string, mode?: 'raw'|'compressed' }
// Returns: application/pdf

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      res.end('Method Not Allowed');
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const html = body?.html;
    const fileName = body?.fileName || 'oferta.pdf';

    if (!html || typeof html !== 'string') {
      res.statusCode = 400;
      res.end('Missing "html"');
      return;
    }

    const executablePath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Umożliwia ładowanie obrazów z zewnętrznych domen bez ograniczeń canvasa.
    // Wait for network to be idle so that images/fonts have time to load.
    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });

    // Upewnij się, że fonty się załadowały (ważne dla wyrównań)
    try {
      await page.evaluateHandle('document.fonts && document.fonts.ready');
    } catch (_) {}

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await page.close();
    await browser.close();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${String(fileName).replace(/\"/g, '')}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'render_failed', message: String(err?.message || err) }));
  }
}
