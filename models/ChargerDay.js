const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChargerDay = sequelize.define('ChargerDay', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    day: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timing_id: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'ChargerDay',
    freezeTableName: true,
    timestamps: false // Schema didn't show timestamps for this table
});

module.exports = ChargerDay;
