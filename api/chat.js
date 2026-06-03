const https = require('https');

module.exports = async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    // Use native HTTPS payload construction
    const postData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: messages,
      system: `You are a friendly and helpful vendor support assistant for Co-Lab Incubator Kitchens...` // Keep your prompt text here
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const anthropicReq = https.request(options, (anthropicRes) => {
      let data = '';
      anthropicRes.on('data', (chunk) => { data += chunk; });
      
      anthropicRes.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (anthropicRes.statusCode >= 200 && anthropicRes.statusCode < 300) {
            return res.status(200).json(parsedData);
          } else {
            return res.status(anthropicRes.statusCode).json({ error: parsedData.error?.message || 'Anthropic API Error' });
          }
        } catch (e) {
          return res.status(500).json({ error: 'Failed to parse Anthropic response' });
        }
      });
    });

    anthropicReq.on('error', (error) => {
      return res.status(500).json({ error: error.message });
    });

    anthropicReq.write(postData);
    anthropicReq.end();

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
