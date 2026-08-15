import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

export const dynamic = 'force-dynamic';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string[] }> },
) {
  const { asset } = await params;
  const assetRoot = join(process.cwd(), 'assets');
  const safePath = normalize(asset.join('/')).replace(/^(\.\.\/)+/, '');
  const filePath = join(assetRoot, safePath);

  if (!filePath.startsWith(assetRoot)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response('Not found', { status: 404 });
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'content-type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
