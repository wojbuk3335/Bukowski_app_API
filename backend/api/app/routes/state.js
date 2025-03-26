const express = require("express");
const router = express.Router();
const SizesController = require('../controllers/state');


router.get("/", SizesController.getAllStates);
router.post("/", SizesController.createState);
router.get("/:id", SizesController.getStateById);
router.put("/:id", SizesController.updateStateById);
router.delete("/:id", SizesController.deleteState);


module.exports = router;