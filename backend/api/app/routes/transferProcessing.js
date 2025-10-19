const express = require('express');
const router = express.Router();
const TransferProcessingController = require('../controllers/transferProcessing');
const checkAuth = require('../middleware/check-auth'); // 🔒🔒🔒 PRZETWARZANIE TRANSFERÓW - KRYTYCZNE!

// ========== WSZYSTKIE OPERACJE PRZETWARZANIA TRANSFERÓW - NAJWYŻSZY POZIOM ZABEZPIECZEŃ ==========
router.post('/process-all', checkAuth, TransferProcessingController.processAllTransfers); // 🔒🔒🔒 Przetwarzanie wszystkich transferów
router.post('/process-warehouse', checkAuth, TransferProcessingController.processWarehouseItems); // 🔒🔒🔒 Przetwarzanie elementów magazynu
router.post('/process-sales', checkAuth, TransferProcessingController.processSalesItems); // 🔒🔒🔒 Przetwarzanie sprzedaży
router.post('/process-single', checkAuth, TransferProcessingController.processSingleTransfer); // 🔒🔒🔒 Przetwarzanie pojedynczego transferu
router.post('/undo-last', checkAuth, TransferProcessingController.undoLastTransaction); // 🔒🔒🔒 Cofnięcie ostatniej transakcji
router.get('/last-transaction', checkAuth, TransferProcessingController.getLastTransaction); // 🔒🔒🔒 Info o ostatniej transakcji

module.exports = router;
