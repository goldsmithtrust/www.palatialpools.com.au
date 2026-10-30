import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  let body = await readFile(join(process.cwd(), 'robots.txt'), 'utf8');
  if (process.env.SHOP_SAME_DOMAIN === '1') {
    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) throw new Error('NEXT_PUBLIC_SITE_URL is required for the shop sitemap');
    body = body.replace(/^Sitemap: .*\/store\/sitemap\.xml\s*$/m, '');
    body += `\nSitemap: ${origin.replace(/\/$/, '')}/shop/sitemap.xml\n`;
  }
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
