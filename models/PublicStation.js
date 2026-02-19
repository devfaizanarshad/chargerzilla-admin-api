const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PublicStation = sequelize.define('PublicStation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    station_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    street_address: {
        type: DataTypes.STRING
    },
    city_id: {
        type: DataTypes.INTEGER
    },
    zipcode_id: {
        type: DataTypes.INTEGER
    },
    network_type_id: {
        type: DataTypes.INTEGER
    },
    facility_type_id: {
        type: DataTypes.INTEGER
    },
    countryId: {
        type: DataTypes.INTEGER,
        field: 'countryId'
    },
    // Images
    station_image: {
        type: DataTypes.STRING
    },
    image_id: {
        type: DataTypes.INTEGER
    },
    map_image_id: {
        type: DataTypes.INTEGER
    },

    status: {
        type: DataTypes.STRING,
        field: 'Availability'
    },
    online: {
        type: DataTypes.BOOLEAN
    },
    pricing: {
        type: DataTypes.STRING
    },
    access: {
        type: DataTypes.STRING
    },
    // Technical Specs
    total_ports: {
        type: DataTypes.INTEGER,
        field: 'total_no_of_ports'
    },
    level: {
        type: DataTypes.STRING
    },
    // Connectors & Power
    chademo: { type: DataTypes.INTEGER, defaultValue: 0 },
    chademo_power: { type: DataTypes.INTEGER },

    j1772: { type: DataTypes.INTEGER, defaultValue: 0 },
    j1772_power: { type: DataTypes.INTEGER },

    ccs: { type: DataTypes.INTEGER, defaultValue: 0 },
    ccs_power: { type: DataTypes.INTEGER },

    tesla: { type: DataTypes.INTEGER, defaultValue: 0 },
    tesla_power: { type: DataTypes.INTEGER },

    nema1450: { type: DataTypes.INTEGER },
    nema515: { type: DataTypes.INTEGER },
    nema520: { type: DataTypes.INTEGER },

    latitude: {
        type: DataTypes.DOUBLE
    },
    longitude: {
        type: DataTypes.DOUBLE
    },
    created_at: {
        type: DataTypes.DATE
    },
    updated_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'charging_stations',
    freezeTableName: true,
    underscored: true
});

module.exports = PublicStation;
