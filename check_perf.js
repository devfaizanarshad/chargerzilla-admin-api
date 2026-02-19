const { sequelize, PublicStation, City, Zipcode } = require('./models');

async function check() {
    console.time('Total');
    try {
        console.log('Testing Connection...');
        console.time('Auth');
        await sequelize.authenticate();
        console.timeEnd('Auth');

        console.log('\nChecking Counts...');

        console.time('PublicStation');
        const stCount = await PublicStation.count();
        console.timeEnd('PublicStation');
        console.log(`- Stations: ${stCount}`);

        console.time('City');
        const cityCount = await City.count();
        console.timeEnd('City');
        console.log(`- Cities: ${cityCount}`);

        console.time('Zipcode');
        const zipCount = await Zipcode.count();
        console.timeEnd('Zipcode');
        console.log(`- Zipcodes: ${zipCount}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        console.timeEnd('Total');
        process.exit(0);
    }
}

check();
