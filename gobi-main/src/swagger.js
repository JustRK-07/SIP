const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tenant Management API',
      version: '1.0.0',
      description: 'A comprehensive tenant management API with JWT authentication',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from your authentication system'
        },
      },
      schemas: {
        Tenant: {
          type: 'object',
          required: ['name', 'domain'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique tenant identifier',
              example: 'clx1234567890abcdef'
            },
            name: {
              type: 'string',
              description: 'Tenant name',
              example: 'Example Corp'
            },
            domain: {
              type: 'string',
              description: 'Unique tenant domain',
              example: 'example.com'
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Optional tenant description',
              example: 'A leading technology company'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the tenant is active',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Tenant creation timestamp',
              example: '2023-12-01T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2023-12-01T10:30:00Z'
            },
            contactEmail: {
              type: 'string',
              format: 'email',
              nullable: true,
              description: 'Contact email address',
              example: 'admin@example.com'
            },
            contactPhone: {
              type: 'string',
              nullable: true,
              description: 'Contact phone number',
              example: '+1-555-123-4567'
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Physical address',
              example: '123 Main St, City, State 12345'
            },
            maxUsers: {
              type: 'integer',
              nullable: true,
              description: 'Maximum number of users allowed',
              example: 100
            }
          }
        },
        TenantInput: {
          type: 'object',
          required: ['name', 'domain'],
          properties: {
            tenantId: {
              type: 'string',
              description: 'Optional custom tenant ID. If not provided, one will be auto-generated.',
              example: 'custom-tenant-123'
            },
            name: {
              type: 'string',
              description: 'Tenant name',
              example: 'Example Corp'
            },
            domain: {
              type: 'string',
              description: 'Unique tenant domain',
              example: 'example.com'
            },
            description: {
              type: 'string',
              description: 'Optional tenant description',
              example: 'A leading technology company'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the tenant is active',
              default: true,
              example: true
            },
            contactEmail: {
              type: 'string',
              format: 'email',
              description: 'Contact email address',
              example: 'admin@example.com'
            },
            contactPhone: {
              type: 'string',
              description: 'Contact phone number',
              example: '+1-555-123-4567'
            },
            address: {
              type: 'string',
              description: 'Physical address',
              example: '123 Main St, City, State 12345'
            },
            maxUsers: {
              type: 'integer',
              minimum: 1,
              description: 'Maximum number of users allowed',
              example: 100
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Validation failed'
                },
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Additional error details',
                  example: ['Name is required and must be a non-empty string']
                }
              }
            }
          }
        },
        PaginatedTenants: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Tenant'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 25
                },
                totalPages: {
                  type: 'integer',
                  example: 3
                },
                hasNext: {
                  type: 'boolean',
                  example: true
                },
                hasPrev: {
                  type: 'boolean',
                  example: false
                }
              }
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'OK'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-12-01T10:30:00Z'
            },
            service: {
              type: 'string',
              example: 'Tenant Management API'
            }
          }
        },
        PhoneNumber: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique phone number identifier'
            },
            number: {
              type: 'string',
              description: 'The phone number in international format'
            },
            type: {
              type: 'string',
              enum: ['LOCAL', 'MOBILE', 'TOLL_FREE'],
              description: 'Type of phone number'
            },
            label: {
              type: 'string',
              nullable: true,
              description: 'Optional label for the phone number'
            },
            extension: {
              type: 'string',
              nullable: true,
              description: 'Optional extension'
            },
            provider: {
              type: 'string',
              enum: ['TWILIO'],
              description: 'Phone service provider'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the phone number is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            },
            tenantId: {
              type: 'string',
              description: 'Associated tenant ID'
            },
            tenant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                domain: { type: 'string' }
              }
            }
          }
        },
        PhoneNumberInput: {
          type: 'object',
          required: ['number'],
          properties: {
            number: {
              type: 'string',
              description: 'The phone number'
            },
            type: {
              type: 'string',
              enum: ['LOCAL', 'MOBILE', 'TOLL_FREE'],
              default: 'LOCAL'
            },
            label: {
              type: 'string',
              description: 'Optional label'
            },
            extension: {
              type: 'string',
              description: 'Optional extension'
            },
            provider: {
              type: 'string',
              enum: ['TWILIO'],
              default: 'TWILIO'
            },
            isActive: {
              type: 'boolean',
              default: true
            }
          }
        },
        AvailablePhoneNumber: {
          type: 'object',
          properties: {
            phoneNumber: {
              type: 'string',
              description: 'The phone number',
              example: '+15551234567'
            },
            friendlyName: {
              type: 'string',
              description: 'Human-readable name',
              example: '(555) 123-4567'
            },
            locality: {
              type: 'string',
              description: 'City or locality',
              example: 'San Francisco'
            },
            region: {
              type: 'string',
              description: 'State or region',
              example: 'CA'
            },
            postalCode: {
              type: 'string',
              description: 'Postal code',
              example: '94105'
            },
            country: {
              type: 'string',
              description: 'Country code',
              example: 'US'
            },
            capabilities: {
              type: 'object',
              properties: {
                voice: { type: 'boolean' },
                sms: { type: 'boolean' },
                mms: { type: 'boolean' }
              }
            },
            type: {
              type: 'string',
              enum: ['LOCAL', 'MOBILE', 'TOLL_FREE']
            },
            provider: {
              type: 'string',
              enum: ['TWILIO']
            },
            estimatedCost: {
              type: 'object',
              properties: {
                setup: { type: 'string' },
                monthly: { type: 'string' }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  message: 'Access token required',
                  code: 'MISSING_TOKEN'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  message: 'Insufficient permissions',
                  code: 'INSUFFICIENT_PERMISSIONS'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  message: 'Tenant not found',
                  code: 'TENANT_NOT_FOUND'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: {
                  message: 'Validation failed',
                  code: 'VALIDATION_ERROR',
                  details: ['Name is required and must be a non-empty string']
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/server.js', './src/routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
};