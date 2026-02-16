const {
    User, Booking, ChargerListing, PublicStation, StationReview,
    Checkin, NetworkType, FacilityType, City, sequelize
} = require('../../models');
const { Op } = require('sequelize');

/**
 * @desc Get comprehensive dashboard statistics for administrators
 * @route GET /api/admin/dashboard
 */
exports.getDashboardData = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));

        // 1. OVERVIEW SUMMARY (God View)
        const [
            totalUsers,
            totalPublicStations,
            totalPrivateChargers,
            totalBookings,
            revenueData,
            activeHostsCount,
            verifiedUsers,
            totalReviews,
            totalCheckins
        ] = await Promise.all([
            User.count(),
            PublicStation.count(),
            ChargerListing.count({ where: { deleted: false } }),
            Booking.count(),
            Booking.sum('subtotal', { where: { paymentStatus: { [Op.iLike]: '%captured%' } } }),
            User.count({ where: { role: 'host' } }),
            User.count({ where: { isEmailVerified: true } }),
            StationReview.count(),
            Checkin.count()
        ]);

        // 2. DETAILED BREAKDOWNS (Decision-Making Data)

        // Booking Status Breakdown
        const bookingBreakdown = await Booking.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['status']
        });

        // User Account Type Spread
        const userTypeSpread = await User.findAll({
            attributes: ['account_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['account_type']
        });

        // Public Station Speed Levels
        const stationLevels = await PublicStation.findAll({
            attributes: ['level', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['level']
        });

        // Network Distribution (Top 10)
        const networkDistribution = await PublicStation.findAll({
            include: [{ model: NetworkType, as: 'network', attributes: ['network_name'] }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['network.id', 'network.network_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
            limit: 10
        });

        // Facility Distribution (Top 10)
        const facilityDistribution = await PublicStation.findAll({
            include: [{ model: FacilityType, as: 'facility', attributes: ['facility_name'] }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'count']],
            group: ['facility.id', 'facility.facility_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('PublicStation.id')), 'DESC']],
            limit: 10
        });

        // Private Charger Connector Breakdown
        // Since connectorType is a string/csv, we'll do a simple count of occurrences
        const chargerConnectors = await ChargerListing.findAll({
            attributes: ['connectorType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: { deleted: false },
            group: ['connectorType']
        });

        // 3. TRENDS
        // Recent Signups (30 Days)
        const signupTrend = await User.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'result_date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
        });

        // Revenue & Booking Count Trend (30 Days)
        const revenueTrend = await Booking.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'result_date'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'total_revenue'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'booking_count']
            ],
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                paymentStatus: { [Op.iLike]: '%captured%' }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
            order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
        });

        // 4. TOP PERFORMERS & QUALITY
        // Cities by High Check-in Activity
        const busyCities = await Checkin.findAll({
            include: [{
                model: PublicStation,
                as: 'station',
                include: [{ model: City, as: 'city', attributes: ['city_name'] }]
            }],
            attributes: [[sequelize.fn('COUNT', sequelize.col('Checkin.id')), 'checkin_count']],
            group: ['station.id', 'station.city_id', 'station->city.id', 'station->city.city_name'],
            order: [[sequelize.fn('COUNT', sequelize.col('Checkin.id')), 'DESC']],
            limit: 5,
            subQuery: false
        });

        // Recent Bookings for Feed
        const recentBookings = await Booking.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'guest', attributes: ['id', 'name', 'email'] },
                { model: ChargerListing, as: 'charger', attributes: ['id', 'title'] }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    total_users: totalUsers,
                    verified_users: verifiedUsers,
                    total_hosts: activeHostsCount,
                    total_public_stations: totalPublicStations,
                    total_private_chargers: totalPrivateChargers,
                    total_bookings: totalBookings,
                    total_reviews: totalReviews,
                    total_checkins: totalCheckins,
                    net_revenue: revenueData || 0,
                    platform_fees_est: (revenueData || 0) * 0.15 // 15% platform commission
                },
                financials: {
                    avg_booking_value: totalBookings > 0 ? (revenueData / totalBookings) : 0,
                    thirty_day_growth_rate: "N/A" // Placeholder for complex calc
                },
                spreads: {
                    booking_statuses: bookingBreakdown,
                    account_types: userTypeSpread,
                    charging_levels: stationLevels,
                    top_networks: networkDistribution.map(n => ({ name: n.network ? n.network.network_name : 'Unknown', count: n.get('count') })),
                    top_facilities: facilityDistribution.map(f => ({ name: f.facility ? f.facility.facility_name : 'Unknown', count: f.get('count') })),
                    charger_connectors: chargerConnectors
                },
                growth: {
                    signups: signupTrend,
                    revenue: revenueTrend
                },
                activity: {
                    hot_zones: busyCities.map(c => ({
                        city: c.station?.city?.city_name || 'Generic Zone',
                        station: c.station?.station_name,
                        checkins: c.get('checkin_count')
                    })),
                    feed: recentBookings
                }
            }
        });

    } catch (error) {
        console.error('CRITICAL: Dashboard Compilation Error:', error);
        res.status(500).json({
            success: false,
            error: 'Database Analytic Engine Failure',
            details: error.message
        });
    }
};
