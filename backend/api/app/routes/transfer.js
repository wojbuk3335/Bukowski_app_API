const express = require("express");
const router = express.Router();
const transferController = require("../controllers/transfer");

router.post("/create", transferController.createTransfer); // Create a new transfer
router.get("/:accountSymbol", transferController.getTransfersByAccount); // Get transfers by account
router.delete("/:id", transferController.deleteTransfer); // Delete a transfer
router.delete("/", transferController.deleteAllTransfers); // Delete all transfers
router.delete("/cancel/:id", transferController.cancelTransfer); // Cancel a transfer by ID

module.exports = router;
