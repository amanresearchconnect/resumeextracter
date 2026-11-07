/**
 * Vercel Serverless Function: AI Resume Contact Extraction Proxy
 * 
 * - Securely holds OPENAI_API_KEY on the server (never exposed to browser)
 * - Restricts access using an optional OFFICE_PASSCODE header
 * - 0ms cold starts via Vercel micro-functions
 */

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Verify Office Passcode if configured on Vercel
  const requiredPasscode = process.env.OFFICE_PASSCODE;
  const clientPasscode = req.headers['x-office-passcode'] || req.headers['X-Office-Passcode'];

  if (requiredPasscode && clientPasscode !== requiredPasscode) {
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or missing Office Passcode. Please enter the valid company passcode to run AI extraction.' 
    });
  }

  // 2. Retrieve OpenAI API key from server environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Server Misconfiguration: OPENAI_API_KEY is not configured in Vercel Environment Variables.' 
    });
  }

  try {
    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Bad Request: "messages" array is required.' });
    }

    // 3. Forward request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 250
      })
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'OpenAI Rate Limit hit. Please wait a moment and retry.' });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: errorData.error?.message || `OpenAI returned error HTTP ${response.status}` 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API Proxy Error]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

