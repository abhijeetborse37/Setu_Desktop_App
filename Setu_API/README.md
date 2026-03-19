# Setu Business Suite API

## Overview
This is the REST API for the Setu Business Suite - a comprehensive ERP and business management system.

## Authentication
The API uses JWT (JSON Web Token) authentication. All endpoints except login require a valid Bearer token.

### Getting Started with Swagger
1. **Access Swagger UI**: Navigate to `http://localhost:PORT/swagger` (or your deployed URL)
2. **Authenticate**:
   - Click the **"Authorize"** button in Swagger UI
   - Enter your token in the format: `Bearer your-jwt-token-here`
   - Click **"Authorize"**

### Obtaining a JWT Token
1. **Login**: Use the `/api/Auth/login` endpoint with valid credentials
2. **Copy Token**: The response will include a `Token` field
3. **Use Token**: Include this token in the Authorization header for subsequent requests

### Default Admin Credentials
- **Email**: `admin@setu.in`
- **Password**: `Admin@123`
- **Role**: Admin

## API Endpoints

### Authentication
- `POST /api/Auth/login` - User login
- `POST /api/Auth/create-user` - Create new user (Admin only)

### Dashboard
- `GET /api/Dashboard/init` - Get initial dashboard data

### Companies
- `GET /api/Companies` - Get user's companies
- `POST /api/Companies` - Create new company

### Products
- `GET /api/Products/{companyId}` - Get products for company (with pagination)
- `POST /api/Products` - Create new product
- `PUT /api/Products/{id}` - Update product
- `DELETE /api/Products/{id}` - Delete product

### Customers
- `GET /api/Customers/{companyId}` - Get customers for company (with pagination)
- `POST /api/Customers` - Create new customer
- `PUT /api/Customers/{id}` - Update customer
- `DELETE /api/Customers/{id}` - Delete customer

### Transactions
- `GET /api/Transactions/{companyId}` - Get transactions for company (with pagination)
- `POST /api/Transactions` - Create new transaction

### Admin Panel (Admin Only)
- `GET /api/Admin/stats` - Get system statistics
- `GET /api/Admin/users` - Get all users
- `GET /api/Admin/plans` - Get subscription plans
- `POST /api/Admin/plans` - Create new plan
- `PUT /api/Admin/plans/{id}` - Update plan
- `DELETE /api/Admin/plans/{id}` - Delete plan

## Pagination
Several endpoints support pagination using query parameters:
- `pageNumber` (default: 1)
- `pageSize` (default: 50, max: 100)

Example: `GET /api/Products/{companyId}?pageNumber=2&pageSize=25`

## Response Format
All responses follow a consistent structure:
```json
{
  "items": [...],
  "totalCount": 150,
  "pageNumber": 1,
  "pageSize": 50,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

## Error Handling
The API returns appropriate HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Performance Features
- Database query optimization with projections
- Response caching for frequently accessed data
- Pagination to handle large datasets
- Efficient stock calculations
- Batch operations where possible

## Development
- Built with ASP.NET Core
- Uses Entity Framework Core with PostgreSQL
- JWT authentication
- Swagger/OpenAPI documentation
- CORS enabled for frontend integration