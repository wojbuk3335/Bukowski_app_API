const express = require("express");
const router = express.Router();
const PriceListController = require('../controllers/priceList');

// SPECIFIC ROUTES FIRST (before parametric routes)

// Get all price lists
router.get("/get-all-priceLists", PriceListController.getAllPriceLists);

// Add new products to ALL existing price lists
router.post("/add-new-to-all", PriceListController.addNewProductsToAll);

// Sync ALL price lists with goods (global synchronization)
router.post("/sync-all", PriceListController.syncAllPriceListsWithGoods);

// Create individual price list item (for testing)
router.post("/create-priceList", PriceListController.createPriceListItem);

// PARAMETRIC ROUTES LAST (they catch everything)

// Get price list for a selling point
router.get("/:sellingPointId", PriceListController.getPriceList);

// Compare price list with current goods to detect changes
router.get("/:sellingPointId/compare", PriceListController.comparePriceListWithGoods);

// Create initial price list from current goods
router.post("/:sellingPointId/create", PriceListController.createPriceList);

// Clone price list from another selling point
router.post("/:sellingPointId/clone", PriceListController.clonePriceList);

// Add new products to existing price list
router.post("/:sellingPointId/add-new", PriceListController.addNewProducts);

// Sync price list with goods (update outdated items, add new items)
router.post("/:sellingPointId/sync", PriceListController.syncPriceListWithGoods);

// Update price for a specific item
router.put("/:sellingPointId/update", PriceListController.updatePrice);

// Update price list (for testing)
router.put("/:priceListId", PriceListController.updatePriceList);

// Delete price list
router.delete("/:sellingPointId", PriceListController.deletePriceList);

module.exports = router;