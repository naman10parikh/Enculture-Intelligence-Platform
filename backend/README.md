# Enculture Platform Backend

AI-native culture intelligence platform backend built with FastAPI and OpenAI GPT-5 integration.

## Features

- 🤖 **OpenAI GPT-5 Integration**: Advanced AI chat capabilities with streaming responses
- 🌐 **Web Search Tools**: Function calling with web search capabilities for real-time data
- 🎭 **Persona-Aware**: Tailored responses for different user personas (CEO, HR admin, manager, employee)
- 📊 **Survey Generation**: AI-powered survey question generation for culture assessment
- ⚡ **Streaming Responses**: Real-time response streaming for better UX
- 🔒 **Secure Configuration**: Environment-based configuration with secure API key management
- 📝 **Comprehensive Logging**: Structured logging for debugging and monitoring

## Quick Start

### 1. Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
OPENAI_API_KEY=your_openai_api_key_here
ENVIRONMENT=development
DEBUG=True
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173
```

**⚠️ Important**: Never commit your `.env` file to version control. Add it to `.gitignore`.

### 3. Run the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Chat Endpoints

#### Streaming Chat
```http
POST /api/v1/chat/stream
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "How can we improve team engagement?"}
  ],
  "persona": "manager",
  "use_tools": true,
  "stream": true
}
```

#### Complete Chat Response
```http
POST /api/v1/chat/completion
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Analyze our culture survey results"}
  ],
  "persona": "hr_admin"
}
```

#### Generate Survey Questions
```http
POST /api/v1/chat/generate-survey
Content-Type: application/json

{
  "context": "Quarterly team engagement assessment",
  "num_questions": 5,
  "question_types": ["multiple_choice", "rating", "text"],
  "persona": "hr_admin"
}
```

### Health Checks

```http
GET /health
GET /api/v1/chat/health
```

## Architecture

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── chat.py       # Chat API endpoints
│   │       └── router.py         # Main API router
│   ├── core/
│   │   ├── config.py            # Application configuration
│   │   └── logging_config.py    # Logging setup
│   ├── models/
│   │   └── chat.py              # Pydantic models
│   └── services/
│       └── openai_service.py    # OpenAI integration
├── tests/                       # Test files (to be created)
├── main.py                      # FastAPI application entry point
├── requirements.txt             # Python dependencies
└── env.example                  # Environment template
```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-5` |
| `OPENAI_MAX_TOKENS` | Maximum tokens per response | `2048` |
| `OPENAI_TEMPERATURE` | Response creativity (0-1) | `0.7` |
| `ENVIRONMENT` | Environment mode | `development` |
| `DEBUG` | Enable debug mode | `True` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## Persona System

The backend supports persona-aware responses for different user types:

- **CEO**: Strategic insights, high-level culture metrics
- **HR Admin**: Policy recommendations, compliance insights
- **Manager**: Team-specific advice, actionable recommendations
- **Manager's Manager**: Department-level insights, coordination advice
- **Employee**: Personal development, feedback opportunities

## Web Search Integration

The backend includes web search capabilities through OpenAI's function calling:

- Real-time industry trends
- Latest research in organizational culture
- Best practice recommendations
- Current market insights

## Error Handling

The API includes comprehensive error handling:

- Structured error responses
- Detailed logging
- Graceful degradation
- Rate limiting protection

## Security Features

- Environment-based configuration
- CORS protection
- API key security
- Request validation
- Response sanitization

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest

# Run with coverage
pytest --cov=app
```

### Code Quality

```bash
# Format code
black app/

# Check linting
flake8 app/

# Type checking
mypy app/
```

## Deployment

### Docker (Coming Soon)

```bash
# Build image
docker build -t enculture-backend .

# Run container
docker run -p 8000:8000 --env-file .env enculture-backend
```

### Production Considerations

1. **Environment Variables**: Use secure secret management
2. **Database**: Integrate with PostgreSQL or MongoDB
3. **Caching**: Add Redis for response caching
4. **Monitoring**: Implement health checks and metrics
5. **Scaling**: Consider horizontal scaling with load balancers

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Verify your API key is correctly set in `.env`
   - Check if you have sufficient OpenAI credits

2. **CORS Issues**
   - Ensure `FRONTEND_URL` matches your frontend URL
   - Check if additional origins need to be added

3. **Port Already in Use**
   - Change the `PORT` in `.env`
   - Kill existing processes on port 8000

### Logs

Check logs for detailed error information:
```bash
tail -f logs/app.log
```

## Contributing

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Use conventional commits
5. Ensure all tests pass

## Support

For issues and questions:
- Check the logs first
- Review the API documentation
- Create an issue with detailed reproduction steps
