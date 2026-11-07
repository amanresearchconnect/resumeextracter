import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'local-api-proxy',
        configureServer(server) {
          // Middleware to emulate /api/extract in local development
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/extract' && req.method === 'POST') {
              let rawBody = '';
              req.on('data', chunk => { rawBody += chunk; });
              req.on('end', async () => {
                try {
                  const clientPasscode = req.headers['x-office-passcode'];
                  const requiredPasscode = env.OFFICE_PASSCODE;

                  if (requiredPasscode && clientPasscode !== requiredPasscode) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ 
                      error: 'Unauthorized: Invalid or missing Office Passcode.' 
                    }));
                    return;
                  }

                  const apiKey = env.OPENAI_API_KEY;
                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ 
                      error: 'OPENAI_API_KEY is not defined in your local .env file.' 
                    }));
                    return;
                  }

                  const parsedBody = JSON.parse(rawBody || '{}');
                  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${apiKey.trim()}`
                    },
                    body: JSON.stringify({
                      model: 'gpt-4o-mini',
                      messages: parsedBody.messages,
                      response_format: { type: 'json_object' },
                      temperature: 0.1,
                      max_tokens: 250
                    })
                  });

                  const data = await aiResponse.json();
                  res.statusCode = aiResponse.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal Dev Server Error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    server: {
      host: true,
      port: 5173,
      open: false,
      allowedHosts: true
    },
    preview: {
      host: true,
      port: 5173,
      allowedHosts: true
    }
  }
})
