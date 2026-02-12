const models = require('../../models');
const {
    City, State, NetworkType, FacilityType, User, ChargerListing
} = models;

/**
 * @desc Get all valid metadata for filters (Cities, Networks, connector types, etc.)
 * @route GET /api/admin/metadata
 */
exports.getAdminMetadata = async (req, res) => {
    try {
        const [cities, states, networks, facilities, hosts, connectorTypes] = await Promise.all([
            City.findAll({ attributes: ['id', 'city_name'], order: [['city_name', 'ASC']] }),
            State.findAll({ attributes: ['id', 'state_name'], order: [['state_name', 'ASC']] }),
            NetworkType.findAll({ attributes: ['id', 'network_name'], order: [['network_name', 'ASC']] }),
            FacilityType.findAll({ attributes: ['id', 'facility_name'], order: [['facility_name', 'ASC']] }),
            User.findAll({
                attributes: ['id', 'name', 'email'],
                where: { role: 'host' },
                order: [['name', 'ASC']]
            }),
            // Manual connector types constants since they aren't in a dedicated lookup table
            Promise.resolve([
                { value: 'chk_j1772', label: 'J1772' },
                { value: 'chk_ccs', label: 'CCS' },
                { value: 'chk_chademo', label: 'CHAdeMO' },
                { value: 'chk_tesla', label: 'Tesla' }
            ])
        ]);

        // Status constants
        const statuses = {
            public_stations: ['Active', 'Under Repair', 'Planned'],
            private_chargers: ['published', 'draft', 'disabled'],
            users: ['guest', 'host', 'admin'],
            bookings: [
                'Reserved',
                'CancelledByHost',
                'CancelledByGuest',
                'Waiting',
                'Completed'
            ],
            payments: ['pending', 'captured', 'funds-released', 'cancelled', 'refunded']
        };

        res.status(200).json({
            success: true,
            data: {
                cities: cities.map(c => ({ id: c.id, name: c.city_name })),
                states: states.map(s => ({ id: s.id, name: s.state_name })),
                networks: networks.map(n => ({ id: n.id, name: n.network_name })),
                facilities: facilities.map(f => ({ id: f.id, name: f.facility_name })),
                hosts: hosts.map(h => ({ id: h.id, name: h.name || h.email })),
                connectors: ['J1772', 'CHAdeMO', 'CCS', 'Tesla'],
                publicChargerStatuses: statuses.public_stations,
                privateChargerStatuses: statuses.private_chargers,
                bookingStatuses: statuses.bookings,
                paymentStatuses: statuses.payments,
                userRoles: statuses.users
            }
        });
    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
