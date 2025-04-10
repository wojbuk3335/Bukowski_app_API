const express = require("express");
const router = express.Router();
const JacketsCoatsFursController = require('../controllers/jacketscoatsfurs');

router.get('/excel/get-all', JacketsCoatsFursController.getAll);
router.post('/excel/insert-many', JacketsCoatsFursController.insertMany);
router.delete('/excel/delete-all', JacketsCoatsFursController.deleteAll);
router.get('/excel/:itemId', JacketsCoatsFursController.getById);
router.patch('/excel/update/:itemId', JacketsCoatsFursController.updateById);
router.post('/excel/update-many', JacketsCoatsFursController.updateMany);

module.exports = router;
