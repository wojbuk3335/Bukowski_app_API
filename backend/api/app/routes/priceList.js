const express = require("express");
const router = express.Router();
const PriceListController = require('../controllers/priceList');

// Get price list for a selling point
router.get("/:sellingPointId", PriceListController.getPriceList);

// Create initial price list from current goods
router.post("/:sellingPointId/create", PriceListController.createPriceList);

// Clone price list from another selling point
router.post("/:sellingPointId/clone", PriceListController.clonePriceList);

// Update price for a specific item
router.put("/:sellingPointId/update", PriceListController.updatePrice);

// Add new products to existing price list
router.post("/:sellingPointId/add-new", PriceListController.addNewProducts);

// Add new products to ALL existing price lists
router.post("/add-new-to-all", PriceListController.addNewProductsToAll);

// Compare price list with current goods to detect changes
router.get("/:sellingPointId/compare", PriceListController.comparePriceListWithGoods);

// Sync price list with goods (update outdated items, add new items)
router.post("/:sellingPointId/sync", PriceListController.syncPriceListWithGoods);

// Sync ALL price lists with goods (global synchronization)
router.post("/sync-all", PriceListController.syncAllPriceListsWithGoods);

// Delete price list
router.delete("/:sellingPointId", PriceListController.deletePriceList);

module.exports = router;