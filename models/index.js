const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/db');

const User = require('./User');
const ChargerListing = require('./ChargerListing');
const Booking = require('./Booking');
const StationReview = require('./StationReview');
const ChargerMedia = require('./ChargerMedia');
const PublicStation = require('./PublicStation');
const ChargerDay = require('./ChargerDay');
const {
    City, State, Zipcode, NetworkType, FacilityType,
    ChargerTiming, Conversation, Message
} = require('./ExtraModels');
const {
    Vehicle, Trip, Checkin, Favorite,
    ExtraService, PaymentMethod, StationPayment
} = require('./ContextModels');

// ==========================================
// USER RELATIONSHIPS
// ==========================================

// User Hosted Chargers
User.hasMany(ChargerListing, { foreignKey: 'createdBy', as: 'listings' });
ChargerListing.belongsTo(User, { foreignKey: 'createdBy', as: 'host' });

// User Bookings
User.hasMany(Booking, { foreignKey: 'createdBy', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'createdBy', as: 'guest' });

// User Reviews
User.hasMany(StationReview, { foreignKey: 'reviewBy', as: 'reviews' });
StationReview.belongsTo(User, { foreignKey: 'reviewBy', as: 'author' });

// User Vehicle
User.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

// User Trips
User.hasMany(Trip, { foreignKey: 'user_id', as: 'trips' });
Trip.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User History
User.hasMany(Checkin, { foreignKey: 'user_id', as: 'checkins' });
Checkin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ==========================================
// PRIVATE CHARGER RELATIONSHIPS
// ==========================================

// Bookings
ChargerListing.hasMany(Booking, { foreignKey: 'charger_id', sourceKey: 'id', as: 'bookings' });
Booking.belongsTo(ChargerListing, { foreignKey: 'charger_id', targetKey: 'id', as: 'charger' });

// Media
ChargerListing.hasMany(ChargerMedia, { foreignKey: 'charger_id', sourceKey: 'id', as: 'media' });
ChargerMedia.belongsTo(ChargerListing, { foreignKey: 'charger_id', targetKey: 'id' });

// Timing / Schedule / Days
ChargerListing.hasMany(ChargerTiming, { foreignKey: 'charger_id', sourceKey: 'id', as: 'timings' });
ChargerTiming.belongsTo(ChargerListing, { foreignKey: 'charger_id', targetKey: 'id' });

ChargerTiming.hasMany(ChargerDay, { foreignKey: 'timing_id', as: 'days' });
ChargerDay.belongsTo(ChargerTiming, { foreignKey: 'timing_id', as: 'timing' });

// Extra Services
ChargerListing.hasMany(ExtraService, { foreignKey: 'charger_id', sourceKey: 'id', as: 'services' });
ExtraService.belongsTo(ChargerListing, { foreignKey: 'charger_id', targetKey: 'id' });

// Reviews
ChargerListing.hasMany(StationReview, { foreignKey: 'station_id', sourceKey: 'iid', as: 'reviews' });
StationReview.belongsTo(ChargerListing, { foreignKey: 'station_id', targetKey: 'iid', as: 'station' });

// ==========================================
// PUBLIC STATION RELATIONSHIPS
// ==========================================

// Lookup Data
City.belongsTo(State, { foreignKey: 'state_id', as: 'state' });
PublicStation.belongsTo(City, { foreignKey: 'city_id', as: 'city' });
PublicStation.belongsTo(Zipcode, { foreignKey: 'zipcode_id', as: 'zipcode' });
PublicStation.belongsTo(NetworkType, { foreignKey: 'network_type_id', as: 'network' });
PublicStation.belongsTo(FacilityType, { foreignKey: 'facility_type_id', as: 'facility' });

// Social Proof
PublicStation.hasMany(Checkin, { foreignKey: 'station_id', as: 'checkins' });
Checkin.belongsTo(PublicStation, { foreignKey: 'station_id', as: 'station' });

// Payment Methods
PublicStation.belongsToMany(PaymentMethod, {
    through: StationPayment,
    foreignKey: 'A',
    otherKey: 'B',
    as: 'paymentMethods'
});
PaymentMethod.belongsToMany(PublicStation, {
    through: StationPayment,
    foreignKey: 'B',
    otherKey: 'A',
    as: 'stations'
});

// ==========================================
// COMMUNICATION (BOOKING CHAT)
// ==========================================

Booking.hasOne(Conversation, { foreignKey: 'booking_id', sourceKey: 'id', as: 'conversation' });
Conversation.belongsTo(Booking, { foreignKey: 'booking_id', targetKey: 'id', as: 'booking' });

Conversation.hasMany(Message, { foreignKey: 'conversation_id', sourceKey: 'id', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', targetKey: 'id', as: 'conversation' });

sequelize.Op = Op;
module.exports = {
    sequelize,

    User, ChargerListing, Booking, StationReview, ChargerMedia, PublicStation, ChargerDay,
    City, State, Zipcode, NetworkType, FacilityType, ChargerTiming, Conversation, Message,
    Vehicle, Trip, Checkin, Favorite, ExtraService, PaymentMethod
};
