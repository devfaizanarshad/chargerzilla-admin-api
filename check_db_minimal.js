const { sequelize } = require('./models');

async function check() {
    try {
        console.log('Testing Connection via Auth...');
        const start = Date.now();
        await sequelize.authenticate();
        console.log(`Connection successful! Time: ${Date.now() - start}ms`);

        console.log('Running simple query: SELECT 1');
        const qStart = Date.now();
        await sequelize.query('SELECT 1');
        console.log(`Simple query successful! Time: ${Date.now() - qStart}ms`);

        process.exit(0);
    } catch (err) {
        console.error('CRITICAL DATABASE ERROR:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

check();
