const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    charger_id: {
        type: DataTypes.STRING, // Links to ChargerListing.id
        allowNull: false
    },
    arriveDate: {
        type: DataTypes.DATEONLY
    },
    startTime: {
        type: DataTypes.STRING // "15:30:00"
    },
    endTime: {
        type: DataTypes.STRING
    },
    totalHours: {
        type: DataTypes.FLOAT
    },
    subtotal: {
        type: DataTypes.FLOAT // Gross amount including fees?
    },
    message: {
        type: DataTypes.TEXT
    },
    paymentStatus: {
        type: DataTypes.STRING // "pending", "captured", "funds-released"
    },
    paymentIntentId: {
        type: DataTypes.STRING // Stripe
    },
    status: {
        type: DataTypes.STRING // "Reserved", "CancelledByHost"
    },

    // Financial Breakdown (Vital for Admin)
    charges: {
        type: DataTypes.JSON // {"finalCost":"2.75","bookingFee":"0.25",...}
    },

    // Upsells
    extras: {
        type: DataTypes.JSON // [{"name":"Coke","price":1}]
    },

    createdBy: {
        type: DataTypes.INTEGER, // User ID
        allowNull: false
    },
    createdAt: { field: 'createdAt', type: DataTypes.DATE },
    updatedAt: { field: 'updatedAt', type: DataTypes.DATE }
}, {
    tableName: 'Booking',
    freezeTableName: true
});

module.exports = Booking;
