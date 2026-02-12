const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChargerMedia = sequelize.define('ChargerMedia', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    charger_id: {
        type: DataTypes.STRING,
        allowNull: false
        // Links to ChargerListing.id (string)
    },
    // No timestamps in schema based on analysis, oh wait, look at schema output again.
    // Analysis output for ChargerMedia:
    // id: text NOT NULL
    // url: text NOT NULL
    // charger_id: text NOT NULL
    // NO TIMESTAMP columns listed in Sample Data or Schema output (Step 38, line 123-126).
    // I will disable timestamps.
}, {
    tableName: 'ChargerMedia',
    freezeTableName: true,
    timestamps: false
});

module.exports = ChargerMedia;
