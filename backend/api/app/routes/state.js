const express = require("express");
const router = express.Router();
const StatesController = require('../controllers/state');
const historyLogger = require('../middleware/historyLogger');


router.get("/", StatesController.getAllStates);
router.post("/",historyLogger('states'), StatesController.createState);
router.post("/restore", StatesController.restoreState); // New restore endpoint
router.get("/:id", StatesController.getStateById);
router.put("/:id",historyLogger('states'), StatesController.updateStateById);
router.delete("/barcode/:barcode/symbol/:symbol", historyLogger('states'), StatesController.deleteStateByBarcodeAndSymbol); // New specific endpoint
router.delete("/barcode/:barcode", StatesController.deleteStateByBarcode); // Keep old endpoint for compatibility
router.delete("/:id",historyLogger('states'), StatesController.deleteState);


module.exports = router;
