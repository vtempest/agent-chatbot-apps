import os
import anthropic

from flask import Flask, request

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'

@app.route('/get')
def get():
  # full_message = prompt + content --> sent in full.
  # This is meant to be used as an internal server.
  full_message = request.args.get('full_message', 'long form text here.')
  client = anthropic.Anthropic(
      # This is the default and can be omitted
      api_key=os.environ.get("ANTHROPIC_API_KEY"),
  )

  message = client.messages.create(
      model="claude-3-5-sonnet-20241022",
      max_tokens=1000,
      temperature=0,
      system="You are summarizing long text.",
      messages=[
          {
              "role": "user",
              "content": [
                  {
                      "type": "text",
                      "text": msg
                  }
              ]
          }
      ]
  )

  # print(message.content[0].text)
  return message.content[0].text

if __name__ == '__main__':
    app.run()

