const models = require('../../models');
const {
    City, State, Country, Zipcode, NetworkType, FacilityType, User
} = models;

// Simple in-memory cache
let metadataCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @desc Get all valid metadata for filters (Cities, Networks, connector types, etc.)
 * @route GET /api/admin/metadata
 */
exports.getAdminMetadata = async (req, res) => {
    try {
        // Check cache first
        const now = Date.now();
        if (metadataCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL)) {
            console.log('[METADATA] Serving from cache');
            return res.status(200).json({
                success: true,
                data: metadataCache,
                cached: true
            });
        }

        console.log('[METADATA] Cache miss - Fetching from DB');
        const [cities, states, countries, zipcodes, networks, facilities, hosts] = await Promise.all([
            City.findAll({ attributes: ['id', 'city_name', 'state_id'], limit: 500, order: [['city_name', 'ASC']] }),
            State.findAll({ attributes: ['id', 'state_name', 'country_id'], order: [['state_name', 'ASC']] }),
            Country.findAll({ attributes: ['id', 'country_name'], order: [['country_name', 'ASC']] }),
            Zipcode.findAll({ attributes: ['id', 'zipcode'], limit: 50, order: [['zipcode', 'ASC']] }),
            NetworkType.findAll({ attributes: ['id', 'network_name'], order: [['network_name', 'ASC']] }),
            FacilityType.findAll({ attributes: ['id', 'facility_name'], order: [['facility_name', 'ASC']] }),
            User.findAll({
                attributes: ['id', 'name', 'email'],
                where: { role: 'host' },
                order: [['name', 'ASC']]
            })
        ]);

        // Status constants
        const statuses = {
            public_stations: ['Active', 'Under Repair', 'Planned', 'Decommissioned'],
            private_chargers: ['published', 'draft', 'disabled'],
            users: ['guest', 'host', 'admin'],
            bookings: ['Reserved', 'CancelledByHost', 'CancelledByGuest', 'Waiting', 'Completed'],
            payments: ['pending', 'captured', 'funds-released', 'cancelled', 'refunded']
        };

        const responseData = {
            cities,
            states,
            countries,
            zipcodes,
            networks,
            facilities,
            hosts,
            connectors: ['J1772', 'CHAdeMO', 'CCS', 'Tesla', 'NEMA 14-50', 'NEMA 5-15', 'NEMA 5-20'],
            publicChargerStatuses: statuses.public_stations,
            privateChargerStatuses: statuses.private_chargers,
            bookingStatuses: statuses.bookings,
            paymentStatuses: statuses.payments,
            userRoles: statuses.users
        };

        // Store in cache
        metadataCache = responseData;
        cacheTimestamp = now;

        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
