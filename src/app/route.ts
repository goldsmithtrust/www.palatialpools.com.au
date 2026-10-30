import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { withShopNavigation } from '@/lib/shop-navigation';

export async function GET() {
  const html = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), 'index.html'), 'utf8');
  return new Response(withShopNavigation(html), { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
