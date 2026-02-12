const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function checkBooking() {
    try {
        const bookingCols = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Booking'",
            { type: QueryTypes.SELECT }
        );
        console.log('Columns in Booking table:');
        console.log(JSON.stringify(bookingCols, null, 2));

        const data = await sequelize.query(
            "SELECT count(*) FROM \"Conversation\"",
            { type: QueryTypes.SELECT }
        );
        console.log('Conversation count:', data[0].count);

        const dataMsg = await sequelize.query(
            "SELECT count(*) FROM \"Message\"",
            { type: QueryTypes.SELECT }
        );
        console.log('Message count:', dataMsg[0].count);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBooking();
