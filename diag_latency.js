const { sequelize } = require('./models');

async function diagnostic() {
    try {
        console.log('--- LATENCY DIAGNOSTIC ---');

        // Test 1: Connection & Auth
        const startAuth = Date.now();
        await sequelize.authenticate();
        console.log(`1. Connection/Auth: ${Date.now() - startAuth}ms`);

        // Test 2: Simple Query (Test network latency)
        const times = [];
        for (let i = 0; i < 5; i++) {
            const s = Date.now();
            await sequelize.query('SELECT 1');
            times.push(Date.now() - s);
        }
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`2. Simple Query Avg: ${Math.round(avg)}ms (Individual: ${times.join(', ')})`);

        // Test 3: Table Scan (Test DB Performance)
        const startTable = Date.now();
        await sequelize.query('SELECT COUNT(*) FROM "public_stations"');
        console.log(`3. Station Count Query: ${Date.now() - startTable}ms`);

        process.exit(0);
    } catch (err) {
        console.error('DIAGNOSTIC FAILED:', err.message);
        process.exit(1);
    }
}

diagnostic();
