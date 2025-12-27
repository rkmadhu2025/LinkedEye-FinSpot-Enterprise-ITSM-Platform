# LinkedEye-FinSpot Enterprise ITSM Platform

A production-ready IT Service Management (ITSM) platform built for enterprise scale, featuring incident management, change management, asset management (CMDB), and advanced analytics.

## Features

- **Dashboard**: Real-time metrics, SLA tracking, AI-powered insights
- **Incident Management**: Full lifecycle tracking, SLA timers, priority matrix, AI recommendations
- **Change Management**: CAB workflows, calendar view, approval tracking, freeze windows
- **Asset Management (CMDB)**: Configuration item tracking, relationships, performance metrics
- **Group & Role Management**: Team management, permissions, assignment rules
- **Reports & Analytics**: Pre-built templates, custom report builder, scheduled exports
- **Admin Settings**: SLA configuration, notifications, API keys, security settings

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (no framework dependencies)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with UUID support
- **Authentication**: JWT with refresh tokens

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/linkedeye-finspot.git
cd linkedeye-finspot
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Database Setup

Create a PostgreSQL database and run the schema:

```bash
# Create database
createdb linkedeye_finspot

# Run schema
psql -d linkedeye_finspot -f database/schema.sql
```

Or connect to your database and run:

```sql
\i database/schema.sql
```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/linkedeye_finspot
DB_HOST=localhost
DB_PORT=5432
DB_NAME=linkedeye_finspot
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Email (optional)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password
FROM_EMAIL=noreply@linkedeye.finspot.in

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx

# PagerDuty Integration (optional)
PAGERDUTY_API_KEY=your-pagerduty-key
```

### 5. Start the Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 6. Serve the Frontend

For development, you can use any static file server:

```bash
# Using Python
cd frontend
python -m http.server 8080

# Using Node.js serve
npx serve frontend -p 8080

# Using VS Code Live Server extension
# Right-click index.html -> Open with Live Server
```

For production, configure nginx or your preferred web server.

## Project Structure

```
linkedeye-finspot/
├── backend/
│   ├── server.js           # Main server entry point
│   ├── routes/
│   │   ├── auth.js         # Authentication endpoints
│   │   ├── incidents.js    # Incident management API
│   │   ├── changes.js      # Change management API
│   │   ├── assets.js       # Asset/CMDB API
│   │   ├── groups.js       # Group management API
│   │   └── settings.js     # Settings API
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── design-system.css   # Core design system
│   ├── js/
│   │   ├── api.js          # API service layer
│   │   ├── layout.js       # Layout components
│   │   └── settings.js     # Settings utilities
│   ├── index.html          # Login page
│   ├── register.html       # Registration page
│   ├── dashboard.html      # Main dashboard
│   ├── incidents.html      # Incident list
│   ├── incident-detail.html
│   ├── incident-create.html
│   ├── changes.html        # Change calendar
│   ├── change-detail.html
│   ├── change-create.html
│   ├── assets.html         # Asset list (CMDB)
│   ├── asset-detail.html
│   ├── asset-create.html
│   ├── groups.html         # Group management
│   ├── settings.html       # Admin settings
│   └── reports.html        # Reports & analytics
├── database/
│   └── schema.sql          # PostgreSQL schema
└── reference/              # UI reference files
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Incidents
- `GET /api/incidents` - List incidents
- `GET /api/incidents/:id` - Get incident details
- `POST /api/incidents` - Create incident
- `PUT /api/incidents/:id` - Update incident
- `POST /api/incidents/:id/comments` - Add comment
- `PUT /api/incidents/:id/assign` - Assign incident
- `PUT /api/incidents/:id/resolve` - Resolve incident

### Changes
- `GET /api/changes` - List changes
- `GET /api/changes/calendar` - Get calendar view
- `GET /api/changes/:id` - Get change details
- `POST /api/changes` - Create change
- `PUT /api/changes/:id` - Update change
- `POST /api/changes/:id/approve` - Approve change

### Assets
- `GET /api/assets` - List assets
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset
- `POST /api/assets/import` - Import assets from file

### Groups
- `GET /api/groups` - List groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `POST /api/groups/:id/members` - Add member
- `DELETE /api/groups/:id/members/:userId` - Remove member

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/sla` - Get SLA configuration
- `PUT /api/settings/sla` - Update SLA configuration

## Default Credentials

After initial setup, use these credentials to log in:

- **Email**: admin@linkedeye.finspot.in
- **Password**: admin123

**Important**: Change the default password immediately after first login.

## Configuration

### SLA Configuration

Default SLA settings can be modified in the Admin Settings page:

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| P1 (Critical) | 15 minutes | 4 hours |
| P2 (High) | 30 minutes | 8 hours |
| P3 (Medium) | 2 hours | 24 hours |
| P4 (Low) | 8 hours | 72 hours |

### Environment Configuration

The platform supports multiple environments:
- `fs-mum-indmoney-prod-le` - Mumbai Production
- `fs-dx-le` - FinSpot DX
- `neo-prod-le` - Neo Production
- `pl-prod-le` - PL Production
- `fs-dr-le` - DR Environment

## Production Deployment

### Using Docker

```dockerfile
# Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name linkedeye.yourdomain.com;

    # Frontend
    location / {
        root /var/www/linkedeye/frontend;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 Process Management

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start backend/server.js --name linkedeye-api

# Enable startup script
pm2 startup
pm2 save
```

## Security Considerations

1. **JWT Secrets**: Use strong, random secrets (minimum 32 characters)
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure appropriate CORS policies
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: All inputs are validated on the server
6. **SQL Injection**: Using parameterized queries
7. **XSS Prevention**: Content is properly escaped

## Support

For support and issues:
- Create an issue on GitHub
- Email: support@linkedeye.finspot.in

## License

Proprietary - FinSpot Technologies Pvt. Ltd.
