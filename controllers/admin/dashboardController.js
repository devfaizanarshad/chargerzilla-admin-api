const {
    User, Booking, ChargerListing, PublicStation, StationReview,
    Checkin, NetworkType, FacilityType, City, State, sequelize
} = require('../../models');
const { Op } = require('sequelize');

/**
 * @desc Get comprehensive dashboard statistics for administrators (Deep Analytics)
 * @route GET /api/admin/dashboard
 */
exports.getDashboardData = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));

        // 1. GOD-VIEW SUMMARY COUNTS
        const [
            totalUsers,
            totalPublicStations,
            totalPrivateChargers,
            totalBookings,
            totalRevenue,
            verifiedUsers,
            totalReviews,
            totalCheckins,
            totalHosts,
            activeBookings
        ] = await Promise.all([
            User.count(),
            PublicStation.count(),
            ChargerListing.count({ where: { deleted: false } }),
            Booking.count(),
            Booking.sum('subtotal', { where: { paymentStatus: { [Op.iLike]: '%captured%' } } }),
            User.count({ where: { isEmailVerified: true } }),
            StationReview.count(),
            Checkin.count(),
            User.count({ where: { role: 'host' } }),
            Booking.count({ where: { status: 'Confirmed' } })
        ]);

        // 2. GEOGRAPHIC DISTRIBUTION (Graph Ready)

        // Stations by State (Top 15)
        const stationsByState = await PublicStation.findAll({
            include: [{
                model: City, as: 'city',
                include: [{ model: State, as: 'state', attributes: ['state_name'] }]
            }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['city.id', 'city->state.id', 'city->state.state_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
            limit: 15,
            subQuery: false
        });

        // Top 20 Cities by Station Count
        const stationsByCity = await PublicStation.findAll({
            include: [{ model: City, as: 'city', attributes: ['city_name'] }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['city.id', 'city.city_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
            limit: 20,
            subQuery: false
        });

        // 3. INFRASTRUCTURE & NETWORK (Depth)

        // Network Distribution (Market Share)
        const networkSpread = await PublicStation.findAll({
            include: [{ model: NetworkType, as: 'network', attributes: ['network_name'] }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['network.id', 'network.network_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
        });

        // Facility Type Usage
        const facilitySpread = await PublicStation.findAll({
            include: [{ model: FacilityType, as: 'facility', attributes: ['facility_name'] }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['facility.id', 'facility.facility_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
        });

        // Speed Level Distribution (L1, L2, DC Fast)
        const speedLevels = await PublicStation.findAll({
            attributes: ['level', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['level'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']]
        });

        // 4. REVENUE & USER GROWTH TRENDS (Last 30 Days)

        const signupTrend = await User.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
        });

        const revenueTrend = await Booking.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'revenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'bookings']
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                paymentStatus: { [Op.iLike]: '%captured%' }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
        });

        // 5. ACTIVITY FEED & RECENT
        const recentActivity = await Booking.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'guest', attributes: ['name', 'email'] },
                { model: ChargerListing, as: 'charger', attributes: ['title'] }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                kpi: {
                    users: { total: totalUsers, verified: verifiedUsers, hosts: totalHosts },
                    infrastructure: { public: totalPublicStations, private: totalPrivateChargers },
                    bookings: { total: totalBookings, active: activeBookings },
                    social: { reviews: totalReviews, checkins: totalCheckins },
                    finance: {
                        gross_revenue: totalRevenue || 0,
                        platform_revenue: (totalRevenue || 0) * 0.15
                    }
                },
                geography: {
                    states: stationsByState.map(s => ({
                        name: s.city?.state?.state_name || 'Other',
                        value: parseInt(s.get('count'))
                    })),
                    cities: stationsByCity.map(c => ({
                        name: c.city?.city_name || 'Unknown',
                        value: parseInt(c.get('count'))
                    }))
                },
                infrastructure_depth: {
                    networks: networkSpread.map(n => ({
                        brand: n.network?.network_name || 'Independent',
                        count: parseInt(n.get('count'))
                    })),
                    facilities: facilitySpread.map(f => ({
                        type: f.facility?.facility_name || 'General',
                        count: parseInt(f.get('count'))
                    })),
                    charging_speeds: speedLevels.map(l => ({
                        level: l.level || 'Unknown',
                        count: parseInt(l.get('count'))
                    }))
                },
                performance: {
                    user_growth: signupTrend,
                    revenue_growth: revenueTrend
                },
                feed: recentActivity
            }
        });

    } catch (error) {
        console.error('CRITICAL: Dashboard Sync Error:', error);
        res.status(500).json({
            success: false,
            error: 'Analytics Engine Error',
            details: error.message
        });
    }
};
