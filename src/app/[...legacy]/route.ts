import { readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'application/xml; charset=utf-8', '.pdf': 'application/pdf' };
const ext = (path: string) => path.includes('.') ? path.slice(path.lastIndexOf('.')).toLowerCase() : '.html';

export async function GET(_request: Request, { params }: { params: Promise<{ legacy?: string[] }> }) {
  const { legacy = [] } = await params;
  const safe = normalize(legacy.join('/')).replace(/^\.\.\//, '');
  const root = /*turbopackIgnore: true*/ process.cwd();
  const candidates = [join(root, safe), join(root, safe, 'index.html')];
  for (const file of candidates) {
    if (!file.startsWith(root)) continue;
    try {
      const info = await stat(file);
      if (!info.isFile()) continue;
      const body = await readFile(file);
      return new Response(body, { headers: { 'content-type': types[ext(file)] || 'application/octet-stream' } });
    } catch {}
  }
  return new Response('Not found', { status: 404 });
}
