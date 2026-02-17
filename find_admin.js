const { User } = require('./models');

async function findAdmin() {
    try {
        const admins = await User.findAll({ where: { role: 'admin' } });
        if (admins.length > 0) {
            console.log('--- ADMIN USERS ---');
            admins.forEach(u => console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}`));
        } else {
            console.log('No admin users found.');
        }
    } catch (err) {
        console.error('Error finding admin:', err);
    } finally {
        process.exit();
    }
}

findAdmin();
