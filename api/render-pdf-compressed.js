import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';

// Vercel Serverless Function
// POST /api/render-pdf-compressed
// Body: { html: string, fileName?: string, renderScale?: number, jpegQuality?: number }
// Returns: application/pdf (rasterized / flattened)

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// A4 size in PDF points
const A4_W = 595.28;
const A4_H = 841.89;

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
    const fileName = body?.fileName || 'oferta_skompresowana.pdf';
    const renderScale = clamp(Number(body?.renderScale ?? 2) || 2, 1, 3);
    const jpegQuality = clamp(Number(body?.jpegQuality ?? 0.85) || 0.85, 0.2, 1);

    if (!html || typeof html !== 'string') {
      res.statusCode = 400;
      res.end('Missing "html"');
      return;
    }

    const executablePath = await chromium.executablePath;
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // A4 in CSS pixels at 96DPI is ~794x1123
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: renderScale,
    });

    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });

    // Make sure fonts are ready (important for layout)
    try {
      await page.evaluateHandle('document.fonts && document.fonts.ready');
    } catch (_) {}

    const pageEls = await page.$$('.a4-page');

    const pdfDoc = await PDFDocument.create();

    const targets = pageEls.length ? pageEls : [await page.$('body')];
    for (const el of targets) {
      if (!el) continue;
      const jpgBytes = await el.screenshot({
        type: 'jpeg',
        quality: Math.round(jpegQuality * 100),
        omitBackground: false,
      });

      const jpgImage = await pdfDoc.embedJpg(jpgBytes);
      const pdfPage = pdfDoc.addPage([A4_W, A4_H]);
      pdfPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: A4_W,
        height: A4_H,
      });
    }

    const pdfBytes = await pdfDoc.save();

    await page.close();
    await browser.close();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${String(fileName).replace(/\"/g, '')}"`);
    res.end(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'render_failed', message: String(err?.message || err) }));
  }
}
