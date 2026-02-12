const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function checkTables() {
    try {
        const tables = await sequelize.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
            { type: QueryTypes.SELECT }
        );
        console.log('Tables in database:');
        console.log(JSON.stringify(tables, null, 2));

        // Check columns of Conversation and Message
        const convCols = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Conversation'",
            { type: QueryTypes.SELECT }
        );
        console.log('\nColumns in Conversation table:');
        console.log(JSON.stringify(convCols, null, 2));

        const msgCols = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Message'",
            { type: QueryTypes.SELECT }
        );
        console.log('\nColumns in Message table:');
        console.log(JSON.stringify(msgCols, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTables();
