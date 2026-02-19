const { sequelize } = require('./models');

async function addColumns() {
    try {
        console.log('--- STARTING DATABASE MIGRATION ---');

        // Check if columns already exist to avoid errors
        const describe = await sequelize.queryInterface.describeTable('ChargerListing');

        if (!describe.network_type_id) {
            console.log('Adding network_type_id column...');
            await sequelize.queryInterface.addColumn('ChargerListing', 'network_type_id', {
                type: 'INTEGER',
                allowNull: true
            });
            console.log('network_type_id added.');
        } else {
            console.log('network_type_id already exists.');
        }

        if (!describe.facility_type_id) {
            console.log('Adding facility_type_id column...');
            await sequelize.queryInterface.addColumn('ChargerListing', 'facility_type_id', {
                type: 'INTEGER',
                allowNull: true
            });
            console.log('facility_type_id added.');
        } else {
            console.log('facility_type_id already exists.');
        }

        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
        process.exit(0);
    } catch (error) {
        console.error('--- MIGRATION FAILED ---');
        console.error(error);
        process.exit(1);
    }
}

addColumns();
