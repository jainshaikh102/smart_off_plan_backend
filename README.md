# Smart Off Plan Backend API

A robust Node.js + Express + TypeScript backend API for the Smart Off Plan real estate platform.

## 🚀 Features

- **RESTful API** - Clean and intuitive API endpoints
- **TypeScript** - Full type safety and better developer experience
- **CORS Support** - Configured for frontend communication
- **Input Validation** - Request validation using Joi
- **Error Handling** - Comprehensive error handling and logging
- **Rate Limiting** - Protection against abuse
- **Security** - Helmet.js for security headers
- **Compression** - Response compression for better performance

## 📁 Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── validation/      # Input validation schemas
└── server.ts        # Main server file
```

## 🛠️ Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd smart-off-plan-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health information

### Properties
- `GET /api/properties` - Get all properties with filtering and pagination
- `GET /api/properties/:id` - Get property by ID
- `GET /api/properties/search?q=term` - Search properties
- `GET /api/properties/stats` - Get properties statistics

### Query Parameters for `/api/properties`

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50, max: 100) |
| `sort` | string | Sort order: `completion_asc`, `completion_desc`, `price_asc`, `price_desc`, `name_asc`, `name_desc` |
| `area` | string | Filter by area/location |
| `developer` | string | Filter by developer |
| `status` | string | Filter by status |
| `min_price` | number | Minimum price filter |
| `max_price` | number | Maximum price filter |

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run clean    # Clean build directory
```

### Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# External API Configuration
EXTERNAL_API_BASE_URL=https://api.reelly.io
EXTERNAL_API_KEY=your_api_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🌐 Frontend Integration

The backend is configured to work with your Next.js frontend. Update your frontend's API calls to point to:

```typescript
// Instead of calling external API directly
const response = await axios.get('/api/properties');

// Or if calling backend directly
const response = await axios.get('http://localhost:5000/api/properties');
```

## 📊 Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": [...],
  "message": "Success message",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Error description"
}
```

## 🚀 Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Deploy to your preferred platform:**
   - Heroku
   - Railway
   - DigitalOcean
   - AWS
   - Vercel

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request rate limiting
- **Input Validation** - Request validation
- **Error Handling** - Secure error responses

## 📝 License

MIT License - see LICENSE file for details.
