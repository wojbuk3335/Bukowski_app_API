const Bags = require('../db/models/bags');
const mongoose = require('mongoose');

// Get all bags
exports.getAllBags = async (req, res, next) => {
    try {
        const bags = await Bags.find();
        res.status(200).json({
            bags: bags
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Insert many Bags
exports.insertManyBags = async (req, res, next) => {
    try {
        // Check for duplicates
        for (const bagItem of req.body) {
            if (bagItem.Torebki_Nr) {
                const existingBag = await Bags.findOne({ Torebki_Nr: bagItem.Torebki_Nr });
                if (existingBag) {
                    return res.status(400).json({
                        message: `Bag with Torebki_Nr ${bagItem.Torebki_Nr} already exists`
                    });
                }
            }
        }

        // Add _id to each item if not present
        const itemsWithIds = req.body.map(bagItem => ({
            ...bagItem,
            _id: bagItem._id || new mongoose.Types.ObjectId()
        }));

        const result = await Bags.insertMany(itemsWithIds);
        res.status(201).json({
            message: "Bagss inserted successfully",
            Bagss: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update many Bags
exports.updateManyBags = async (req, res, next) => {
    try {
        const updatePromises = req.body.map(bagItem => {
            return Bags.findByIdAndUpdate(
                bagItem._id,
                { 
                    Torebki_Nr: bagItem.Torebki_Nr,
                    Torebki_Kod: bagItem.Torebki_Kod
                },
                { new: true }
            );
        });

        const results = await Promise.all(updatePromises);
        res.status(200).json({
            message: "Bagss updated successfully",
            Bagss: results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update single Bags
exports.updateBags = async (req, res, next) => {
    try {
        const id = req.params.id;
        
        // Check for duplicate Torebki_Nr (excluding current Bags)
        if (req.body.Torebki_Nr) {
            const existingBags = await Bags.findOne({ 
                Torebki_Nr: req.body.Torebki_Nr,
                _id: { $ne: id }
            });
            if (existingBags) {
                return res.status(400).json({
                    message: `Bags with Torebki_Nr ${req.body.Torebki_Nr} already exists`
                });
            }
        }

        const updatedBag = await Bags.findByIdAndUpdate(
            id,
            { 
                Torebki_Nr: req.body.Torebki_Nr,
                Torebki_Kod: req.body.Torebki_Kod
            },
            { new: true }
        );

        if (!updatedBag) {
            return res.status(404).json({ message: "Bag not found" });
        }

        res.status(200).json({
            message: "Bag updated successfully",
            bag: updatedBag
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single Bags
exports.deleteBags = async (req, res, next) => {
    try {
        const id = req.params.id;
        const deletedBag = await Bags.findByIdAndDelete(id);

        if (!deletedBag) {
            return res.status(404).json({ message: "Bag not found" });
        }

        res.status(200).json({
            message: "Bag deleted successfully",
            bag: deletedBag
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete all Bags
exports.deleteAllBags = async (req, res, next) => {
    try {
        const result = await Bags.deleteMany({});
        res.status(200).json({
            message: "All Bagss deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
