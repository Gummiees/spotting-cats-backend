# Backend Project

A modern Node.js backend API with Express.js, TypeScript, and MVC architecture.

## Features

- **TypeScript**: Full TypeScript support with strict type checking
- **MVC Architecture**: Clean separation of concerns with Models, Views (Controllers), and Services
- **Express.js**: Fast, unopinionated web framework
- **CORS Support**: Cross-origin resource sharing enabled
- **Error Handling**: Comprehensive error handling middleware
- **Environment Configuration**: Environment variable management
- **Health Checks**: Built-in health monitoring endpoints
- **Request Logging**: Automatic request logging
- **Graceful Shutdown**: Proper server shutdown handling

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers (MVC Controllers)
├── middleware/      # Express middleware
├── models/          # Data models (MVC Models)
├── routes/          # Route definitions
├── services/        # Business logic (MVC Services)
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## Development

### Development mode (with auto-restart):
```bash
npm run dev
```

### Build the project:
```bash
npm run build
```

### Production mode:
```bash
npm start
```

### Clean build artifacts:
```bash
npm run clean
```

## API Endpoints

### Root
- **GET** `/` - Welcome message

### Hello World
- **GET** `/api/hello` - Hello World message
- **GET** `/api/hello?name=John` - Personalized hello message
- **GET** `/api/hello/welcome` - Welcome message

### Health Check
- **GET** `/api/health` - Basic health status
- **GET** `/api/health/detailed` - Detailed health with service status

## Example Responses

### Hello World Endpoint
```json
{
  "success": true,
  "message": "Hello message retrieved successfully",
  "data": {
    "message": "Hello World!",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "status": "success"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Health Check Endpoint
```json
{
  "success": true,
  "message": "Health check successful",
  "data": {
    "status": "OK",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "uptime": 123.456,
    "version": "1.0.0",
    "environment": "development"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Dependencies

### Production
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management

### Development
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `@types/express`: Express type definitions
- `@types/cors`: CORS type definitions
- `ts-node`: TypeScript execution engine
- `nodemon`: Auto-restart server during development

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- Path mapping for clean imports
- Source maps for debugging
- Declaration files generation
- Strict null checks and function types

## Architecture

### MVC Pattern
- **Models**: Data structures and database interactions (to be implemented)
- **Views**: API responses (handled by controllers)
- **Controllers**: Request handling and response formatting
- **Services**: Business logic and external service interactions

### Middleware Stack
1. CORS handling
2. Body parsing
3. Request logging
4. Route handling
5. Error handling
6. 404 handling

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGIN` | `*` | CORS origin setting | 