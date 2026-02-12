const { ChargerListing, User } = require('./models');

async function investigateChargerCreators() {
    try {
        console.log('--- Investigating ChargerListing Creators ---');

        const listings = await ChargerListing.findAll({
            attributes: ['createdBy'],
            raw: true
        });

        const listingUserIds = [...new Set(listings.map(l => l.createdBy))];
        console.log(`Unique user IDs in ChargerListing table: ${listingUserIds.length}`);
        console.log(`IDs: ${listingUserIds.join(', ')}`);

        const existingUsers = await User.findAll({
            attributes: ['id'],
            raw: true
        });
        const existingUserIds = existingUsers.map(u => u.id);

        const orphans = listingUserIds.filter(id => !existingUserIds.includes(id));
        console.log(`Orphaned Host IDs: ${orphans.length}`);
        if (orphans.length > 0) {
            console.log(`Orphaned IDs: ${orphans.join(', ')}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Investigation failed:', error);
        process.exit(1);
    }
}

investigateChargerCreators();
