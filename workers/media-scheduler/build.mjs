import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = join(root, '.cloudflare/output/v1');
const worker = join(output, 'workers/default');
await mkdir(join(worker, 'bundle'), { recursive: true });
await copyFile(join(root, 'index.mjs'), join(worker, 'bundle/index.mjs'));
await writeFile(join(output, 'config.json'), JSON.stringify({
  settings: { accountId: 'a63d41de6d0e837221469839ce7dc097' },
  buildContext: { isPreview: false },
}, null, 2));
await writeFile(join(worker, 'worker.config.json'), JSON.stringify({
  name: 'guruplay-media-scheduler',
  compatibilityDate: '2026-11-22',
  workersDev: true,
  previewUrls: false,
  triggers: [{ type: 'scheduled', schedule: '*/2 * * * *' }],
  observability: {
    enabled: true,
    logs: { enabled: true, invocationLogs: true },
    traces: { enabled: true },
  },
  manifest: { type: 'complete', mainModule: 'index.mjs', modules: { 'index.mjs': { type: 'esm' } } },
}, null, 2));
console.info('Built the dependency-free media scheduler.');
