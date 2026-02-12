const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// --- User Context Models ---

const Vehicle = sequelize.define('Vehicle', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    make: { type: DataTypes.STRING },
    model: { type: DataTypes.STRING },
    vehicle_type: { type: DataTypes.STRING }, // 'BEV', 'PHEV'
    battery_capacity: { type: DataTypes.STRING },
    charging_speed: { type: DataTypes.STRING }
}, { tableName: 'vehicles', freezeTableName: true, underscored: true, timestamps: false });

const Trip = sequelize.define('Trip', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    origin_location: { type: DataTypes.TEXT },
    destination_location: { type: DataTypes.TEXT },
    title: { type: DataTypes.STRING },
    distance: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE },
    active_status: { type: DataTypes.BOOLEAN }
}, { tableName: 'trip_to_station', freezeTableName: true, underscored: true, timestamps: false });

// --- Interaction Models ---

const Checkin = sequelize.define('Checkin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    station_id: { type: DataTypes.INTEGER, allowNull: false }, // Public Station ID
    type: { type: DataTypes.STRING }, // 'Plugged In', etc.
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE }
}, { tableName: 'checkins', freezeTableName: true, underscored: true, timestamps: false });

const Favorite = sequelize.define('Favorite', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    station_id: { type: DataTypes.INTEGER }, // Public Station ID
    charger_id: { type: DataTypes.INTEGER }, // Private Charger IID (likely)
    active_status: { type: DataTypes.BOOLEAN }
}, { tableName: 'favourite_station', freezeTableName: true, underscored: true, timestamps: false });

// --- Charger Context Models ---

const ExtraService = sequelize.define('ExtraService', {
    id: { type: DataTypes.STRING, primaryKey: true },
    charger_id: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.DOUBLE, allowNull: false },
    flatFee: { type: DataTypes.BOOLEAN }
}, { tableName: 'ExtraService', freezeTableName: true, timestamps: false });

const PaymentMethod = sequelize.define('PaymentMethod', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    iconname: { type: DataTypes.STRING }
}, { tableName: 'payment_methods', freezeTableName: true, underscored: true, timestamps: false });

// Join Table for Public Stations <-> Payment Methods
const StationPayment = sequelize.define('StationPayment', {
    A: { type: DataTypes.INTEGER, primaryKey: true, field: 'A' }, // Station ID
    B: { type: DataTypes.INTEGER, primaryKey: true, field: 'B' }  // PaymentMethod ID
}, { tableName: '_ChargingStationToPaymentMethod', freezeTableName: true, timestamps: false });

module.exports = {
    Vehicle,
    Trip,
    Checkin,
    Favorite,
    ExtraService,
    PaymentMethod,
    StationPayment
};
