const mongoose = require('mongoose');
const State = require('../db/models/state');

class StateController {
    addState(req, res, next) {
        console.log('Request received');
        const state = new State({
            _id: new mongoose.Types.ObjectId(),
            fullName: req.body.fullName
        });

        state.save()
            .then(result => {
                res.status(201).json({
                    message: 'State added',
                    createdState: result
                });
            })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
    }
}

module.exports = new StateController();