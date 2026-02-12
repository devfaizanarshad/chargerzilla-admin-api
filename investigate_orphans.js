const { Booking, User } = require('./models');

async function investigateOrphanedUsers() {
    try {
        console.log('--- Investigating Orphaned User References ---');

        // 1. Get all unique createdBy IDs from Booking
        const bookings = await Booking.findAll({
            attributes: ['createdBy'],
            raw: true
        });

        const bookingUserIds = [...new Set(bookings.map(b => b.createdBy))];
        console.log(`Unique user IDs in Booking table: ${bookingUserIds.length}`);
        console.log(`IDs: ${bookingUserIds.join(', ')}`);

        // 2. Get all existing user IDs
        const existingUsers = await User.findAll({
            attributes: ['id', 'email', 'name'],
            raw: true
        });
        const existingUserIds = existingUsers.map(u => u.id);
        console.log(`Total users in master_user table: ${existingUserIds.length}`);
        existingUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`));

        // 3. Find the orphans
        const orphans = bookingUserIds.filter(id => !existingUserIds.includes(id));
        console.log(`\nFound ${orphans.length} orphaned User IDs referenced in Bookings.`);

        if (orphans.length > 0) {
            console.log(`Orphaned IDs: ${orphans.join(', ')}`);

            // 4. Sample some bookings for these orphans to see if there's any identifying info
            const sampleBookings = await Booking.findAll({
                where: { createdBy: orphans },
                attributes: ['id', 'nid', 'message', 'subtotal', 'createdAt', 'createdBy'],
                limit: 5,
                raw: true
            });

            console.log('\n--- Sample Bookings from Orphaned Users ---');
            sampleBookings.forEach(b => {
                console.log(`Booking ID: ${b.id}`);
                console.log(`NID: ${b.nid}`);
                console.log(`CreatedBy: ${b.createdBy}`);
                console.log(`Created At: ${b.createdAt}`);
                console.log(`Message: ${b.message}`);
                console.log('---');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Investigation failed:', error);
        process.exit(1);
    }
}

investigateOrphanedUsers();
