const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChargerListing = sequelize.define('ChargerListing', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    iid: {
        type: DataTypes.INTEGER,
        unique: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING
    },
    description: {
        type: DataTypes.TEXT
    },
    address: {
        type: DataTypes.STRING
    },
    lat: {
        type: DataTypes.FLOAT
    },
    lng: {
        type: DataTypes.FLOAT
    },

    // Technical Specs
    connectorType: { type: DataTypes.STRING }, // CSV "J1772,CCS"
    powerOutput: { type: DataTypes.FLOAT },
    voltage: { type: DataTypes.INTEGER },
    amperage: { type: DataTypes.INTEGER },

    // Ports
    NumofLevel2Chargers: { type: DataTypes.INTEGER, defaultValue: 0 },
    NumofDCFastChargers: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Pricing & Policies
    pricePerHour: { type: DataTypes.FLOAT },
    weekendPrice: { type: DataTypes.FLOAT },
    cancellationPolicy: { type: DataTypes.TEXT },
    smokingAllowed: { type: DataTypes.BOOLEAN },

    // Amenities & Facilities (PostgreSQL ARRAY)
    amenities: { type: DataTypes.ARRAY(DataTypes.STRING) },
    facilities: { type: DataTypes.ARRAY(DataTypes.STRING) },

    // Status
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    disabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    draft: { type: DataTypes.BOOLEAN, defaultValue: false },
    published: { type: DataTypes.BOOLEAN, defaultValue: true },

    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE }
}, {
    tableName: 'ChargerListing',
    freezeTableName: true
});

module.exports = ChargerListing;
