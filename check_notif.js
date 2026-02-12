const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function checkNotifications() {
    try {
        const cols = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications'",
            { type: QueryTypes.SELECT }
        );
        console.log('Columns in notifications table:');
        console.log(JSON.stringify(cols, null, 2));

        const count = await sequelize.query(
            "SELECT count(*) FROM \"notifications\"",
            { type: QueryTypes.SELECT }
        );
        console.log('Notification count:', count[0].count);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkNotifications();
