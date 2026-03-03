# System Prompt
Act as a senior backend engineer documenting secure production API integration.

# API Documentation

## Speech Recognition Support

- Web Speech API
- Whisper API
- Cloud Speech APIs

---

## AI Optimization API

POST /optimize-prompt

Request:
{
  "raw_text": "user input"
}

Response:
{
  "optimized_prompt": "structured prompt"
}

---

## Security

- API keys stored in environment variables
- No client-side exposure
- HTTPS enforced
- Rate limiting enabled
- Input validation middleware