const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "https://cdnjs.cloudflare.com"],
            "connect-src": ["'self'", "https://chargerzilla-admin-api.vercel.app"],
        },
    },
})); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chargerzilla Admin API',
            version: '1.0.0',
            description: 'Administrative backend for Chargerzilla platform',
            contact: {
                name: 'Chargerzilla Tech Team'
            }
        },
        servers: [
            {
                url: 'https://chargerzilla-admin-api.vercel.app',
                description: 'Production Server'
            },
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Development Server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./routes/admin/*.js'] // Path to route files for auto-docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Use CDN for Swagger UI assets to avoid MIME type issues on Vercel
const swaggerUiOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    customJs: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerUiOptions));

// Expose raw JSON for frontend devs
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
});

// Mount Routes
app.get('/api/admin/ping', (req, res) => res.json({ success: true, message: 'pong' }));

app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/bookings', require('./routes/admin/bookings'));
app.use('/api/admin/stations', require('./routes/admin/stations'));
app.use('/api/admin/dashboard', require('./routes/admin/dashboard'));
app.use('/api/admin/metadata', (req, res, next) => {
    console.log(`[DEBUG] Metadata Request: ${req.method} ${req.url}`);
    next();
}, require('./routes/admin/metadata'));

// Base Route
app.get('/', (req, res) => {
    res.json({ message: 'Chargerzilla Admin API Running', docs: '/api-docs' });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: 'Server Error', details: err.message });
});

// Only start the server if not running on Vercel
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running locally on port ${PORT}`);
        console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
    });
}

module.exports = app;
