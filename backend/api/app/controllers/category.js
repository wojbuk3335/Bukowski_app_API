const Category = require('../db/models/category');
const mongoose = require('mongoose');
const config = require('../config');

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching categories", error: error.message });
    }
};

exports.insertManyCategories = async (req, res) => {
    try {
        const categoriesData = req.body;

        // Validate the data
        if (!Array.isArray(categoriesData)) {
            return res.status(400).json({ message: "Invalid input: Expected an array of categories" });
        }

        for (const categoryData of categoriesData) {
            if (!categoryData.Kat_1_Kod_1 || !categoryData.Kat_1_Opis_1 || !categoryData.Plec) {
                return res.status(400).json({ message: "Invalid input: Missing required fields" });
            }
        }

        // Check for duplicate Kat_1_Kod_1 values
        const kat1Kod1Values = categoriesData.map(cat => cat.Kat_1_Kod_1);
        const duplicateKat1Kod1 = kat1Kod1Values.filter((value, index) => kat1Kod1Values.indexOf(value) !== index);

        if (duplicateKat1Kod1.length > 0) {
            return res.status(400).json({ message: "Duplicate Kat_1_Kod_1 values in database", duplicates: duplicateKat1Kod1 });
        }

        const categories = await Category.insertMany(categoriesData.map(cat => ({ ...cat, _id: new mongoose.Types.ObjectId() })));
        res.status(201).json({ categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error inserting categories", error: error.message });
    }
};

exports.deleteAllCategories = async (req, res) => {
    try {
        await Category.deleteMany({});
        res.status(200).json({ message: "All categories deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting categories", error: error.message });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching category", error: error.message });
    }
};

exports.updateCategoryById = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const updateData = req.body;

        // Validate the data
        if (updateData.Kat_1_Opis_1 === undefined || updateData.Plec === undefined) {
            return res.status(400).json({ message: "Invalid input: Missing required fields" });
        }

        const category = await Category.findByIdAndUpdate(categoryId, updateData, { new: true });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating category", error: error.message });
    }
};
