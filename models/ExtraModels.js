const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// --- Reference Tables ---

const City = sequelize.define('City', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    city_name: { type: DataTypes.STRING },
    state_id: { type: DataTypes.INTEGER }
}, { tableName: 'cities', freezeTableName: true, underscored: true, timestamps: false });

const Country = sequelize.define('Country', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    country_name: { type: DataTypes.STRING }
}, { tableName: 'countries', freezeTableName: true, underscored: true, timestamps: false });

const State = sequelize.define('State', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    state_name: { type: DataTypes.STRING },
    country_id: { type: DataTypes.INTEGER }
}, { tableName: 'states', freezeTableName: true, underscored: true, timestamps: false });

const Zipcode = sequelize.define('Zipcode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    zipcode: { type: DataTypes.STRING },
}, { tableName: 'zipcodes', freezeTableName: true, underscored: true, timestamps: false });

const NetworkType = sequelize.define('NetworkType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    network_name: { type: DataTypes.STRING },
}, { tableName: 'network_types', freezeTableName: true, underscored: true, timestamps: false });

const FacilityType = sequelize.define('FacilityType', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    facility_name: { type: DataTypes.STRING },
}, { tableName: 'facility_types', freezeTableName: true, underscored: true, timestamps: false });

// --- Additional Data ---

const ChargerTiming = sequelize.define('ChargerTiming', {
    id: { type: DataTypes.STRING, primaryKey: true },
    charger_id: { type: DataTypes.STRING, allowNull: false },
    from: { type: DataTypes.STRING },
    to: { type: DataTypes.STRING },
    weekday: { type: DataTypes.BOOLEAN }
}, { tableName: 'ChargerTiming', freezeTableName: true, timestamps: false });

const Conversation = sequelize.define('Conversation', {
    id: { type: DataTypes.STRING, primaryKey: true },
    booking_id: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'createdAt' },
    updatedAt: { type: DataTypes.DATE, field: 'updatedAt' }
}, { tableName: 'Conversation', freezeTableName: true, timestamps: true });

const Message = sequelize.define('Message', {
    id: { type: DataTypes.STRING, primaryKey: true },
    conversation_id: { type: DataTypes.STRING, allowNull: false },
    sender_id: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, field: 'createdAt' }
}, { tableName: 'Message', freezeTableName: true, timestamps: true, updatedAt: false });

module.exports = {
    City,
    State,
    Country,
    Zipcode,
    NetworkType,
    FacilityType,
    ChargerTiming,
    Conversation,
    Message
};
