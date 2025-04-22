const History = require('../db/models/history');

class HistoryController {
    getAllHistory = async (req, res, next) => {
        try {
            const history = await History.find().populate('userloggedinId', 'username');
            res.status(200).json(history);
        } catch (err) {
            console.log(err);
            res.status(500).json({
                error: err
            });
        }
    };

    removeAllHistory = async (req, res, next) => {
        try {
            await History.deleteMany({});
            res.status(200).json({ message: 'History cleared successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
}


module.exports = new HistoryController();