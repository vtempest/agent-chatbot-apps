const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const ANTHROPIC_API_KEY = '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';

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function sendMessageToClaude(message) {
  const url = 'https://api.anthropic.com/v1/messages';
  
  const requestBody = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: message
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

app.get('/', async (req, res) => {
  try {
    const message = req.query.msg;
    const response = await sendMessageToClaude(message);
    res.status(200).send(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});