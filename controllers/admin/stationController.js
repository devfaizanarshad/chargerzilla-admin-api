const models = require('../../models');
const {
    ChargerListing, PublicStation, User, ChargerMedia, Booking, StationReview,
    City, State, Zipcode, NetworkType, FacilityType, ChargerTiming, ChargerDay, Conversation, Message,
    ExtraService, PaymentMethod, Checkin, sequelize
} = models;

// ... Public Station Logic (Keep existing updates) ...

exports.getPublicStations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { search, status, network_type_id, connector, level, city_name, network_name, online, access, pricing, facility_id } = req.query;

        const whereClause = {};
        const cityWhereClause = {};
        const networkWhereClause = {};

        // --- Improved Search (Name, Address, ID) ---
        if (search) {
            const isNumeric = !isNaN(search);
            whereClause[sequelize.Op.or] = [
                { station_name: { [sequelize.Op.iLike]: `%${search}%` } },
                { street_address: { [sequelize.Op.iLike]: `%${search}%` } }
            ];
            if (isNumeric) {
                whereClause[sequelize.Op.or].push({ id: parseInt(search) });
            }
        }

        // --- Filters ---
        if (status) whereClause.status = { [sequelize.Op.iLike]: `%${status}%` };
        if (network_type_id) whereClause.network_type_id = network_type_id;
        if (level) whereClause.level = { [sequelize.Op.iLike]: `%${level}%` };
        if (online !== undefined) whereClause.online = online === 'true';
        if (access) whereClause.access = { [sequelize.Op.iLike]: `%${access}%` };
        if (pricing) whereClause.pricing = { [sequelize.Op.iLike]: `%${pricing}%` };
        if (facility_id) whereClause.facility_type_id = facility_id;

        // Filter by City Name
        if (city_name) {
            cityWhereClause.city_name = { [sequelize.Op.iLike]: `%${city_name}%` };
        }

        // Filter by Network Name
        if (network_name) {
            networkWhereClause.network_name = { [sequelize.Op.iLike]: `%${network_name}%` };
        }

        // Connector logic
        if (connector) {
            if (connector === 'chk_chademo') whereClause.chademo = { [sequelize.Op.gt]: 0 };
            else if (connector === 'chk_ccs') whereClause.ccs = { [sequelize.Op.gt]: 0 };
            else if (connector === 'chk_tesla') whereClause.tesla = { [sequelize.Op.gt]: 0 };
            else if (connector === 'chk_j1772') whereClause.j1772 = { [sequelize.Op.gt]: 0 };
        }

        const { count, rows } = await PublicStation.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['id', 'ASC']],
            attributes: { exclude: ['city_id', 'zipcode_id', 'network_type_id', 'facility_type_id'] },
            include: [
                { model: City, as: 'city', where: city_name ? cityWhereClause : undefined, attributes: ['id', 'city_name'] },
                { model: NetworkType, as: 'network', where: network_name ? networkWhereClause : undefined, attributes: ['id', 'network_name'] },
                { model: FacilityType, as: 'facility', attributes: ['id', 'facility_name'] }
            ]
        });

        const cleanRows = rows.map(r => {
            const plain = r.toJSON();
            return {
                ...plain,
                city_info: plain.city ? { id: plain.city.id, name: plain.city.city_name } : null,
                network_info: plain.network ? { id: plain.network.id, name: plain.network.network_name } : null,
                facility_info: plain.facility ? { id: plain.facility.id, name: plain.facility.facility_name } : null,
                // Backward compatibility
                city: plain.city ? plain.city.city_name : null,
                network: plain.network ? plain.network.network_name : null,
                facility: plain.facility ? plain.facility.facility_name : null,
            };
        });

        res.status(200).json({
            success: true,
            data: cleanRows,
            pagination: { total: count, page, pages: Math.ceil(count / limit) }
        });
    } catch (error) {
        console.error('Error fetching public stations:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.getPublicStationById = async (req, res) => {
    try {
        const { id } = req.params;
        const station = await PublicStation.findByPk(id, {
            attributes: { exclude: ['city_id', 'zipcode_id', 'network_type_id', 'facility_type_id'] },
            include: [
                {
                    model: City,
                    as: 'city',
                    attributes: ['city_name'],
                    include: [{ model: State, as: 'state', attributes: ['state_name'] }]
                },
                { model: NetworkType, as: 'network', attributes: ['network_name'] },
                { model: FacilityType, as: 'facility', attributes: ['facility_name'] },
                { model: Zipcode, as: 'zipcode', attributes: ['zipcode'] },
                { model: PaymentMethod, as: 'paymentMethods', through: { attributes: [] } }
            ]
        });

        if (!station) return res.status(404).json({ success: false, error: 'Station not found' });

        const checkins = await Checkin.findAll({
            where: { station_id: id },
            limit: 5,
            order: [['created_at', 'DESC']]
        });

        const plain = station.toJSON();

        const robustResponse = {
            id: plain.id,
            identity: {
                name: plain.station_name,
                status: plain.status,
                pricing: plain.pricing,
                access: plain.access,
                online: plain.online,
                network: plain.network ? plain.network.network_name : null,
                network_type_id: plain.network_type_id,
                facility: plain.facility ? plain.facility.facility_name : null,
                facility_type_id: plain.facility_type_id,
            },
            location: {
                address: plain.street_address,
                city: plain.city ? plain.city.city_name : null,
                state: plain.city && plain.city.state ? plain.city.state.state_name : null,
                zip: plain.zipcode ? plain.zipcode.zipcode : null,
                coordinates: {
                    lat: plain.latitude,
                    lng: plain.longitude
                }
            },
            media: {
                image: plain.station_image
            },
            connectors: {
                summary: {
                    total_ports: plain.total_ports,
                    level: plain.level
                },
                types: [
                    { type: 'CHAdeMO', count: plain.chademo, power_kw: plain.chademo_power },
                    { type: 'J1772', count: plain.j1772, power_kw: plain.j1772_power },
                    { type: 'CCS', count: plain.ccs, power_kw: plain.ccs_power },
                    { type: 'Tesla', count: plain.tesla, power_kw: plain.tesla_power },
                    { type: 'NEMA 14-50', count: plain.nema1450 },
                    { type: 'NEMA 5-15', count: plain.nema515 },
                    { type: 'NEMA 5-20', count: plain.nema520 }
                ].filter(c => c.count > 0)
            },
            amenities: {
                payment_methods: plain.paymentMethods ? plain.paymentMethods.map(p => p.method_name) : []
            },
            activity_log: checkins,
            meta: {
                created: plain.createdAt,
                last_updated: plain.updatedAt
            }
        };

        res.status(200).json({
            success: true,
            data: robustResponse
        });
    } catch (error) {
        console.error('Error fetching public station:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.updatePublicStation = async (req, res) => {
    try {
        const { id } = req.params;
        const station = await PublicStation.findByPk(id);
        if (!station) return res.status(404).json({ success: false, error: 'Station not found' });

        const editableFields = [
            'station_name', 'street_address', 'status', 'online', 'pricing', 'access',
            'total_ports', 'level', 'chademo', 'ccs', 'tesla', 'j1772', 'nema1450',
            'nema515', 'nema520', 'chademo_power', 'ccs_power', 'tesla_power',
            'j1772_power', 'latitude', 'longitude', 'station_image',
            'network_type_id', 'facility_type_id'
        ];

        editableFields.forEach(field => {
            if (req.body[field] !== undefined) station[field] = req.body[field];
        });

        // Alias for frontend compatibility: frontend sends image_url, DB uses station_image
        if (req.body.image_url !== undefined) {
            station.station_image = req.body.image_url;
        }

        await station.save();
        res.status(200).json({ success: true, data: station, message: 'Station updated successfully' });
    } catch (error) {
        console.error('Error updating public station:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ==========================================
// PRIVATE CHARGERS (User Added)
// ==========================================

exports.getPrivateChargers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const { status, host_id, host_search, search, connector, min_price, max_price } = req.query;
        console.log('DEBUG: Private Chargers Request:', { status, search, connector, min_price, max_price });

        const whereClause = { deleted: false };
        const hostWhereClause = {};

        // --- Improved Search (Title, Description, Address) ---
        if (search) {
            whereClause[sequelize.Op.or] = [
                { title: { [sequelize.Op.iLike]: `%${search}%` } },
                { description: { [sequelize.Op.iLike]: `%${search}%` } },
                { address: { [sequelize.Op.iLike]: `%${search}%` } }
            ];
        }

        // --- Status Logic ---
        if (status === 'published') whereClause.published = true;
        else if (status === 'draft') whereClause.draft = true;
        else if (status === 'disabled') whereClause.disabled = true;

        // --- Host Filtering ---
        if (host_id) whereClause.createdBy = host_id;
        if (host_search) {
            hostWhereClause[sequelize.Op.or] = [
                { name: { [sequelize.Op.iLike]: `%${host_search}%` } },
                { email: { [sequelize.Op.iLike]: `%${host_search}%` } }
            ];
        }

        // --- Price Range ---
        if (min_price || max_price) {
            whereClause.pricePerHour = {};
            if (min_price) whereClause.pricePerHour[sequelize.Op.gte] = parseFloat(min_price);
            if (max_price) whereClause.pricePerHour[sequelize.Op.lte] = parseFloat(max_price);
        }

        // --- Connector Type (Text Search in CSV field) ---
        if (connector) {
            whereClause.connectorType = { [sequelize.Op.iLike]: `%${connector}%` };
        }

        const { count, rows } = await ChargerListing.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'host',
                    where: host_search ? hostWhereClause : undefined,
                    attributes: ['id', 'name', 'email', 'phone']
                },
                { model: ChargerMedia, as: 'media', limit: 1 }
            ]
        });

        res.status(200).json({
            success: true,
            data: rows,
            pagination: { total: count, page, pages: Math.ceil(count / limit) }
        });
    } catch (error) {
        console.error('Error fetching private chargers:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @desc    Get DEEP Private Charger (Robust)
exports.getPrivateChargerById = async (req, res) => {
    try {
        const { id } = req.params;
        const charger = await ChargerListing.findByPk(id, {
            include: [
                { model: User, as: 'host', attributes: ['id', 'name', 'email', 'phone', 'profileImage'] },
                { model: ChargerMedia, as: 'media' },
                {
                    model: ChargerTiming,
                    as: 'timings',
                    include: [{ model: ChargerDay, as: 'days' }]
                },
                { model: ExtraService, as: 'services' }
            ]
        });

        if (!charger) return res.status(404).json({ success: false, error: 'Charger not found' });

        const [bookings, reviews] = await Promise.all([
            Booking.findAll({
                where: { charger_id: id },
                limit: 20,
                order: [['createdAt', 'DESC']],
                include: [
                    { model: User, as: 'guest', attributes: ['id', 'name', 'email'] },
                    {
                        model: models.Conversation,
                        as: 'conversation',
                        include: [{ model: models.Message, as: 'messages' }]
                    }
                ]
            }),
            StationReview.findAll({
                where: { station_id: charger.iid },
                include: [{ model: User, as: 'author', attributes: ['id', 'name', 'profileImage'] }]
            })
        ]);

        const plain = charger.toJSON();

        // Robust Response Construction
        const robustResponse = {
            id: plain.id,
            identity: {
                title: plain.title,
                description: plain.description,
                host: plain.host,
                status: {
                    published: plain.published,
                    disabled: plain.disabled,
                    draft: plain.draft
                }
            },
            location: {
                address: plain.address,
                coordinates: { lat: plain.lat, lng: plain.lng }
            },
            pricing: {
                hourly: plain.pricePerHour,
                weekend: plain.weekendPrice,
                cancellation_policy: plain.cancellationPolicy
            },
            specs: {
                connector_type: plain.connectorType,
                power_output_kw: plain.powerOutput,
                voltage: plain.voltage,
                amperage: plain.amperage,
                ports: {
                    l2: plain.NumofLevel2Chargers,
                    dc: plain.NumofDCFastChargers
                }
            },
            availability: {
                timings: plain.timings.map(t => ({
                    open: t.from,
                    close: t.to,
                    days: t.days ? t.days.map(d => d.day) : []
                })),
                access_type: plain.access, // if mapped
                is_24_hours: plain.is24Hours
            },
            gallery: plain.media,
            amenities: {
                list: plain.amenities, // JSON array from DB
                facilities: plain.facilities,
                upsells: plain.services // ExtraServices table
            },
            activity_log: bookings.map(b => {
                const plainBooking = b.toJSON();
                return {
                    id: plainBooking.id,
                    guest: plainBooking.guest,
                    dates: { arrive: plainBooking.arriveDate, start: plainBooking.startTime, end: plainBooking.endTime },
                    status: plainBooking.status,
                    payment: {
                        status: plainBooking.paymentStatus,
                        charges: plainBooking.charges,
                        total: plainBooking.subtotal
                    },
                    communication: plainBooking.conversation ? {
                        id: plainBooking.conversation.id,
                        message_count: plainBooking.conversation.messages ? plainBooking.conversation.messages.length : 0,
                        transcript: plainBooking.conversation.messages
                    } : (plainBooking.message ? {
                        id: 'initial',
                        message_count: 1,
                        transcript: [{
                            id: 'initial_msg',
                            sender_id: plainBooking.createdBy,
                            content: plainBooking.message,
                            createdAt: plainBooking.createdAt
                        }]
                    } : null)
                };
            }),
            reviews: reviews,
            meta: {
                created: plain.createdAt,
                updated: plain.updatedAt
            }
        };

        res.status(200).json({
            success: true,
            data: robustResponse
        });
    } catch (error) {
        console.error('Error fetching private charger data:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ... updatePrivateCharger and delete (keep existing) ...
exports.updatePrivateCharger = async (req, res) => {
    try {
        const { id } = req.params;
        const charger = await ChargerListing.findByPk(id);

        if (!charger) return res.status(404).json({ success: false, error: 'Charger not found' });

        const body = req.body;

        // --- Handle Nested Structure (as per spec) ---

        // 1. Identity & Status
        if (body.identity) {
            if (body.identity.title !== undefined) charger.title = body.identity.title;
            if (body.identity.description !== undefined) charger.description = body.identity.description;
            if (body.identity.status) {
                if (body.identity.status.published !== undefined) charger.published = body.identity.status.published;
                if (body.identity.status.disabled !== undefined) charger.disabled = body.identity.status.disabled;
                if (body.identity.status.draft !== undefined) charger.draft = body.identity.status.draft;
            }
        }

        // 2. Location
        if (body.location) {
            if (body.location.address !== undefined) charger.address = body.location.address;
            if (body.location.coordinates) {
                if (body.location.coordinates.lat !== undefined) charger.lat = body.location.coordinates.lat;
                if (body.location.coordinates.lng !== undefined) charger.lng = body.location.coordinates.lng;
            }
        }

        // 3. Pricing & Policies
        if (body.pricing) {
            if (body.pricing.hourly !== undefined) charger.pricePerHour = body.pricing.hourly;
            if (body.pricing.weekend !== undefined) charger.weekendPrice = body.pricing.weekend;
            if (body.pricing.cancellation_policy !== undefined) charger.cancellationPolicy = body.pricing.cancellation_policy;
        }

        // 4. Specs & Hardware
        if (body.specs) {
            if (body.specs.connector_type !== undefined) charger.connectorType = body.specs.connector_type;
            if (body.specs.power_output_kw !== undefined) charger.powerOutput = body.specs.power_output_kw;
            if (body.specs.voltage !== undefined) charger.voltage = body.specs.voltage;
            if (body.specs.amperage !== undefined) charger.amperage = body.specs.amperage;
            if (body.specs.ports) {
                if (body.specs.ports.l2 !== undefined) charger.NumofLevel2Chargers = body.specs.ports.l2;
                if (body.specs.ports.dc !== undefined) charger.NumofDCFastChargers = body.specs.ports.dc;
            }
        }

        // 5. Amenities & Facilities
        if (body.amenities) {
            if (body.amenities.list !== undefined) charger.amenities = body.amenities.list;
            if (body.amenities.facilities !== undefined) charger.facilities = body.amenities.facilities;
        }

        // --- Fallback to Flat Control (for generic updates) ---
        const flatFields = ['deleted', 'access'];
        flatFields.forEach(field => {
            if (body[field] !== undefined) charger[field] = body[field];
        });

        await charger.save();
        res.status(200).json({ success: true, data: charger, message: 'Charger updated successfully' });
    } catch (error) {
        console.error('Error updating private charger:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.updatePrivateChargerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { disabled, published } = req.body;
        const charger = await ChargerListing.findByPk(id);
        if (!charger) return res.status(404).json({ success: false, error: 'Charger not found' });

        if (disabled !== undefined) charger.disabled = disabled;
        if (published !== undefined) charger.published = published;
        await charger.save();
        res.status(200).json({ success: true, data: charger });
    } catch (error) {
        console.error('Error updating charger status:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.deleteChargerMedia = async (req, res) => {
    try {
        const { id, mediaId } = req.params;

        // Find the media record
        const media = await ChargerMedia.findByPk(mediaId);

        if (!media) {
            return res.status(404).json({ success: false, error: 'Media record not found' });
        }

        // --- Validation: Ensure media belongs to the station in URL ---
        // This prevents accidental/malicious deletion of images from other stations
        if (media.charger_id !== id) {
            return res.status(403).json({
                success: false,
                error: 'Authorization failed: This image does not belong to the specified charger station.'
            });
        }

        // --- Cloud Storage Cleanup (Placeholder) ---
        // Note: When Cloudflare integration is ready, we will add the 
        // disk/bucket deletion logic here using the media.path or media.url.
        // console.log(`[TODO] Delete physical file from Cloudflare: ${media.url}`);

        // Remove from Database
        await media.destroy();

        res.status(200).json({
            success: true,
            message: 'Image successfully removed from the registry.'
        });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.deletePublicStationMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const station = await PublicStation.findByPk(id);

        if (!station) {
            return res.status(404).json({ success: false, error: 'Public station not found' });
        }

        // --- Cloud Storage Cleanup (Placeholder) ---
        // station.station_image contains the URL
        // console.log(`[TODO] Delete station image from Cloudflare: ${station.station_image}`);

        // Remove the reference from the database
        station.station_image = null;
        await station.save();

        res.status(200).json({
            success: true,
            message: 'Public station image has been removed from the registry.'
        });
    } catch (error) {
        console.error('Error deleting public station media:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// ==========================================
// LOOKUP DATA (For Filters)
// ==========================================

exports.getNetworks = async (req, res) => {
    try {
        const networks = await NetworkType.findAll({ order: [['network_name', 'ASC']] });
        res.status(200).json({ success: true, data: networks });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error fetching networks' });
    }
};

exports.getFacilities = async (req, res) => {
    try {
        const facilities = await FacilityType.findAll({ order: [['facility_name', 'ASC']] });
        res.status(200).json({ success: true, data: facilities });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error fetching facilities' });
    }
};
