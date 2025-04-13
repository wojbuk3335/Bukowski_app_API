const express = require("express");
const router = express.Router();
const StatesController = require('../controllers/state');


router.get("/", StatesController.getAllStates);
router.post("/", StatesController.createState);
router.get("/:id", StatesController.getStateById);
router.put("/:id", StatesController.updateStateById);
router.delete("/:id", StatesController.deleteState);


module.exports = router;