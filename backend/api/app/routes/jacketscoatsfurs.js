const express = require("express");
const router = express.Router();
const JacketsCoatsFursController = require('../controllers/jacketscoatsfurs');

router.get('/get-all', JacketsCoatsFursController.getAll);
router.post('/insert-many', JacketsCoatsFursController.insertMany);
router.delete('/delete-all', JacketsCoatsFursController.deleteAll);
router.get('/:itemId', JacketsCoatsFursController.getById);
router.patch('/update/:itemId', JacketsCoatsFursController.updateById);

module.exports = router;
