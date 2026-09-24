import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localTripFixture(): Plugin {
  const fixturePath = path.resolve(process.cwd(), '.local', 'trip.json');

  return {
    name: 'private-local-trip-fixture',
    configureServer(server) {
      server.middlewares.use('/__local/trip', (_request, response, next) => {
        if (!fs.existsSync(fixturePath)) {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(fs.readFileSync(fixturePath, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), localTripFixture()],
});
