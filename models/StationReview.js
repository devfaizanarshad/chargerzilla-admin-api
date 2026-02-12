const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StationReview = sequelize.define('StationReview', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    station_id: {
        type: DataTypes.INTEGER,
        allowNull: false
        // Links to ChargerListing.iid
    },
    review: {
        type: DataTypes.STRING,
        allowNull: true
    },
    stars: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    reviewBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'reviewBy' // Explicitly map to DB column 'reviewBy'
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
    }
}, {
    tableName: 'station_review',
    freezeTableName: true,
    underscored: true // Keep this for auto-mapping other fields if needed, 
    // but we explicitly mapped the key ones.
});

module.exports = StationReview;
