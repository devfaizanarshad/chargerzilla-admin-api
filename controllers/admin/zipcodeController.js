const models = require('../../models');
const { Zipcode } = models;

/**
 * @desc Get all zipcodes from the database
 * @route GET /api/admin/zipcodes
 */
exports.getAllZipcodes = async (req, res) => {
    try {
        const { search } = req.query;
        const whereClause = {};

        if (search) {
            whereClause.zipcode = { [models.sequelize.Op.iLike]: `%${search}%` };
        }

        const zipcodes = await Zipcode.findAll({
            where: whereClause,
            order: [['zipcode', 'ASC']],
            limit: 500 // Safety limit
        });

        res.status(200).json({
            success: true,
            count: zipcodes.length,
            data: zipcodes
        });
    } catch (error) {
        console.error('Error fetching zipcodes:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};
