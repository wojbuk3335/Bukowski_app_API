const express = require("express");
const router = express.Router();
const StatesController = require('../controllers/state');
const historyLogger = require('../middleware/historyLogger');


router.get("/", StatesController.getAllStates);
router.post("/",historyLogger('states'), StatesController.createState);
router.get("/:id", StatesController.getStateById);
router.put("/:id",historyLogger('states'), StatesController.updateStateById);
router.delete("/:id",historyLogger('states'), StatesController.deleteState);


module.exports = router;
