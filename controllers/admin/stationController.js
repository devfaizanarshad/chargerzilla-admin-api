const models = require('../../models');
const { purgeCache, uploadImage, deleteImage } = require('../../utils/cloudflare');
const crypto = require('crypto');
const {
    ChargerListing, PublicStation, User, ChargerMedia, Booking, StationReview,
    City, State, Country, Zipcode, NetworkType, FacilityType, ChargerTiming, ChargerDay, Conversation, Message,
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
            distinct: true, // Crucial for performance with includes
            attributes: { exclude: ['city_id', 'zipcode_id', 'total_no_of_ports', 'countryId'] },
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
            attributes: { exclude: [] },
            include: [
                {
                    model: City,
                    as: 'city',
                    attributes: ['id', 'city_name'],
                    include: [{ model: State, as: 'state', attributes: ['id', 'state_name'] }]
                },
                { model: NetworkType, as: 'network', attributes: ['id', 'network_name'] },
                { model: FacilityType, as: 'facility', attributes: ['id', 'facility_name'] },
                { model: Zipcode, as: 'zipcode', attributes: ['id', 'zipcode'] },
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
                city_id: plain.city_id,
                state: plain.city && plain.city.state ? plain.city.state.state_name : null,
                state_id: plain.city && plain.city.state ? plain.city.state.id : null,
                zip: plain.zipcode ? plain.zipcode.zipcode : null,
                zipcode_id: plain.zipcode_id,
                country_id: plain.countryId,
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

exports.decommissionPublicStation = async (req, res) => {
    try {
        const { id } = req.params;
        const station = await PublicStation.findByPk(id);
        if (!station) return res.status(404).json({ success: false, error: 'Station not found' });

        station.online = false;
        station.status = 'Decommissioned';
        await station.save();

        // Flush Cloudflare Cache
        try {
            await purgeCache();
        } catch (purgeError) {
            console.error('[STATION] Database updated but Cloudflare purge failed:', purgeError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Station decommissioned and marked offline. Cache purged.',
            data: station
        });
    } catch (error) {
        console.error('Error decommissioning station:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.activatePublicStation = async (req, res) => {
    try {
        const { id } = req.params;
        const station = await PublicStation.findByPk(id);
        if (!station) return res.status(404).json({ success: false, error: 'Station not found' });

        station.online = true;
        station.status = 'Active';
        await station.save();

        // Flush Cloudflare Cache
        try {
            await purgeCache();
        } catch (purgeError) {
            console.error('[STATION] Database updated but Cloudflare purge failed:', purgeError.message);
        }

        res.status(200).json({
            success: true,
            message: 'Station activated and marked online. Cache purged.',
            data: station
        });
    } catch (error) {
        console.error('Error activating station:', error);
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
            'network_type_id', 'facility_type_id', 'city_id', 'zipcode_id', 'countryId'
        ];

        editableFields.forEach(field => {
            if (req.body[field] !== undefined) station[field] = req.body[field];
        });

        // Alias for frontend compatibility: frontend sends image_url, DB uses station_image
        if (req.body.image_url !== undefined) {
            station.station_image = req.body.image_url;
        }

        await station.save();

        // Flush Cloudflare Cache on update
        try {
            await purgeCache();
        } catch (purgeError) {
            console.error('[STATION] Update saved but cache purge failed.');
        }

        res.status(200).json({ success: true, data: station, message: 'Station updated successfully' });
    } catch (error) {
        console.error('Error updating public station:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

const resolveMetadata = async (tableName, nameField, value, parentField = null, parentId = null) => {
    if (!value) return null;
    if (Number.isInteger(value)) return value; // Already an ID

    const model = models[tableName];
    if (!model) return null;

    const where = { [nameField]: { [sequelize.Op.iLike]: value.trim() } };
    if (parentField && parentId) where[parentField] = parentId;

    const [record] = await model.findOrCreate({
        where,
        defaults: { [nameField]: value.trim(), ...(parentField && { [parentField]: parentId }) }
    });
    return record.id;
};

exports.createPublicStation = async (req, res) => {
    try {
        const body = req.body;

        // Resolve Hierarchy: Country -> State -> City
        let countryId = body.countryId;
        if (body.country_name) {
            countryId = await resolveMetadata('Country', 'country_name', body.country_name);
        }

        let stateId = body.state_id;
        if (body.state_name && countryId) {
            stateId = await resolveMetadata('State', 'state_name', body.state_name, 'country_id', countryId);
        }

        let cityId = body.city_id;
        if (body.city_name && stateId) {
            cityId = await resolveMetadata('City', 'city_name', body.city_name, 'state_id', stateId);
        }

        // Resolve Flat Metadata
        const networkId = body.network_name ?
            await resolveMetadata('NetworkType', 'network_name', body.network_name) :
            body.network_type_id;

        const facilityId = body.facility_name ?
            await resolveMetadata('FacilityType', 'facility_name', body.facility_name) :
            body.facility_type_id;

        const zipcodeId = body.zipcode_value ?
            await resolveMetadata('Zipcode', 'zipcode', body.zipcode_value) :
            body.zipcode_id;

        const station = await PublicStation.create({
            ...body,
            countryId: countryId || body.countryId,
            city_id: cityId || body.city_id,
            zipcode_id: zipcodeId || body.zipcode_id,
            network_type_id: networkId || body.network_type_id,
            facility_type_id: facilityId || body.facility_type_id,
            station_image: body.image_url || body.station_image,
            status: body.status || 'Active',
            online: body.online !== undefined ? body.online : true
        });

        try { await purgeCache(); } catch (e) { console.error('Cache purge failed'); }

        res.status(201).json({ success: true, data: station, message: 'Public station created (with metadata resolution)' });
    } catch (error) {
        console.error('Error creating public station:', error);
        res.status(500).json({ success: false, error: 'Server error', detail: error.message });
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
                },
                network: plain.networkType,
                facility: plain.facilityType
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
        console.log('--- UPDATE PRIVATE CHARGER START ---');
        console.log('Body:', JSON.stringify(body, null, 2));

        // 1. Identity & Description
        if (body.identity) {
            if (body.identity.title !== undefined) charger.title = body.identity.title;
            if (body.identity.description !== undefined) charger.description = body.identity.description;
            if (body.identity.status) {
                if (body.identity.status.published !== undefined) charger.published = body.identity.status.published;
                if (body.identity.status.disabled !== undefined) charger.disabled = body.identity.status.disabled;
                if (body.identity.status.draft !== undefined) charger.draft = body.identity.status.draft;
            }
        } else {
            // Fallback for flat identity fields
            if (body.title !== undefined) charger.title = body.title;
            if (body.description !== undefined) charger.description = body.description;
        }

        // 2. Location
        if (body.location) {
            if (body.location.address !== undefined) charger.address = body.location.address;
            if (body.location.coordinates) {
                if (body.location.coordinates.lat !== undefined) charger.lat = body.location.coordinates.lat;
                if (body.location.coordinates.lng !== undefined) charger.lng = body.location.coordinates.lng;
            }
        } else {
            // Fallback for flat location fields
            if (body.address !== undefined) charger.address = body.address;
            if (body.lat !== undefined) charger.lat = body.lat;
            if (body.lng !== undefined) charger.lng = body.lng;
            if (body.zipcode !== undefined) charger.zipcode = body.zipcode;
        }

        // 3. Pricing
        if (body.pricing) {
            if (body.pricing.hourly !== undefined) charger.pricePerHour = body.pricing.hourly;
            if (body.pricing.weekend !== undefined) charger.weekendPrice = body.pricing.weekend;
            if (body.pricing.cancellation_policy !== undefined) charger.cancellationPolicy = body.pricing.cancellation_policy;
        } else {
            // Fallback for flat pricing fields
            if (body.pricePerHour !== undefined) charger.pricePerHour = body.pricePerHour;
            if (body.weekendPrice !== undefined) charger.weekendPrice = body.weekendPrice;
        }

        // 4. Specs
        if (body.specs) {
            if (body.specs.connector_type !== undefined) charger.connectorType = body.specs.connector_type;
            if (body.specs.power_output_kw !== undefined) charger.powerOutput = body.specs.power_output_kw;
            if (body.specs.voltage !== undefined) charger.voltage = body.specs.voltage;
            if (body.specs.amperage !== undefined) charger.amperage = body.specs.amperage;
            if (body.specs.ports) {
                if (body.specs.ports.l2 !== undefined) charger.NumofLevel2Chargers = body.specs.ports.l2;
                if (body.specs.ports.dc !== undefined) charger.NumofDCFastChargers = body.specs.ports.dc;
            }
        } else {
            // Fallback for flat specs fields
            if (body.connectorType !== undefined) charger.connectorType = body.connectorType;
            if (body.powerOutput !== undefined) charger.powerOutput = body.powerOutput;
            if (body.NumofLevel2Chargers !== undefined) charger.NumofLevel2Chargers = body.NumofLevel2Chargers;
            if (body.NumofDCFastChargers !== undefined) charger.NumofDCFastChargers = body.NumofDCFastChargers;
        }

        // 5. Amenities & Facilities (Special handling for PostgreSQL Arrays)
        if (body.amenities) {
            // Frontend spec: { amenities: { list: [], facilities: [] } }
            if (body.amenities.list !== undefined) {
                charger.amenities = body.amenities.list;
            } else if (Array.isArray(body.amenities)) {
                // Support flat array update too
                charger.amenities = body.amenities;
            }

            if (body.amenities.facilities !== undefined) {
                charger.facilities = body.amenities.facilities;
            }
        }

        // Support flat facilities update
        if (body.facilities !== undefined && Array.isArray(body.facilities)) {
            charger.facilities = body.facilities;
        }

        // 6. Metadata/Generic Fields
        if (body.createdBy) charger.createdBy = body.createdBy;
        if (body.is24Hours !== undefined) charger.is24Hours = body.is24Hours;

        // 7. Resolve Network & Facility names if IDs are provided
        const networkId = (body.identity && body.identity.network_type_id) || body.network_type_id;
        if (networkId) {
            const nt = await NetworkType.findByPk(networkId);
            if (nt) charger.networkType = nt.network_name;
        } else if (body.networkType !== undefined) {
            charger.networkType = body.networkType;
        }

        const facilityId = (body.identity && body.identity.facility_type_id) || body.facility_type_id;
        if (facilityId) {
            const ft = await FacilityType.findByPk(facilityId);
            if (ft) charger.facilityType = ft.facility_name;
        } else if (body.facilityType !== undefined) {
            charger.facilityType = body.facilityType;
        }

        const genericFields = ['deleted', 'disabled', 'published', 'draft', 'access'];
        genericFields.forEach(field => {
            if (body[field] !== undefined) charger[field] = body[field];
        });

        await charger.save();
        console.log('--- UPDATE PRIVATE CHARGER SUCCESS ---');
        res.status(200).json({ success: true, data: charger, message: 'Charger identity updated in registry.' });
    } catch (error) {
        console.error('Error updating private charger:', error);
        res.status(500).json({ success: false, error: 'Database Synchronization Error', detail: error.message });
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

exports.createPrivateCharger = async (req, res) => {
    try {
        const body = req.body;
        console.log('--- CREATE PRIVATE CHARGER START ---');
        console.log('Body:', JSON.stringify(body, null, 2));

        const id = crypto.randomBytes(11).toString('hex'); // 22 characters

        // Prepare data object for creation
        const chargerData = {
            id,
            deleted: false
        };

        // 1. Identity & Description
        if (body.identity) {
            if (body.identity.title !== undefined) chargerData.title = body.identity.title;
            if (body.identity.description !== undefined) chargerData.description = body.identity.description;
            if (body.identity.status) {
                if (body.identity.status.published !== undefined) chargerData.published = body.identity.status.published;
                if (body.identity.status.disabled !== undefined) chargerData.disabled = body.identity.status.disabled;
                if (body.identity.status.draft !== undefined) chargerData.draft = body.identity.status.draft;
            }
        } else {
            // Fallback for flat identity fields
            if (body.title !== undefined) chargerData.title = body.title;
            if (body.description !== undefined) chargerData.description = body.description;
        }

        // Defaults for status if not provided
        if (chargerData.published === undefined) chargerData.published = body.published !== undefined ? body.published : true;
        if (chargerData.draft === undefined) chargerData.draft = body.draft !== undefined ? body.draft : false;
        if (chargerData.disabled === undefined) chargerData.disabled = body.disabled !== undefined ? body.disabled : false;

        // 2. Location
        if (body.location) {
            if (body.location.address !== undefined) chargerData.address = body.location.address;
            if (body.location.coordinates) {
                if (body.location.coordinates.lat !== undefined) chargerData.lat = body.location.coordinates.lat;
                if (body.location.coordinates.lng !== undefined) chargerData.lng = body.location.coordinates.lng;
            }
        } else {
            // Fallback for flat location fields
            if (body.address !== undefined) chargerData.address = body.address;
            if (body.lat !== undefined) chargerData.lat = body.lat;
            if (body.lng !== undefined) chargerData.lng = body.lng;
        }

        // 3. Pricing
        if (body.pricing) {
            if (body.pricing.hourly !== undefined) chargerData.pricePerHour = body.pricing.hourly;
            if (body.pricing.weekend !== undefined) chargerData.weekendPrice = body.pricing.weekend;
            if (body.pricing.cancellation_policy !== undefined) chargerData.cancellationPolicy = body.pricing.cancellation_policy;
        } else {
            // Fallback for flat pricing fields
            if (body.pricePerHour !== undefined) chargerData.pricePerHour = body.pricePerHour;
            if (body.weekendPrice !== undefined) chargerData.weekendPrice = body.weekendPrice;
            if (body.cancellationPolicy !== undefined) chargerData.cancellationPolicy = body.cancellationPolicy;
        }

        // 4. Specs
        if (body.specs) {
            if (body.specs.connector_type !== undefined) chargerData.connectorType = body.specs.connector_type;
            if (body.specs.power_output_kw !== undefined) chargerData.powerOutput = body.specs.power_output_kw;
            if (body.specs.voltage !== undefined) chargerData.voltage = body.specs.voltage;
            if (body.specs.amperage !== undefined) chargerData.amperage = body.specs.amperage;
            if (body.specs.ports) {
                if (body.specs.ports.l2 !== undefined) chargerData.NumofLevel2Chargers = body.specs.ports.l2;
                if (body.specs.ports.dc !== undefined) chargerData.NumofDCFastChargers = body.specs.ports.dc;
            }
        } else {
            // Fallback for flat specs fields
            if (body.connectorType !== undefined) chargerData.connectorType = body.connectorType;
            if (body.powerOutput !== undefined) chargerData.powerOutput = body.powerOutput;
            if (body.voltage !== undefined) chargerData.voltage = body.voltage;
            if (body.amperage !== undefined) chargerData.amperage = body.amperage;
            if (body.NumofLevel2Chargers !== undefined) chargerData.NumofLevel2Chargers = body.NumofLevel2Chargers;
            if (body.NumofDCFastChargers !== undefined) chargerData.NumofDCFastChargers = body.NumofDCFastChargers;
        }

        // 5. Amenities & Facilities
        if (body.amenities) {
            if (body.amenities.list !== undefined) {
                chargerData.amenities = body.amenities.list;
            } else if (Array.isArray(body.amenities)) {
                chargerData.amenities = body.amenities;
            }

            if (body.amenities.facilities !== undefined) {
                chargerData.facilities = body.amenities.facilities;
            }
        }
        if (body.facilities !== undefined && Array.isArray(body.facilities)) {
            chargerData.facilities = body.facilities;
        }

        // 6. Metadata/Generic Fields
        if (body.createdBy) chargerData.createdBy = body.createdBy;
        if (body.is24Hours !== undefined) chargerData.is24Hours = body.is24Hours;
        if (body.zipcode !== undefined) chargerData.zipcode = body.zipcode;

        // 7. Resolve Network & Facility names if IDs are provided
        const networkId = (body.identity && body.identity.network_type_id) || body.network_type_id;
        if (networkId) {
            const nt = await NetworkType.findByPk(networkId);
            if (nt) chargerData.networkType = nt.network_name;
        } else if (body.networkType !== undefined) {
            chargerData.networkType = body.networkType;
        }

        const facilityId = (body.identity && body.identity.facility_type_id) || body.facility_type_id;
        if (facilityId) {
            const ft = await FacilityType.findByPk(facilityId);
            if (ft) chargerData.facilityType = ft.facility_name;
        } else if (body.facilityType !== undefined) {
            chargerData.facilityType = body.facilityType;
        }

        const charger = await ChargerListing.create(chargerData);

        console.log('--- CREATE PRIVATE CHARGER SUCCESS ---');
        res.status(201).json({ success: true, data: charger, message: 'Private charger created successfully' });
    } catch (error) {
        console.error('Error creating private charger:', error);
        res.status(500).json({ success: false, error: 'Server error', detail: error.message });
    }
};

/**
 * Helper to extract Cloudflare Image ID from URL
 * Supports: https://imagedelivery.net/<HASH>/<IMAGE_ID>/<VARIANT>
 */
const extractCloudflareId = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    // Check if it's a Cloudflare image delivery URL
    if (url.includes('imagedelivery.net') && parts.length >= 5) {
        return parts[4]; // The ID is usually the 5th part
    }
    return null;
};

exports.deleteChargerMedia = async (req, res) => {
    try {
        const { id, mediaId } = req.params;
        const media = await ChargerMedia.findByPk(mediaId);

        if (!media) {
            return res.status(404).json({ success: false, error: 'Media record not found' });
        }

        if (media.charger_id !== id) {
            return res.status(403).json({ success: false, error: 'Authorization failed' });
        }

        // Delete from Cloudflare
        const cloudflareId = extractCloudflareId(media.url);
        if (cloudflareId) {
            console.log(`[CLOUDFLARE] Deleting image ID: ${cloudflareId}`);
            await deleteImage(cloudflareId);
        }

        await media.destroy();
        res.status(200).json({ success: true, message: 'Image deleted from Cloudflare and DB.' });
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

        // Delete from Cloudflare
        const cloudflareId = extractCloudflareId(station.station_image);
        if (cloudflareId) {
            console.log(`[CLOUDFLARE] Deleting station image ID: ${cloudflareId}`);
            await deleteImage(cloudflareId);
        }

        station.station_image = null;
        await station.save();

        res.status(200).json({ success: true, message: 'Station image deleted from Cloudflare and DB.' });
    } catch (error) {
        console.error('Error deleting public station media:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

exports.uploadPublicStationImage = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ success: false, error: 'No image file provided' });

        const station = await PublicStation.findByPk(id);
        if (!station) return res.status(404).json({ success: false, error: 'Station not found' });

        // 1. Delete old image if exists
        const oldId = extractCloudflareId(station.station_image);
        if (oldId) await deleteImage(oldId);

        // 2. Upload new image
        const result = await uploadImage(
            req.file.buffer,
            `station_${id}_${Date.now()}_${req.file.originalname}`,
            req.file.mimetype
        );

        // 3. Update DB
        // result.variants[0] is usually the public URL
        station.station_image = result.variants[0];
        await station.save();

        res.status(200).json({
            success: true,
            message: 'Image uploaded to Cloudflare and updated in DB',
            url: station.station_image
        });
    } catch (error) {
        console.error('Error in station image upload:', error);
        res.status(500).json({ success: false, error: 'Upload process failed' });
    }
};

exports.uploadPrivateChargerMedia = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ success: false, error: 'No image file provided' });

        const charger = await ChargerListing.findByPk(id);
        if (!charger) return res.status(404).json({ success: false, error: 'Charger not found' });

        // Upload to Cloudflare
        const result = await uploadImage(
            req.file.buffer,
            `charger_${id}_${Date.now()}_${req.file.originalname}`,
            req.file.mimetype
        );

        // Save to ChargerMedia table
        // We use the record's ID from Cloudflare as the DB ID for easy tracking
        const newMedia = await ChargerMedia.create({
            id: result.id,
            charger_id: id,
            url: result.variants[0]
        });

        res.status(200).json({
            success: true,
            message: 'Media uploaded to Cloudflare and added to gallery',
            data: newMedia
        });
    } catch (error) {
        console.error('Error in charger media upload:', error);
        res.status(500).json({ success: false, error: 'Upload process failed' });
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
