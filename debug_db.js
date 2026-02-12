const models = require('./models');
const { sequelize } = models;

async function check() {
    try {
        const table = await sequelize.getQueryInterface().describeTable('ChargerListing');
        console.log('--- TABLE STRUCTURE ---');
        console.log('amenities type:', table.amenities.type);
        console.log('facilities type:', table.facilities.type);
        console.log('Full attributes:', JSON.stringify(table, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

check();
