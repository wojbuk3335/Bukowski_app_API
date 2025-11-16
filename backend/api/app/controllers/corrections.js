const Corrections = require('../db/models/corrections');
const History = require('../db/models/history');
const mongoose = require('mongoose');

class CorrectionsController {

    static async saveCorrection(req, res) {
        try {
            const { 
                fullName, 
                size, 
                barcode, 
                sellingPoint, 
                symbol, 
                errorType, 
                description, 
                attemptedOperation,
                originalPrice,
                discountPrice,
                transactionId
            } = req.body;

            const correction = new Corrections({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                size,
                barcode,
                sellingPoint,
                symbol,
                errorType: errorType || 'MISSING_IN_STATE',
                description,
                attemptedOperation: attemptedOperation || 'WRITE_OFF',
                status: 'PENDING',
                createdAt: new Date(),
                originalPrice,
                discountPrice,
                transactionId
            });

            await correction.save();
            res.status(201).json({ 
                message: 'Correction saved successfully', 
                correction 
            });
        } catch (error) {
            console.error('Error saving correction:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async saveMultipleCorrections(req, res) {
        try {
            const corrections = req.body.map(item => ({
                _id: new mongoose.Types.ObjectId(),
                fullName: item.fullName,
                size: item.size,
                barcode: item.barcode,
                sellingPoint: item.sellingPoint,
                symbol: item.symbol,
                errorType: item.errorType || 'MISSING_IN_STATE',
                description: item.description,
                attemptedOperation: item.attemptedOperation || 'WRITE_OFF',
                status: 'PENDING',
                createdAt: new Date(),
                originalPrice: item.originalPrice,
                discountPrice: item.discountPrice,
                transactionId: item.transactionId
            }));

            const savedCorrections = await Corrections.insertMany(corrections);
            
            // Zapisz w historii jeśli mamy transactionId
            if (req.body.length > 0 && req.body[0].transactionId) {
                const transactionId = req.body[0].transactionId;
                console.log(`📝 Creating history entries for corrections with transactionId: ${transactionId}`);
                
                // Utwórz wpisy historii dla KAŻDEJ korekty (bez deduplikacji)
                // WAŻNE: Każda kurtka musi mieć swój wpis w historii, nawet jeśli są identyczne
                const historyEntries = savedCorrections.map((correction, index) => {
                    const originalData = req.body[index]?.originalData;
                    
                    // NOWA LOGIKA: Określ faktyczne miejsce docelowe na podstawie typu operacji
                    let destinationTo = 'KOREKTY'; // Fallback
                    
                    if (originalData) {
                        // Sprawdź czy to była sprzedaż
                        const isFromSale = originalData.isFromSale === true;
                        
                        if (isFromSale) {
                            // Dla sprzedaży: użyj "SPRZEDANO"
                            destinationTo = 'SPRZEDANO';
                        } else {
                            // Dla transferów: użyj faktycznego punktu docelowego
                            destinationTo = originalData.transfer_to || 'KOREKTY';
                        }
                    }
                    
                    return {
                        _id: new mongoose.Types.ObjectId(),
                        collectionName: 'Korekty', // ZMIANA: z 'corrections' na 'Korekty'
                        operation: 'Przeniesiono do korekt',
                        from: correction.symbol,
                        to: destinationTo, // ZMIANA: użyj faktycznego miejsca docelowego
                        timestamp: new Date(),
                        product: correction.fullName, // Tylko nazwa produktu bez rozmiaru
                        size: correction.size, // Rozmiar w osobnym polu
                        details: `Brak pokrycia w stanie - ${correction.description}`,
                        transactionId: transactionId,
                        // NOWE: Zapisz oryginalne dane do przywrócenia
                        originalData: originalData ? JSON.stringify(originalData) : null
                    };
                });
                
                await History.insertMany(historyEntries);
                console.log(`✅ Created ${historyEntries.length} history entries for corrections (one per item, no deduplication)`);
            }
            
            res.status(201).json({ 
                message: `${savedCorrections.length} corrections saved successfully`, 
                corrections: savedCorrections 
            });
        } catch (error) {
            console.error('Error saving multiple corrections:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getAllCorrections(req, res) {
        try {
            const corrections = await Corrections.find({}).sort({ createdAt: -1 });
            res.status(200).json(corrections);
        } catch (error) {
            console.log('Error fetching all corrections:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getCorrectionsByStatus(req, res) {
        try {
            const { status } = req.params;
            const corrections = await Corrections.find({ status }).sort({ createdAt: -1 });
            res.status(200).json(corrections);
        } catch (error) {
            console.log('Error fetching corrections by status:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getCorrectionsBySellingPoint(req, res) {
        try {
            const { sellingPoint } = req.params;
            const corrections = await Corrections.find({ sellingPoint }).sort({ createdAt: -1 });
            res.status(200).json(corrections);
        } catch (error) {
            console.log('Error fetching corrections by selling point:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async updateCorrectionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, resolvedBy, description } = req.body;

            const updateData = { 
                status,
                resolvedBy,
                description
            };

            if (status === 'RESOLVED') {
                updateData.resolvedAt = new Date();
            } else if (status === 'PENDING') {
                // Wyczyść resolvedAt gdy wracamy do oczekiwania
                updateData.resolvedAt = null;
                updateData.resolvedBy = null;
            }

            const correction = await Corrections.findByIdAndUpdate(
                id, 
                updateData,
                { new: true }
            );

            if (!correction) {
                return res.status(404).json({ message: 'Correction not found' });
            }

            res.status(200).json({ 
                message: 'Correction updated successfully', 
                correction 
            });
        } catch (error) {
            console.error('Error updating correction:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteCorrection(req, res) {
        try {
            const { id } = req.params;
            const correction = await Corrections.findByIdAndDelete(id);

            if (!correction) {
                return res.status(404).json({ message: 'Correction not found' });
            }

            res.status(200).json({ 
                message: 'Correction deleted successfully' 
            });
        } catch (error) {
            console.error('Error deleting correction:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getCorrectionsStats(req, res) {
        try {
            const stats = await Corrections.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const errorTypeStats = await Corrections.aggregate([
                {
                    $group: {
                        _id: '$errorType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            res.status(200).json({
                statusStats: stats,
                errorTypeStats: errorTypeStats
            });
        } catch (error) {
            console.error('Error fetching corrections stats:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = CorrectionsController;
