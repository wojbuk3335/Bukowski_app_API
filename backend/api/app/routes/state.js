const express = require("express");
const router = express.Router();
const StatesController = require('../controllers/state');
const historyLogger = require('../middleware/historyLogger');
const checkAuth = require('../middleware/check-auth'); // Zabezpieczenia


// ========== WSZYSTKIE ENDPOINTY WYMAGAJĄ AUTORYZACJI ==========
router.get("/", checkAuth, StatesController.getAllStates); // 🔒 Lista stanów
router.get("/warehouse", checkAuth, StatesController.getWarehouseItems); // 🔒 Elementy magazynu
router.get("/barcode/:barcode", checkAuth, StatesController.getStatesByBarcode); // 🔒 Stany po kodzie kreskowym
router.get("/processing-status", checkAuth, StatesController.checkProcessingStatus); // 🔒 Status przetwarzania
router.get("/all/report", checkAuth, StatesController.getAllStatesReport); // 🔒 Raport wszystkich stanów
router.get("/all/inventory", checkAuth, StatesController.getAllStatesInventory); // 🔒 Inwentarz
router.post("/", checkAuth, historyLogger('states'), StatesController.createState); // 🔒 Tworzenie stanu
router.post("/restore", checkAuth, StatesController.restoreState); // 🔒 Przywracanie stanu
router.post("/restore-silent", checkAuth, StatesController.restoreStateSilent); // 🔒 Ciche przywracanie
router.get("/:id", checkAuth, StatesController.getStateById); // 🔒 Stan po ID
router.put("/:id", checkAuth, historyLogger('states'), StatesController.updateStateById); // 🔒 Aktualizacja
router.delete("/barcode/:barcode/symbol/:symbol", checkAuth, historyLogger('states'), StatesController.deleteStateByBarcodeAndSymbol); // 🔒 Usuwanie specyficzne
router.delete("/barcode/:barcode", checkAuth, StatesController.deleteStateByBarcode); // 🔒 Usuwanie po kodzie
router.delete("/admin/clear-all", checkAuth, StatesController.clearAllStates); // 🔒 ADMIN: Wyczyść wszystko
router.delete("/:id", checkAuth, StatesController.deleteState); // 🔒 Usuwanie po ID
router.get("/:userId/report", checkAuth, StatesController.getStateReport); // 🔒 Raport ruchu
router.get("/:userId/inventory", checkAuth, StatesController.getStateInventory); // 🔒 Raport inwentarza


module.exports = router;
