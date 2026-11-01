import http from 'node:http';
import musicApi from './music-api.mjs';
import '../../../packages/common/server/env.mjs';

const port = Number(process.env.PORT || 8082);
const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/v1/')) {
    void musicApi(req, res);
    return;
  }
  res.statusCode = 404;
  res.end('Not found');
});

server.listen(port, '0.0.0.0', () => process.stdout.write(`Guruplay music API listening on ${port}\n`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
