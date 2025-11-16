require('dotenv').config();

class ConfigController {
    static getConfig(req, res) {
        try {
            res.json({
                domain: process.env.DOMAIN
            });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

module.exports = ConfigController;

