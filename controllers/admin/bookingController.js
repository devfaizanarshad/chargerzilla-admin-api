const models = require('../../models');
const {
    Booking, ChargerListing, User, ChargerMedia,
    Conversation, Message, ExtraService,
    sequelize
} = models;

// ==========================================
// GET /api/admin/bookings
// List all bookings with advanced filtering
// ==========================================
exports.getBookings = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;
        const { status, paymentStatus, search, host_id, guest_id, date_from, date_to, sort_by, sort_order } = req.query;

        const whereClause = {};
        const chargerWhereClause = {};
        let requireCharger = false;

        // --- Filters ---
        if (status) whereClause.status = status;
        if (paymentStatus) whereClause.paymentStatus = paymentStatus;
        if (guest_id) whereClause.createdBy = parseInt(guest_id);

        // Host filter requires filtering through charger
        if (host_id) {
            chargerWhereClause.createdBy = parseInt(host_id);
            requireCharger = true;
        }

        // Date range filter
        if (date_from || date_to) {
            whereClause.arriveDate = {};
            if (date_from) whereClause.arriveDate[sequelize.Op.gte] = date_from;
            if (date_to) whereClause.arriveDate[sequelize.Op.lte] = date_to;
        }

        // Search across booking ID (nid), guest email/name, charger title
        if (search) {
            whereClause[sequelize.Op.or] = [
                { nid: { [sequelize.Op.iLike]: `%${search}%` } },
                { id: { [sequelize.Op.iLike]: `%${search}%` } },
                { message: { [sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        // --- Sorting ---
        const validSortFields = ['createdAt', 'arriveDate', 'subtotal', 'status', 'paymentStatus'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'createdAt';
        const order = sort_order === 'ASC' ? 'ASC' : 'DESC';

        const { count, rows } = await Booking.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[sortField, order]],
            include: [
                {
                    model: User,
                    as: 'guest',
                    attributes: ['id', 'name', 'email', 'phone', 'role']
                },
                {
                    model: ChargerListing,
                    as: 'charger',
                    where: Object.keys(chargerWhereClause).length > 0 ? chargerWhereClause : undefined,
                    required: requireCharger,
                    attributes: ['id', 'title', 'address', 'pricePerHour', 'createdBy'],
                    include: [
                        {
                            model: User,
                            as: 'host',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                }
            ]
        });

        // Clean response
        const bookings = rows.map(b => {
            const plain = b.toJSON();
            return {
                id: plain.id,
                nid: plain.nid,
                guest: plain.guest || { id: plain.createdBy, name: 'Unknown', email: null },
                charger: plain.charger ? {
                    id: plain.charger.id,
                    title: plain.charger.title,
                    address: plain.charger.address,
                    host: plain.charger.host || { id: plain.charger.createdBy, name: 'Unknown' }
                } : null,
                schedule: {
                    arrive_date: plain.arriveDate,
                    start_time: plain.startTime,
                    end_time: plain.endTime,
                    total_hours: plain.totalHours
                },
                status: plain.status,
                payment_status: plain.paymentStatus,
                subtotal: plain.subtotal,
                charges: plain.charges,
                extras: plain.extras,
                has_message: !!plain.message,
                created_at: plain.createdAt
            };
        });

        res.status(200).json({
            success: true,
            data: bookings,
            pagination: {
                total: count,
                page,
                pages: Math.ceil(count / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, error: 'Server error', details: error.message });
    }
};

// ==========================================
// GET /api/admin/bookings/stats
// Financial dashboard & status breakdown
// OPTIMIZED: Single DB query instead of two
// ==========================================
// @desc    Financial dashboard & status breakdown
// OPTIMIZED: Uses SQL aggregation instead of fetching all records
// ==========================================
exports.getBookingStats = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;

        const dateFilter = {};
        if (date_from || date_to) {
            dateFilter.arriveDate = {};
            if (date_from) dateFilter.arriveDate[sequelize.Op.gte] = date_from;
            if (date_to) dateFilter.arriveDate[sequelize.Op.lte] = date_to;
        }

        // 1. Basic Counts and Financial Totals
        const basicStats = await Booking.findOne({
            where: dateFilter,
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_bookings'],
                [sequelize.fn('SUM', sequelize.literal('CAST(subtotal AS DECIMAL)')), 'total_revenue'],
                [sequelize.fn('SUM', sequelize.literal('CAST("totalHours" AS DECIMAL)')), 'total_hours_booked']
            ],
            raw: true
        });

        // 2. Status Breakdown
        const statusData = await Booking.findAll({
            where: dateFilter,
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        const statusBreakdown = {};
        statusData.forEach(s => statusBreakdown[s.status] = parseInt(s.count));

        // 3. Top Chargers (Limit to 5)
        const topChargersData = await Booking.findAll({
            where: dateFilter,
            attributes: [
                'charger_id',
                [sequelize.fn('COUNT', sequelize.col('Booking.id')), 'bookings'],
                [sequelize.fn('SUM', sequelize.literal('CAST(subtotal AS DECIMAL)')), 'revenue']
            ],
            include: [{
                model: ChargerListing,
                as: 'charger',
                attributes: ['title', 'address'],
                required: false
            }],
            group: ['charger_id', 'charger.id'],
            order: [[sequelize.literal('bookings'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true
        });

        // 4. Monthly Trend (Last 12 months)
        const monthlyTrendData = await Booking.findAll({
            where: dateFilter,
            attributes: [
                [sequelize.fn('TO_CHAR', sequelize.col('Booking.createdAt'), 'YYYY-MM'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'bookings'],
                [sequelize.fn('SUM', sequelize.literal('CAST(subtotal AS DECIMAL)')), 'revenue']
            ],
            group: [sequelize.fn('TO_CHAR', sequelize.col('Booking.createdAt'), 'YYYY-MM')],
            order: [[sequelize.fn('TO_CHAR', sequelize.col('Booking.createdAt'), 'YYYY-MM'), 'ASC']],
            limit: 12,
            raw: true
        });

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    total_bookings: parseInt(basicStats.total_bookings) || 0,
                    total_revenue: parseFloat(basicStats.total_revenue) || 0,
                    total_hours_booked: parseFloat(basicStats.total_hours_booked) || 0
                },
                status_breakdown: statusBreakdown,
                monthly_trend: monthlyTrendData.map(m => ({
                    month: m.month,
                    bookings: parseInt(m.bookings),
                    revenue: parseFloat(m.revenue)
                })),
                top_chargers: topChargersData.map(c => ({
                    charger_id: c.charger_id,
                    title: c.charger?.title || 'Unknown',
                    address: c.charger?.address || '',
                    bookings: parseInt(c.bookings),
                    revenue: parseFloat(c.revenue)
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching booking stats:', error);
        res.status(500).json({ success: false, error: 'Server error', details: error.message });
    }
};

// ==========================================
// GET /api/admin/bookings/:id
// Deep booking detail with full chain
// ==========================================
exports.getBookingById = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'guest',
                    attributes: { exclude: ['password'] }
                },
                {
                    model: ChargerListing,
                    as: 'charger',
                    include: [
                        { model: User, as: 'host', attributes: ['id', 'name', 'email', 'phone', 'stripeAccountId', 'isStripeVerified'] },
                        { model: ChargerMedia, as: 'media', limit: 3 },
                        { model: ExtraService, as: 'services' }
                    ]
                },
                {
                    model: Conversation,
                    as: 'conversation',
                    include: [{
                        model: Message,
                        as: 'messages',
                        order: [['createdAt', 'ASC']]
                    }]
                }
            ]
        });

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        const plain = booking.toJSON();

        // Build the full detailed response
        const detail = {
            id: plain.id,
            nid: plain.nid,

            // Guest (who booked)
            guest: plain.guest || { id: plain.createdBy, name: 'User not in DB' },

            // Charger & Host
            charger: plain.charger ? {
                id: plain.charger.id,
                title: plain.charger.title,
                description: plain.charger.description,
                address: plain.charger.address,
                price_per_hour: plain.charger.pricePerHour,
                weekend_price: plain.charger.weekendPrice,
                connector_type: plain.charger.connectorType,
                media: plain.charger.media,
                host: plain.charger.host,
                available_services: plain.charger.services
            } : { id: plain.charger_id, note: 'Charger may have been deleted' },

            // Schedule
            schedule: {
                arrive_date: plain.arriveDate,
                start_time: plain.startTime,
                end_time: plain.endTime,
                total_hours: plain.totalHours
            },

            // Status
            booking_status: plain.status,

            // Financials (the rich part!)
            financials: {
                subtotal: plain.subtotal,
                payment_status: plain.paymentStatus,
                stripe_payment_intent: plain.paymentIntentId,
                charges_breakdown: plain.charges ? {
                    final_cost: plain.charges.finalCost,
                    booking_fee: plain.charges.bookingFee,
                    stripe_flat_fee: plain.charges.flatAmount,
                    stripe_percentage_fee: plain.charges.percentageAmount,
                    total_stripe_fee: plain.charges.totalStripeFee,
                    final_amount_charged: plain.charges.finalAmount
                } : null
            },

            // Extras/Upsells purchased
            extras_purchased: plain.extras ? plain.extras.map(e => ({
                name: e.name,
                price: e.price,
                flat_fee: e.flatFee,
                enabled: e.enabled
            })) : [],

            // Communication
            communication: {
                initial_message: plain.message,
                conversation: plain.conversation ? {
                    id: plain.conversation.id,
                    message_count: plain.conversation.messages ? plain.conversation.messages.length : 0,
                    messages: plain.conversation.messages ? plain.conversation.messages.map(m => ({
                        id: m.id,
                        sender_id: m.sender_id,
                        content: m.content,
                        read: m.read,
                        sent_at: m.createdAt
                    })) : []
                } : null
            },

            // Recurring info
            recurring_booking_id: plain.recurring_booking_id,

            // Timestamps
            meta: {
                created_at: plain.createdAt,
                updated_at: plain.updatedAt
            }
        };

        res.status(200).json({ success: true, data: detail });
    } catch (error) {
        console.error('Error fetching booking detail:', error);
        res.status(500).json({ success: false, error: 'Server error', details: error.message });
    }
};

// ==========================================
// PATCH /api/admin/bookings/:id
// Admin update booking status / payment
// ==========================================
exports.updateBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findByPk(id);

        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        // Fields an admin can update
        const editableFields = ['status', 'paymentStatus'];

        let updated = [];
        editableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                const oldValue = booking[field];
                booking[field] = req.body[field];
                updated.push({ field, from: oldValue, to: req.body[field] });
            }
        });

        if (updated.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid fields to update. Editable fields: ' + editableFields.join(', ')
            });
        }

        await booking.save();

        res.status(200).json({
            success: true,
            data: booking,
            changes: updated,
            message: 'Booking updated successfully'
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ success: false, error: 'Server error', details: error.message });
    }
};
