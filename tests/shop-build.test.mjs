import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const origin = 'https://palatialpools.com.au';
const script = '<script defer src="/assets/pp-shop-navigation.js"></script>';

function command(args, env) {
  const child = spawn(process.execPath, [next, ...args], {
    cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-16000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-16000); });
  const done = once(child, 'exit');
  return { child, done, output: () => output };
}

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function stop(process) {
  if (process.child.exitCode !== null) return;
  process.child.kill('SIGTERM');
  const timer = setTimeout(() => process.child.kill('SIGKILL'), 5000);
  try { await process.done; } finally { clearTimeout(timer); }
}

// Exercise real compiled route handlers: importing TS directly cannot reproduce
// Next's env inlining or the redirects persisted in routes-manifest.json.
test('production builds keep redirects, navigation and robots on the build-time mode', { timeout: 300000 }, async t => {
  const originalRobots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  const originalSitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  for (const enabled of [true, false]) {
    await t.test(`build SHOP_SAME_DOMAIN=${enabled ? '1' : '0'}`, async t => {
      const build = command(['build'], { SHOP_SAME_DOMAIN: enabled ? '1' : '0', NEXT_PUBLIC_SITE_URL: origin });
      try {
        const [code] = await build.done;
        assert.equal(code, 0, build.output());
      } finally { await stop(build); }

      for (const runtimeFlag of [undefined, '0', '1']) {
        await t.test(`runtime SHOP_SAME_DOMAIN=${runtimeFlag ?? '(unset)'}`, async () => {
          const port = await freePort();
          // Omit NEXT_PUBLIC_SITE_URL too: the canonical sitemap origin must
          // remain the one embedded during the build.
          const runtimeEnv = { SHOP_SAME_DOMAIN: runtimeFlag, NEXT_PUBLIC_SITE_URL: undefined };
          const server = command(['start', '-H', '127.0.0.1', '-p', String(port)], runtimeEnv);
          const get = path => fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
          try {
            let ready = false;
            for (let attempt = 0; attempt < 200; attempt++) {
              assert.equal(server.child.exitCode, null, server.output());
              try { ready = (await get('/')).status === 200; } catch {}
              if (ready) break;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            assert.ok(ready, server.output());
            for (const path of ['/', '/abbotsford-pool-maintenance']) {
              const response = await get(path);
              assert.equal(response.status, 200);
              const html = await response.text();
              const original = await readFile(new URL(path === '/' ? '../index.html' : '../abbotsford-pool-maintenance/index.html', import.meta.url), 'utf8');
              assert.equal(html.includes(script), enabled, path);
              assert.equal(html.replace(script, ''), original, 'only the opt-in script may change HTML');
            }
            const robots = await get('/robots.txt');
            assert.equal(robots.status, 200);
            const body = await robots.text();
            assert.equal(body, enabled
              ? originalRobots.replace(/^Sitemap: .*\/store\/sitemap\.xml\s*$/m, '') + `\nSitemap: ${origin}/shop/sitemap.xml\n`
              : originalRobots);
            assert.equal(await (await get('/sitemap.xml')).text(), originalSitemap);
            assert.equal(await (await get('/assets/pp-shop-navigation.js')).text(), await readFile(new URL('../assets/pp-shop-navigation.js', import.meta.url), 'utf8'));
            for (const path of ['/store', '/store/pumps?brand=Neptune', '/shop', '/shop/checkout?order=test']) {
              const response = await get(path);
              if (enabled && path.startsWith('/shop')) {
                // No store app is started here. The edge must own these URLs;
                // marketing must neither redirect nor return a 200 fallback.
                assert.equal(response.status, 404, path);
                assert.equal(response.headers.get('location'), null);
              } else {
                assert.equal(response.status, enabled ? 307 : 308, path);
                const destination = new URL(response.headers.get('location'), origin);
                assert.equal(destination.origin, enabled ? origin : 'https://palatial.store');
                assert.equal(destination.pathname, enabled ? path.split('?')[0].replace(/^\/store/, '/shop') : '/');
                assert.equal(destination.search, path.includes('?') ? '?' + path.split('?')[1] : '');
              }
            }
          } finally { await stop(server); }
        });
      }
    });
  }
});
