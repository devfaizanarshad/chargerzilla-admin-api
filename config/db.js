const { Sequelize } = require('sequelize');
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        dialectModule: pg,
        port: process.env.DB_PORT || 5432,
        logging: false, // Disabling logging to improve local performance
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('CRITICAL: Unable to connect to the database!');
        console.error('Error details:', err.message);
        console.error('Host:', process.env.DB_HOST);
        // Note: Do not log password here for security
    });

module.exports = sequelize;
