# GOBI Backend API

AI-powered voice agent platform with LiveKit integration for real-time SIP calling and automated outbound/inbound campaigns.

## Features

- 🤖 **AI Voice Agents**: Create and deploy AI agents with configurable models, voices, and prompts
- 📞 **Campaign Management**: Inbound/Outbound call campaigns with agent and lead list assignment
- 📋 **Lead List Management**: Import leads via CSV, organize contacts, assign to campaigns
- ☎️ **Phone Number Provisioning**: Purchase and manage SIP phone numbers
- 💓 **Agent Heartbeat Monitoring**: Real-time agent status with automatic timeout detection (90s)
- 🔗 **LiveKit Integration**: SIP trunk creation and dispatch rule management
- 🏢 **Multi-tenancy**: Tenant-scoped data isolation
- 🔐 **JWT Authentication**: Secure token-based authentication
- 🗄️ **PostgreSQL Database**: Robust data persistence with Prisma ORM
- 📊 **Analytics Ready**: Call metrics, agent performance tracking

## Tech Stack

- **Runtime**: Node.js (Latest)
- **Framework**: Express.js (Latest)
- **Database**: PostgreSQL
- **ORM**: Prisma (Latest)
- **Authentication**: JWT with RSA public key validation
- **Security**: Helmet, CORS
- **Logging**: Morgan

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Tenant Management
- `GET /api/tenants` - List tenants (with pagination & filtering)
- `GET /api/tenants/:id` - Get specific tenant
- `POST /api/tenants` - Create tenant (admin/tenant-manager only)
- `PUT /api/tenants/:id` - Update tenant (admin/tenant-manager only)
- `DELETE /api/tenants/:id` - Delete/deactivate tenant (admin only)
- `PATCH /api/tenants/:id/activate` - Reactivate tenant (admin/tenant-manager only)

### Phone Number Management
- `GET /api/tenants/:id/phone-numbers/available` - List purchaseable numbers from Twilio
- `GET /api/tenants/:id/phone-numbers` - List phone numbers for a tenant
- `GET /api/tenants/:id/phone-numbers/:phoneId` - Get specific phone number
- `POST /api/tenants/:id/phone-numbers` - Purchase and add phone number to tenant
- `PUT /api/tenants/:id/phone-numbers/:phoneId` - Update phone number
- `DELETE /api/tenants/:id/phone-numbers/:phoneId` - Delete/deactivate phone number

## API Documentation

The API includes comprehensive **Swagger/OpenAPI 3.0** documentation with an interactive interface.

### Accessing the Documentation

Once the server is running, visit:
- **Interactive Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON Spec**: `http://localhost:3000/api-docs/swagger.json`

### Features

- 📖 **Complete API Reference**: All endpoints documented with parameters, request/response schemas
- 🧪 **Interactive Testing**: Test endpoints directly from the documentation interface  
- 🔐 **Authentication Support**: Built-in JWT token authentication for testing protected endpoints
- 📝 **Request Examples**: Sample requests and responses for all operations
- 🏷️ **Organized by Tags**: Endpoints grouped by functionality (Tenants, System)
- ⚡ **Real-time**: Documentation automatically reflects code changes

### Using the Interactive Documentation

1. Navigate to `/api-docs` in your browser
2. Click on any endpoint to expand details
3. For protected endpoints, click "Authorize" and enter your JWT token
4. Use "Try it out" to test endpoints with sample data
5. View response schemas and status codes

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd gobi

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env .env

# Edit .env with your configuration
nano .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_PUBLIC_KEY`: X.509 certificate or RSA public key for JWT validation
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID (for phone number management)
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token (for phone number management)
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origins

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Optional: Open Prisma Studio
npm run db:studio
```

### 4. Start the Application

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 5. Test the Setup

```bash
# Run the test script
node test-endpoints.js
```

## Authentication

The API uses JWT tokens for authentication. Tokens are validated using a public key that is automatically extracted from either an X.509 certificate or a direct RSA public key configured in the environment.

### Public Key Configuration

The `JWT_PUBLIC_KEY` environment variable supports two formats:

1. **X.509 Certificate** (recommended for production):
   ```
   -----BEGIN CERTIFICATE-----
   MIIDfzCCAmegAwIBAgIEV4UH/jANBgkqhkiG9w0BAQsFADBw...
   -----END CERTIFICATE-----
   ```

2. **RSA Public Key** (for backward compatibility):
   ```
   -----BEGIN PUBLIC KEY-----
   MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
   -----END PUBLIC KEY-----
   ```

The system automatically detects the format and extracts the public key from certificates when needed.

### Token Requirements

- **Algorithm**: RS256 (RSA with SHA-256)
- **Header**: `Authorization: Bearer <token>`
- **Claims**: The token should include user information and roles

### Expected JWT Claims

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "roles": ["admin", "tenant-manager"],
  "permissions": ["read:tenants", "write:tenants"],
  "tenant_id": "tenant_id_here",
  "acct": "00000000-0000-0000-0000-000000000000"
}
```

**Important**: All tenant management endpoints now require the JWT token to contain an `acct` field with the specific value `"00000000-0000-0000-0000-000000000000"`. Requests with any other account ID or missing account information will be rejected with a 403 Forbidden response.

### Roles

- **admin**: Full access to all operations including permanent deletion
- **tenant-manager**: Can create, read, update, and soft delete tenants
- **user**: Read-only access (if no roles specified, authentication still required)

## API Usage Examples

### List Tenants with Filtering

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  "http://localhost:3000/api/tenants?page=1&limit=10&search=example&isActive=true&sortBy=name&sortOrder=asc"
```

### Create a Tenant

```bash
curl -X POST \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Corp",
    "domain": "example.com",
    "description": "Example company",
    "contactEmail": "admin@example.com",
    "maxUsers": 100
  }' \
  http://localhost:3000/api/tenants
```

### Update a Tenant

```bash
curl -X PUT \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Example Corp",
    "maxUsers": 200
  }' \
  http://localhost:3000/api/tenants/<tenant-id>
```

### Phone Number Management Examples

#### List Available Numbers from Twilio

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  "http://localhost:3000/api/tenants/<tenant-id>/phone-numbers/available?type=LOCAL&areaCode=555&limit=10"
```

#### Search Toll-Free Numbers

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  "http://localhost:3000/api/tenants/<tenant-id>/phone-numbers/available?type=TOLL_FREE&limit=5"
```

#### Purchase and Add a Phone Number to a Tenant

**Important**: This endpoint purchases the phone number from Twilio before adding it to your tenant. Ensure the number is available and your Twilio account has sufficient balance.

```bash
curl -X POST \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "+15551234567",
    "type": "LOCAL",
    "label": "Main Office",
    "provider": "TWILIO"
  }' \
  http://localhost:3000/api/tenants/<tenant-id>/phone-numbers
```

**Successful Response:**
```json
{
  "data": {
    "id": "clx1234567890",
    "number": "+1 555 123 4567",
    "type": "LOCAL",
    "label": "Main Office",
    "provider": "TWILIO",
    "isActive": true,
    "tenantId": "tenant-123",
    "createdAt": "2025-01-20T12:00:00Z"
  },
  "message": "Phone number purchased and created successfully",
  "twilio": {
    "sid": "PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "status": "in-use",
    "dateCreated": "2025-01-20T12:00:00Z"
  }
}
```

**Error Response (Number Not Available):**
```json
{
  "error": {
    "message": "Phone number is no longer available for purchase",
    "code": "NUMBER_NOT_AVAILABLE",
    "details": "The phone number is not available",
    "twilioCode": 21452
  }
}
```

#### List Tenant Phone Numbers

```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
  "http://localhost:3000/api/tenants/<tenant-id>/phone-numbers?isActive=true"
```

## Database Schema

### Tenant Model

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  domain      String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Contact information
  contactEmail String?
  contactPhone String?
  address      String?
  maxUsers     Int?     @default(100)
  
  @@map("tenants")
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": ["Additional error details"]
  }
}
```

### Common Error Codes

- `MISSING_TOKEN`: No authorization token provided
- `INVALID_TOKEN`: Token is invalid or malformed
- `TOKEN_EXPIRED`: Token has expired
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `TENANT_NOT_FOUND`: Requested tenant doesn't exist
- `DOMAIN_EXISTS`: Domain already in use
- `VALIDATION_ERROR`: Request data validation failed

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin request handling
- **Input Validation**: Request data validation
- **Rate Limiting**: Built-in Express rate limiting
- **Graceful Shutdown**: Proper cleanup on termination

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio

### Project Structure

```
src/
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── routes/
│   └── tenants.js       # Tenant management routes
└── server.js            # Main application server

prisma/
└── schema.prisma        # Database schema

.env.example             # Environment configuration template
test-endpoints.js        # Basic endpoint testing
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License

## Support

For support, please check the documentation or create an issue in the repository.