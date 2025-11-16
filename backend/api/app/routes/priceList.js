const express = require("express");
const router = express.Router();
const PriceListController = require('../controllers/priceList');
const checkAuth = require('../middleware/check-auth'); // 🔒🔒🔒 CENNIK - NAJKRYTYCZNIEJSZE ZABEZPIECZENIE!

// ========== WSZYSTKIE OPERACJE CENNIKOWE - NAJWYŻSZY POZIOM ZABEZPIECZEŃ ==========

// SPECIFIC ROUTES FIRST (before parametric routes)
router.get("/get-all-priceLists", checkAuth, PriceListController.getAllPriceLists); // 🔒🔒🔒 WSZYSTKIE CENNIKI
router.post("/add-new-to-all", checkAuth, PriceListController.addNewProductsToAll); // 🔒🔒🔒 Dodaj produkty do wszystkich cenników
router.post("/sync-all", checkAuth, PriceListController.syncAllPriceListsWithGoods); // 🔒🔒🔒 Globalna synchronizacja cenników
router.post("/create-priceList", checkAuth, PriceListController.createPriceListItem); // 🔒🔒🔒 Tworzenie pozycji cennika

// PARAMETRIC ROUTES LAST (they catch everything)
router.get("/:sellingPointId", checkAuth, PriceListController.getPriceList); // 🔒🔒🔒 Cennik dla punktu sprzedaży
router.get("/:sellingPointId/compare", checkAuth, PriceListController.comparePriceListWithGoods); // 🔒🔒🔒 Porównanie cennika
router.post("/:sellingPointId/create", checkAuth, PriceListController.createPriceList); // 🔒🔒🔒 Tworzenie cennika
router.post("/:sellingPointId/clone", checkAuth, PriceListController.clonePriceList); // 🔒🔒🔒 Klonowanie cennika
router.post("/:sellingPointId/add-new", checkAuth, PriceListController.addNewProducts); // 🔒🔒🔒 Dodawanie nowych produktów
router.post("/:sellingPointId/sync", checkAuth, PriceListController.syncPriceListWithGoods); // 🔒🔒🔒 Synchronizacja cennika
router.put("/:sellingPointId/update", checkAuth, PriceListController.updatePrice); // 🔒🔒🔒 AKTUALIZACJA CEN - KRYTYCZNE!
router.put("/:priceListId", checkAuth, PriceListController.updatePriceList); // 🔒🔒🔒 Aktualizacja cennika
router.delete("/:sellingPointId", checkAuth, PriceListController.deletePriceList); // 🔒🔒🔒 Usuwanie cennika

module.exports = router;