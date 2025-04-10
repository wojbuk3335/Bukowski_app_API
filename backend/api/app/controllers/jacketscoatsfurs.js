const JacketsCoatsFurs = require('../db/models/jacketscoatsfurs');
const mongoose = require('mongoose');
const config = require('../config');

class JacketsCoatsFursController {
    getAll(req, res, next) {
        JacketsCoatsFurs.find()
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(items => {
                const response = {
                    count: items.length,
                    items: items.map(item => ({
                        _id: item._id,
                        Kat_1_Kod_1: item.Kat_1_Kod_1,
                        Kat_1_Opis_1: item.Kat_1_Opis_1,
                        Plec: item.Plec,
                        request: {
                            type: 'GET',
                            url: `${config.domain}/api/excel/jacketscoatsfurs/${item._id}`
                        }
                    }))
                };
                res.status(200).json(response);
            })
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }

    insertMany(req, res, next) {
        const items = req.body;

        const katKodSet = new Set();
        for (const item of items) {
            if (katKodSet.has(item.Kat_1_Kod_1)) {
                return res.status(400).json({ error: { message: 'Duplicate Kat_1_Kod_1 values in request body' } });
            }
            katKodSet.add(item.Kat_1_Kod_1);
        }

        JacketsCoatsFurs.insertMany(items)
            .then(result => res.status(201).json({ message: 'Items inserted', items: result }))
            .catch(err => {
                if (err.code === 11000) {
                    res.status(400).json({ error: { message: 'Duplicate Kat_1_Kod_1 values' } });
                } else {
                    res.status(500).json({ error: { message: err.message } });
                }
            });
    }

    deleteAll(req, res, next) {
        JacketsCoatsFurs.deleteMany()
            .then(() => res.status(200).json({ message: 'All items deleted' }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }

    getById(req, res, next) {
        const id = req.params.itemId;
        JacketsCoatsFurs.findById(id)
            .select('_id Kat_1_Kod_1 Kat_1_Opis_1 Plec')
            .then(item => {
                if (item) {
                    res.status(200).json({
                        item,
                        request: { type: 'GET', url: `${config.domain}/api/excel/jacketscoatsfurs/get-all` }
                    });
                } else {
                    res.status(404).json({ error: { message: 'Item not found' } });
                }
            })
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }

    updateById(req, res, next) {
        const id = req.params.itemId;
        const updateOps = {};
        for (const key in req.body) {
            if (req.body.hasOwnProperty(key)) {
                updateOps[key] = req.body[key];
            }
        }
        JacketsCoatsFurs.findByIdAndUpdate(id, { $set: updateOps }, { new: true })
            .then(() => res.status(200).json({ message: 'Item updated' }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }

    updateMany(req, res, next) {
        const updates = req.body;

        const bulkOps = updates.map(update => ({
            updateOne: {
                filter: { _id: update._id },
                update: { $set: update }
            }
        }));

        JacketsCoatsFurs.bulkWrite(bulkOps)
            .then(() => res.status(200).json({ message: 'Items updated successfully' }))
            .catch(err => res.status(500).json({ error: { message: err.message } }));
    }
}

module.exports = new JacketsCoatsFursController();
