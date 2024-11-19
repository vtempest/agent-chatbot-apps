const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const app = express();
const port = 3000;

app.use(bodyParser.json());

async function sendMessageToGroq(message) {
  const url = 'https://api.anthropic.com/v1/messages';
  
  const requestBody = {
    model: 'groq-3-5-sonnet-20241022',
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
    const response = await sendMessageToGroq(message);
    res.status(200).send(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});