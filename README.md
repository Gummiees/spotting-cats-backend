# Backend Project

A modern Node.js backend API with Express.js, TypeScript, MongoDB, Redis cache, and clean service separation.

## Features

- **TypeScript**: Full TypeScript support with strict type checking
- **MVC Architecture**: Clean separation of concerns with Models, Controllers, and Services
- **Express.js**: Fast, unopinionated web framework
- **MongoDB**: Flexible, scalable NoSQL database
- **Redis Cache**: High-performance caching layer for fast reads
- **Service Separation**: Interface, database, and cache service layers
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
├── controllers/     # Request handlers (Controllers)
├── middleware/      # Express middleware
├── models/          # Data models
├── routes/          # Route definitions
├── services/
│   ├── interfaces/      # Service interfaces (contracts)
│   ├── implementations/ # Service implementations (DB, cache)
│   └── ...              # Main service entry points
├── types/           # TypeScript type definitions
├── utils/           # Utility functions (MongoDB, Redis, etc.)
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
CORS_ORIGINS=http://localhost:8000,https://spottingcats.com
MONGO_URL=mongodb://localhost:27017/your-db
MONGO_DB_NAME=your-db
REDIS_URL=redis://localhost:6379
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
- **GET** `/api/health/database` - Database and cache status

### Cat CRUD (MongoDB + Redis cache)
- **POST** `/api/cats` - Create a cat
- **GET** `/api/cats` - List all cats (cached)
- **GET** `/api/cats/:id` - Get a cat by ID (cached)
- **PUT** `/api/cats/:id` - Update a cat
- **DELETE** `/api/cats/:id` - Delete a cat

### Cache Management
- **POST** `/api/cache/flush` - Flush all cache
- **GET** `/api/cache/:key` - Get cache info
- **POST** `/api/cache/:key` - Set cache value
- **DELETE** `/api/cache/:key` - Delete cache key

## Example Responses

### Cat List Endpoint
```json
[
  {
    "_id": "...",
    "name": "Whiskers",
    "age": 2,
    "breed": "Tabby"
  }
]
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

### Database & Cache Status
```json
{
  "success": true,
  "message": "Database status retrieved",
  "data": {
    "available": true,
    "configured": true,
    "databaseName": "your-db",
    "redis": {
      "configured": true,
      "available": true
    }
  }
}
```

## Dependencies

### Production
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `mongodb`: MongoDB driver
- `redis`: Redis client

### Development
- `typescript`: TypeScript compiler
- `@types/node`: Node.js type definitions
- `@types/express`: Express type definitions
- `@types/cors`: CORS type definitions
- `@types/mongodb`: MongoDB type definitions
- `ts-node`: TypeScript execution engine
- `nodemon`: Auto-restart server during development

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- Path mapping for clean imports
- Source maps for debugging
- Declaration files generation
- Strict null checks and function types

## Architecture

### Service Separation Pattern
- **Interface Layer**: Defines contracts for services (e.g., `ICatService`)
- **Database Layer**: Handles MongoDB operations (e.g., `CatDatabaseService`)
- **Cache Layer**: Handles Redis caching and wraps the database service (e.g., `CatCacheService`)
- **Main Service**: Exposes the cache service as the main entry point (e.g., `CatService`)

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
| `CORS_ORIGINS` | `*` | CORS origin setting |
| `MONGO_URL` | | MongoDB connection string |
| `MONGO_DB_NAME` | | MongoDB database name |
| `REDIS_URL` | | Redis connection string | 