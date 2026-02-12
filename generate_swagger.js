const fs = require('fs');
const swaggerJsDoc = require('swagger-jsdoc');

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
                url: `http://localhost:3000`,
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
    apis: ['./routes/admin/*.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

fs.writeFileSync('swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('Swagger JSON file generated successfully at ./swagger.json');
