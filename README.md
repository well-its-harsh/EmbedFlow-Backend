
# Embedflow Backend

A powerful, scalable backend service for document management, processing, and AI-driven querying with support for large language models (LLMs), vector databases, and asynchronous job processing.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Project Structure](#project-structure)
- [Services](#services)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Docker](#docker)
- [Authentication](#authentication)

## ✨ Features

- **Document Management**: Upload, process, and manage documents (PDF, TXT, DOCX, MD, CSV)
- **AI-Powered Querying**: Leverage multiple LLM providers (OpenAI, OpenRouter)
- **Vector Database Integration**: Index and search documents using Qdrant
- **API Key Management**: Secure API key generation and tracking for third-party access
- **Asynchronous Processing**: BullMQ-based job queue for document ingestion and processing
- **Object Storage**: MinIO integration for scalable document storage
- **JWT Authentication**: Secure user authentication and authorization
- **Comprehensive Logging**: Winston-based logging for debugging and monitoring
- **RESTful API**: Well-structured v1 API endpoints

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.x
- **ORM**: Prisma 6.x
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Object Storage**: MinIO
- **Vector Database**: Qdrant
- **Job Queue**: BullMQ
- **LLM Integrations**: 
  - LangChain Core
  - OpenAI
  - OpenRouter
- **Code Quality**: ESLint, Prettier
- **Logging**: Winston
- **Security**: bcrypt for password hashing

## 📋 Prerequisites

- **Node.js** v18+ and npm/yarn
- **PostgreSQL** v12+
- **Redis** (for BullMQ job queue)
- **MinIO** (for object storage)
- **Qdrant** (for vector database)
- **Docker & Docker Compose** (optional, for containerized setup)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd embedflow-backend-pseudo_development
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Copy environment variables**
   ```bash
   cp example.env .env
   ```

4. **Configure environment variables** (see [Configuration](#configuration) section)

5. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

## ⚙️ Configuration

Create a `.env` file based on `example.env` with the following variables:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/embedflow_db

# JWT Configuration
JWT_SECRET_TOKEN=your_secret_token_here

# MinIO Object Storage
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_key

# OpenRouter Configuration (optional)
OPENROUTER_API_KEY=your_openrouter_key

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379
```

## 👨‍💻 Development

### Running the Development Server

```bash
# Start the main server with hot reload
npm run dev

# Start the file processing worker
npm run worker-dev

# Start the MinIO BullMQ pipeline
npm run worker-pipeline
```

The server will start on the configured port (default: 3000) and automatically reload on file changes.

### Building for Production

```bash
npm run build
npm start
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## 📁 Project Structure

```
src/
├── api/
│   └── v1/
│       ├── index.ts           # API route aggregator
│       ├── query/             # Query endpoint handlers
│       │   ├── controller.ts
│       │   └── ...
│       └── user/              # User endpoint handlers
├── app.ts                      # Express app configuration
├── config/
│   ├── config.ts              # Main configuration
│   ├── minIOConfig.ts          # MinIO setup
│   ├── openAiConfig.ts         # OpenAI setup
│   ├── openrouterConfig.ts     # OpenRouter setup
│   ├── prisma.config.ts        # Prisma ORM setup
│   ├── qdrantConfig.ts         # Qdrant vector DB setup
│   └── redisConfig.ts          # Redis setup
├── database/
│   └── prisma.ts               # Prisma client instance
├── handlers/
│   ├── error.handler.ts        # Global error handling
│   ├── httpEntry.handler.ts    # HTTP request entry point
│   └── notFound.handler.ts     # 404 handler
├── middlewares/
│   ├── apiAuth.middleware.ts   # API key authentication
│   └── user.auth.middleware.ts # JWT authentication
├── services/
│   ├── apiKey.service.ts       # API key operations
│   ├── file-processing.worker.service.ts  # Document processing
│   ├── logs.service.ts         # Logging utilities
│   ├── minio-bullmq-pipeline.service.ts   # Job queue pipeline
│   ├── model.service.ts        # LLM model operations
│   └── query.service.ts        # Query processing
├── types/
│   └── express.d.ts            # Express type extensions
└── utils/
    ├── auth/
    │   └── jwt.utils.ts        # JWT utilities
    ├── debug/
    │   ├── AppError.ts         # Custom error class
    │   └── logger.ts           # Winston logger
    ├── key/
    │   └── apiAccess.ts        # API access utilities
    ├── llm/
    │   └── llmApi.util.ts      # LLM API utilities
    ├── projects/
    │   └── documents/          # Document utilities
    └── vector-db/
        └── qdrant.util.ts      # Qdrant utilities
```

## 🔧 Services

### File Processing Worker
Asynchronous worker for processing uploaded documents:
```bash
npm run worker-dev
```
Monitors document uploads and handles ingestion into the vector database.

### MinIO BullMQ Pipeline
Manages the job queue for document processing:
```bash
npm run worker-pipeline
```
Orchestrates document flows through the processing pipeline.

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### API v1 Routes
- Base: `/api/v1`
- Routes include:
  - Query management
  - User operations
  - Document processing

*See individual route controllers for detailed endpoint documentation.*

## 🗄️ Database

### Schema Overview

**Users** - System users
**Projects** - User projects/workspaces
**Documents** - Uploaded documents (PDF, TXT, DOCX, MD, CSV)
**ApiKeys** - API key management
**QueryLogs** - Query execution logs
**Models** - Available LLM models

Migrations are managed automatically through Prisma:
```bash
npx prisma migrate dev --name migration_name
npx prisma studio  # Visual database browser
```

## 🐳 Docker

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This includes:
- PostgreSQL database
- Redis
- MinIO
- Qdrant
- Backend application

## 🔐 Authentication

### JWT Token Structure
```json
{
  "sub": "123e4567-e89b-12d3-a456-426614174000",  // user_id
  "exp": 1678886400,                              // expiration timestamp
  "iat": 1678882800,                              // issued at timestamp
  "email": "user@example.com"
}
```

### API Key Structure
- Prefix + Hash format for secure storage
- Track usage and manage expiration

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

Please ensure code follows the established patterns and passes linting:
```bash
npm run lint
npm run format
```