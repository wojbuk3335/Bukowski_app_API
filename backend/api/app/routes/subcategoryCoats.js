const express = require("express");
const router = express.Router();
const SubcategoryCoatsController = require('../controllers/subcategoryCoats');
const historyLogger = require('../middleware/historyLogger');

router.get('/get-all-subcategoryCoats', SubcategoryCoatsController.getAllSubcategoryCoats);
router.post('/insert-many-subcategoryCoats', historyLogger('subcategoryCoats'), SubcategoryCoatsController.insertManySubcategoryCoats);
router.delete('/delete-all-subcategoryCoats', historyLogger('subcategoryCoats'), SubcategoryCoatsController.deleteAllSubcategoryCoats);
router.get('/:subcategoryCoatsId', SubcategoryCoatsController.getSubcategoryCcoatsById);
router.patch('/update-subcategoryCoats/:subcategoryCoatsId', historyLogger('subcategoryCoats'), SubcategoryCoatsController.updateSubcategoryCoatsById);

module.exports = router;