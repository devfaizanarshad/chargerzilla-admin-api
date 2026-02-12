const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'guest'
    },
    phoneNumber: {
        type: DataTypes.STRING,
        field: 'phone'
    },
    active_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'active_status'
    },
    delete_status: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'delete_status'
    },
    isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'isEmailVerified'
    },
    isNewEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'isNewEmailVerified'
    },
    stripeCustomerId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'stripeCustomerId'
    },
    stripeAccountId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'stripeAccountId'
    },
    isStripeVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'isStripeVerified'
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
    tableName: 'master_user',
    freezeTableName: true,
    underscored: false // Disable auto-snake_casing because DB has mixed naming
});

module.exports = User;
