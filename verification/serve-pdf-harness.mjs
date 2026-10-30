import { createServer } from 'vite';
// Independent local test server. This harness is not an application route and
// is never added to the production build/public directory.
const server = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 5174, strictPort: true } });
await server.listen();
server.printUrls();
