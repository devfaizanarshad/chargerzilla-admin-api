const { sequelize } = require('./models');

async function removeColumns() {
    try {
        console.log('--- STARTING DATABASE CLEANUP ---');

        const describe = await sequelize.queryInterface.describeTable('ChargerListing');

        if (describe.network_type_id) {
            console.log('Removing network_type_id column...');
            await sequelize.queryInterface.removeColumn('ChargerListing', 'network_type_id');
            console.log('network_type_id removed.');
        }

        if (describe.facility_type_id) {
            console.log('Removing facility_type_id column...');
            await sequelize.queryInterface.removeColumn('ChargerListing', 'facility_type_id');
            console.log('facility_type_id removed.');
        }

        console.log('--- CLEANUP COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('--- CLEANUP FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

removeColumns();
