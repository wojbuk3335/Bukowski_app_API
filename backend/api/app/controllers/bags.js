const Bags = require('../db/models/bags');

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
        for (const Bags of req.body) {
            if (Bags.Torebki_Nr) {
                const existingBags = await Bags.findOne({ Torebki_Nr: Bags.Torebki_Nr });
                if (existingBags) {
                    return res.status(400).json({
                        message: `Bags with Torebki_Nr ${Bags.Torebki_Nr} already exists`
                    });
                }
            }
        }

        const result = await Bags.insertMany(req.body);
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
        const updatePromises = req.body.map(Bags => {
            return Bags.findByIdAndUpdate(
                Bags._id,
                { 
                    Torebki_Nr: Bags.Torebki_Nr,
                    Torebki_Kod: Bags.Torebki_Kod
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

        const Bags = await Bags.findByIdAndUpdate(
            id,
            { 
                Torebki_Nr: req.body.Torebki_Nr,
                Torebki_Kod: req.body.Torebki_Kod
            },
            { new: true }
        );

        if (!Bags) {
            return res.status(404).json({ message: "Bags not found" });
        }

        res.status(200).json({
            message: "Bags updated successfully",
            Bags: Bags
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete single Bags
exports.deleteBags = async (req, res, next) => {
    try {
        const id = req.params.id;
        const Bags = await Bags.findByIdAndDelete(id);

        if (!Bags) {
            return res.status(404).json({ message: "Bags not found" });
        }

        res.status(200).json({
            message: "Bags deleted successfully",
            Bags: Bags
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
