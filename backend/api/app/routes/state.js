const express = require("express");
const router = express.Router();
const StatesController = require('../controllers/state');
const historyLogger = require('../middleware/historyLogger');


router.get("/", StatesController.getAllStates);
router.get("/warehouse", StatesController.getWarehouseItems); // New endpoint for warehouse items
router.get("/barcode/:barcode", StatesController.getStatesByBarcode); // New endpoint to find states by barcode
router.post("/",historyLogger('states'), StatesController.createState);
router.post("/restore", StatesController.restoreState); // Restore endpoint with history logging
router.post("/restore-silent", StatesController.restoreStateSilent); // Silent restore without history logging
router.get("/:id", StatesController.getStateById);
router.put("/:id",historyLogger('states'), StatesController.updateStateById);
router.delete("/barcode/:barcode/symbol/:symbol", historyLogger('states'), StatesController.deleteStateByBarcodeAndSymbol); // New specific endpoint
router.delete("/barcode/:barcode", StatesController.deleteStateByBarcode); // Keep old endpoint for compatibility
router.delete("/admin/clear-all", StatesController.clearAllStates); // ADMIN: Clear all states
router.delete("/:id", StatesController.deleteState); // Remove from state by ID
router.get("/:userId/report", StatesController.getStateReport); // State movement report
router.get("/:userId/inventory", StatesController.getStateInventory); // State inventory report


module.exports = router;
