const sequelize = require('./config/db');
const { QueryTypes } = require('sequelize');

async function checkBookingData() {
    try {
        const data = await sequelize.query(
            "SELECT id, message, \"createdBy\", charger_id FROM \"Booking\" WHERE message IS NOT NULL AND message != '' LIMIT 5",
            { type: QueryTypes.SELECT }
        );
        console.log('Bookings with messages:');
        console.log(JSON.stringify(data, null, 2));

        const charData = await sequelize.query(
            "SELECT count(*) FROM \"ChargerListing\"",
            { type: QueryTypes.SELECT }
        );
        console.log('Total Private Chargers:', charData[0].count);

        const bookData = await sequelize.query(
            "SELECT count(*) FROM \"Booking\"",
            { type: QueryTypes.SELECT }
        );
        console.log('Total Bookings:', bookData[0].count);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBookingData();
