const Category = require('../db/models/category');

class CategoryController {
    async getCategories(req, res) {
        try {
            const categories = await Category.find().populate('children');
            res.status(200).json(categories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async addCategory(req, res) {
        try {
            const categories = req.body; // Expecting a recursive structure

            const saveCategoryRecursively = async (category, isChild = false) => {
                const { name, children } = category;

                if (isChild && children && children.length > 0) {
                    throw new Error('Subcategories cannot have further nested subcategories.');
                }

                const newCategory = new Category({ name });
                const savedCategory = await newCategory.save();

                if (!isChild && children && children.length > 0) {
                    const savedChildren = await Promise.all(
                        children.map((child) => saveCategoryRecursively(child, true))
                    );
                    savedCategory.children = savedChildren.map((child) => child._id);
                    await savedCategory.save();
                }

                return savedCategory;
            };

            const savedCategories = await Promise.all(
                categories.map((category) => saveCategoryRecursively(category))
            );

            res.status(201).json(savedCategories);
        } catch (error) {
            console.error('Error saving categories:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CategoryController();
