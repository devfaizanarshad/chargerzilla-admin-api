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
exports.getBookingStats = async (req, res) => {
    try {
        const { date_from, date_to } = req.query;

        const dateFilter = {};
        if (date_from || date_to) {
            dateFilter.arriveDate = {};
            if (date_from) dateFilter.arriveDate[sequelize.Op.gte] = date_from;
            if (date_to) dateFilter.arriveDate[sequelize.Op.lte] = date_to;
        }

        // SINGLE query — fetch bookings + charger info together
        const allBookings = await Booking.findAll({
            where: dateFilter,
            attributes: ['charger_id', 'status', 'paymentStatus', 'subtotal', 'charges', 'totalHours', 'extras', 'createdAt', 'arriveDate'],
            include: [{
                model: ChargerListing,
                as: 'charger',
                attributes: ['title', 'address'],
                required: false
            }]
        });

        // --- Process everything in memory from single result ---
        const statusBreakdown = {};
        const paymentBreakdown = {};
        const chargerBookingCounts = {};
        const monthlyTrend = {};

        let totalRevenue = 0;
        let totalBookingFees = 0;
        let totalStripeFees = 0;
        let totalExtrasRevenue = 0;
        let totalHoursBooked = 0;
        let completedBookings = 0;

        allBookings.forEach(b => {
            const plain = b.toJSON();

            // Status counts
            statusBreakdown[plain.status] = (statusBreakdown[plain.status] || 0) + 1;
            paymentBreakdown[plain.paymentStatus] = (paymentBreakdown[plain.paymentStatus] || 0) + 1;

            // Financial aggregation
            totalRevenue += parseFloat(plain.subtotal) || 0;
            totalHoursBooked += parseFloat(plain.totalHours) || 0;

            if (plain.charges) {
                totalBookingFees += parseFloat(plain.charges.bookingFee) || 0;
                totalStripeFees += parseFloat(plain.charges.totalStripeFee) || 0;
            }

            // Extras revenue
            if (plain.extras && Array.isArray(plain.extras)) {
                plain.extras.forEach(extra => {
                    if (extra.enabled !== false) {
                        totalExtrasRevenue += parseFloat(extra.price) || 0;
                    }
                });
            }

            if (plain.paymentStatus === 'funds-released' || plain.paymentStatus === 'captured') {
                completedBookings++;
            }

            // Monthly trend
            const date = new Date(plain.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyTrend[monthKey]) {
                monthlyTrend[monthKey] = { bookings: 0, revenue: 0 };
            }
            monthlyTrend[monthKey].bookings++;
            monthlyTrend[monthKey].revenue += parseFloat(plain.subtotal) || 0;

            // Top chargers
            const cid = plain.charger_id;
            if (!chargerBookingCounts[cid]) {
                chargerBookingCounts[cid] = {
                    charger_id: cid,
                    title: plain.charger?.title || 'Unknown',
                    address: plain.charger?.address || '',
                    bookings: 0,
                    revenue: 0
                };
            }
            chargerBookingCounts[cid].bookings++;
            chargerBookingCounts[cid].revenue += parseFloat(plain.subtotal) || 0;
        });

        // Sort monthly trend by date
        const sortedTrend = Object.entries(monthlyTrend)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
                month,
                bookings: data.bookings,
                revenue: Math.round(data.revenue * 100) / 100
            }));

        const topChargers = Object.values(chargerBookingCounts)
            .sort((a, b) => b.bookings - a.bookings)
            .slice(0, 5)
            .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }));

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    total_bookings: allBookings.length,
                    completed_bookings: completedBookings,
                    total_hours_booked: Math.round(totalHoursBooked * 100) / 100,
                    completion_rate: allBookings.length > 0
                        ? Math.round((completedBookings / allBookings.length) * 100) + '%'
                        : '0%'
                },
                status_breakdown: statusBreakdown,
                payment_breakdown: paymentBreakdown,
                financials: {
                    total_revenue: Math.round(totalRevenue * 100) / 100,
                    total_booking_fees: Math.round(totalBookingFees * 100) / 100,
                    total_stripe_fees: Math.round(totalStripeFees * 100) / 100,
                    total_extras_revenue: Math.round(totalExtrasRevenue * 100) / 100,
                    net_platform_revenue: Math.round((totalBookingFees - totalStripeFees) * 100) / 100,
                    average_booking_value: allBookings.length > 0
                        ? Math.round((totalRevenue / allBookings.length) * 100) / 100
                        : 0
                },
                monthly_trend: sortedTrend,
                top_chargers: topChargers
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
