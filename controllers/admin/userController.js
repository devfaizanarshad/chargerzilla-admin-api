const models = require('../../models');
const {
    User,
    ChargerListing,
    Booking,
    Vehicle,
    Trip,
    Checkin,
    Favorite,
    Conversation,
    Message,
    sequelize
} = models;

console.log('--- USER CONTROLLER DEBUG ---');
console.log('Conversation Model:', !!Conversation);
console.log('Message Model:', !!Message);
console.log('Available Models:', Object.keys(models));

// @desc    Get all users with basic stats
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { role, search, account_type, active_status, delete_status, stripe_verified, email_verified } = req.query;

        const whereClause = {};

        // --- Improved Search (Name, Email, Phone, ID) ---
        if (search) {
            const isNumeric = !isNaN(search);
            whereClause[sequelize.Op.or] = [
                { email: { [sequelize.Op.iLike]: `%${search}%` } },
                { name: { [sequelize.Op.iLike]: `%${search}%` } },
                { phoneNumber: { [sequelize.Op.iLike]: `%${search}%` } }
            ];
            if (isNumeric) {
                whereClause[sequelize.Op.or].push({ id: parseInt(search) });
            }
        }

        // --- Filters ---
        if (role) whereClause.role = role;
        if (account_type) whereClause.account_type = account_type;

        if (active_status !== undefined) whereClause.active_status = active_status === 'true';
        if (delete_status !== undefined) whereClause.delete_status = delete_status === 'true';

        if (stripe_verified === 'true') whereClause.isStripeVerified = true;
        if (stripe_verified === 'false') whereClause.isStripeVerified = false;

        if (email_verified === 'true') whereClause.isEmailVerified = true;
        if (email_verified === 'false') whereClause.isEmailVerified = false;

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['password'] },
            include: [
                { model: Vehicle, as: 'vehicle' }
            ]
        });

        // Add quick stats
        const users = await Promise.all(rows.map(async (user) => {
            const [listingCount, bookingCount] = await Promise.all([
                ChargerListing.count({ where: { createdBy: user.id } }),
                Booking.count({ where: { createdBy: user.id } })
            ]);
            return {
                ...user.toJSON(),
                stats: { listings: listingCount, bookings: bookingCount }
            };
        }));

        res.status(200).json({
            success: true,
            data: users,
            pagination: { total: count, page, pages: Math.ceil(count / limit) }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @desc    Get DEEP user details
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] },
            include: [
                { model: Vehicle, as: 'vehicle' } // Full vehicle info
            ]
        });

        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Parallel comprehensive data fetch
        const [listings, guestBookings, hostBookings, trips, checkins, favorites] = await Promise.all([
            ChargerListing.findAll({
                where: { createdBy: id },
                limit: 10,
                order: [['createdAt', 'DESC']]
            }),
            Booking.findAll({
                where: { createdBy: id },
                include: [
                    { model: models.Conversation, as: 'conversation', include: [{ model: models.Message, as: 'messages' }] },
                    { model: ChargerListing, as: 'charger', attributes: ['title'] }
                ],
                limit: 20,
                order: [['createdAt', 'DESC']]
            }),
            Booking.findAll({
                include: [
                    {
                        model: ChargerListing,
                        as: 'charger',
                        where: { createdBy: id },
                        attributes: ['title']
                    },
                    { model: User, as: 'guest', attributes: ['name', 'email'] },
                    { model: models.Conversation, as: 'conversation', include: [{ model: models.Message, as: 'messages' }] }
                ],
                limit: 20,
                order: [['createdAt', 'DESC']]
            }),
            Trip.findAll({
                where: { user_id: id },
                limit: 10,
                order: [['created_at', 'DESC']]
            }),
            Checkin.findAll({
                where: { user_id: id },
                limit: 10,
                order: [['created_at', 'DESC']]
            }),
            Favorite.findAll({
                where: { user_id: id },
                limit: 10
            })
        ]);

        const formatCommunication = (b) => {
            const plain = b.toJSON();
            return {
                booking_id: plain.id,
                charger: plain.charger?.title || 'Unknown Charger',
                type: plain.createdBy == id ? 'Guest' : 'Host',
                status: plain.status,
                messages: plain.conversation ? plain.conversation.messages : (plain.message ? [{
                    sender: plain.createdBy == id ? 'User (You)' : (plain.guest?.name || 'Guest'),
                    content: plain.message,
                    date: plain.createdAt
                }] : [])
            };
        };

        res.status(200).json({
            success: true,
            data: {
                profile: user,
                engagement_profile: {
                    hosted_chargers: listings,
                    booking_history: guestBookings,
                    trips: trips,
                    checkins: checkins,
                    favorites: favorites
                },
                communication_logs: [
                    ...guestBookings.map(formatCommunication),
                    ...hostBookings.map(formatCommunication)
                ].sort((a, b) => new Date(b.date) - new Date(a.date))
            }
        });
    } catch (error) {
        console.error('Error fetching comprehensive user data:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @desc    Update user (Maximum Control)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Maximum Control: Edit Profile & Status
        const editableFields = [
            'name', 'email', 'phoneNumber', 'role',
            'active_status', 'delete_status',
            'isEmailVerified', 'isStripeVerified', 'account_type'
        ];

        editableFields.forEach(field => {
            if (req.body[field] !== undefined) user[field] = req.body[field];
        });

        await user.save();
        res.status(200).json({ success: true, data: user, message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
