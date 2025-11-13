const Sales = require('../db/models/sales');
const mongoose = require('mongoose');

class SalesController {

    static async saveSales(req, res) {
        try {
            const { fullName, timestamp, barcode, size, sellingPoint, from, cash, card, symbol, source, notes, isPickup, advanceAmount, relatedAdvanceId } = req.body;

            // Parse the timestamp from the provided format
            const parsedTimestamp = new Date(
                timestamp.replace(/(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$2-$1T$4:$5:$6')
            );

            const sales = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                timestamp: parsedTimestamp,
                barcode,
                size,
                sellingPoint,
                from,
                cash,
                card,
                symbol, // Add symbol field
                date: new Date(), // Current date
                source: source || null, // Add source field for Cudzich transactions
                notes: notes || null, // Add notes field for additional information
                isPickup: isPickup || false, // Add pickup field
                advanceAmount: advanceAmount || 0, // Add advance amount field
                relatedAdvanceId: relatedAdvanceId || null // Add related advance ID field
            });

            await sales.save();

            // Automatycznie oblicz prowizję dla przypisanego sprzedawcy
            // TYLKO jeśli to nie jest odbiór (isPickup = false)
            if (!sales.isPickup) {
                await SalesController.calculateCommissionForSale(sales);
            } else {
                console.log(`ℹ️ PROWIZJA: Pomijam obliczanie prowizji dla odbioru ${sales._id} (prowizja była już naliczona z zaliczki)`);
            }

            res.status(201).json({ message: 'Sales saved successfully', sales });
        } catch (error) {
            console.error('Error saving sales:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async getAllSales(req, res) {
        try {
            // Pokaż wszystkie sprzedaże (przetworzone i nieprzetworzone)
            // Domyślnie ukryj zwrócone sprzedaże, chyba że specjalnie poproszono
            const includeReturned = req.query.includeReturned === 'true';
            
            const filter = includeReturned ? {} : { returned: { $ne: true } };
            const sales = await Sales.find(filter);
            
            res.status(200).json(sales);
        } catch (error) {
            console.log('Error fetching all sales:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async insertManySales(req, res) {
            try {
                const sales = await Sales.insertMany(req.body);
                res.status(201).json(sales);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
    }

    static async deleteAllSales(req, res) {
        try {
            console.log(`🗑️ Usuwanie wszystkich sprzedaży i powiązanych prowizji`);
            
            // Usuń wszystkie prowizje od sprzedaży
            const FinancialOperation = require('../db/models/financialOperation');
            const deletedCommissions = await FinancialOperation.deleteMany({
                type: 'sales_commission'
            });

            // Usuń wszystkie sprzedaże
            const deletedSales = await Sales.deleteMany();
            
            res.status(200).json({ 
                message: 'All sales and related commissions deleted successfully',
                deletedSales: deletedSales.deletedCount,
                deletedCommissions: deletedCommissions.deletedCount
            });
        } catch (error) {
            console.error('Error deleting all sales:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getSalesById(req, res) {
        try {
            const sales = await Sales.findById(req.params.salesId).populate('size'); // Removed 'fullName' and 'sellingPoint'
            if (!sales) {
                return res.status(404).json({ message: 'Sales not found' });
            }
            res.status(200).json(sales);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async updateSalesById(req, res) {
        try {
            console.log(`🔄 Updating sale ${req.params.salesId} with data:`, req.body);
            
            const originalSale = await Sales.findById(req.params.salesId);
            if (!originalSale) {
                console.log(`❌ Sale not found: ${req.params.salesId}`);
                return res.status(404).json({ message: 'Sales not found' });
            }

            const updatedSales = await Sales.findByIdAndUpdate(req.params.salesId, req.body, { new: true });
            
            // Jeśli sprzedaż została oznaczona jako przetworzona, oblicz prowizję
            if (req.body.processed === true && !originalSale.processed) {
                console.log(`💰 Sale ${req.params.salesId} marked as processed, calculating commission...`);
                await SalesController.calculateCommissionForSale(updatedSales);
            }

            console.log(`✅ Sale updated successfully:`, updatedSales);
            res.status(200).json(updatedSales);
        } catch (error) {
            console.error(`❌ Error updating sale ${req.params.salesId}:`, error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteSalesById(req, res) {
        try {
            const salesId = req.params.salesId;
            
            // Najpierw znajdź sprzedaż
            const saleToDelete = await Sales.findById(salesId);
            if (!saleToDelete) {
                return res.status(404).json({ message: 'Sale not found' });
            }

            console.log(`🗑️ Usuwanie sprzedaży ${salesId} i powiązanej prowizji`);

            // Usuń powiązaną prowizję (jeśli istnieje)
            const FinancialOperation = require('../db/models/financialOperation');
            const deletedCommission = await FinancialOperation.findOneAndDelete({
                salesId: salesId,
                type: 'sales_commission'
            });

            if (deletedCommission) {
                // Prowizja została usunięta
            } else {
                // Brak prowizji do usunięcia
            }

            // Usuń sprzedaż
            const deletedSale = await Sales.findByIdAndDelete(salesId);
            
            res.status(200).json({ 
                message: 'Sale and related commission deleted successfully', 
                deletedSale,
                deletedCommission: deletedCommission ? {
                    amount: deletedCommission.amount,
                    employeeName: deletedCommission.employeeName
                } : null
            });
        } catch (error) {
            console.error('Error deleting sale:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getSalesByDateAndSellingPoint(req, res) {
        try {
            const { date, sellingPoint } = req.query;
            
            console.log('Received query params:', { date, sellingPoint });
            
            if (!date || !sellingPoint) {
                return res.status(400).json({ 
                    error: 'Date and sellingPoint parameters are required' 
                });
            }

            // Parse the date to get start and end of the day
            const startDate = new Date(date);
            startDate.setUTCHours(0, 0, 0, 0);
            
            const endDate = new Date(date);
            endDate.setUTCHours(23, 59, 59, 999);
            
            console.log('Date range:', { startDate, endDate });
            console.log('Searching for sellingPoint:', sellingPoint);

            // Find sales for the specific date and selling point
            // Domyślnie ukryj zwrócone sprzedaże
            const includeReturned = req.query.includeReturned === 'true';
            
            const filter = {
                sellingPoint: sellingPoint,
                timestamp: {
                    $gte: startDate,
                    $lte: endDate
                }
            };
            
            if (!includeReturned) {
                filter.returned = { $ne: true };
            }
            
            const sales = await Sales.find(filter).sort({ timestamp: -1 }); // Sort by timestamp descending
            
            console.log('Found sales:', sales.length);
            console.log('Sales data:', sales);

            res.status(200).json(sales);
        } catch (error) {
            console.error('Error filtering sales by date and selling point:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async markAsReturned(req, res) {
        try {
            const { fullName, size, source, returnReason, returnDate } = req.body;
            
            if (!fullName || !size || !source) {
                return res.status(400).json({ 
                    error: 'fullName, size, and source parameters are required' 
                });
            }

            console.log(`🔄 Oznaczanie sprzedaży jako zwrócone: ${fullName}, ${size}, ${source}`);

            // Najpierw znajdź sprzedaże które będą oznaczone jako zwrócone
            const salesToReturn = await Sales.find({
                fullName: fullName,
                size: size,
                source: source,
                returned: { $ne: true }
            });

            // Usuń prowizje dla tych sprzedaży
            const FinancialOperation = require('../db/models/financialOperation');
            let deletedCommissionsCount = 0;
            
            for (const sale of salesToReturn) {
                const deletedCommission = await FinancialOperation.findOneAndDelete({
                    salesId: sale._id.toString(),
                    type: 'sales_commission'
                });
                
                if (deletedCommission) {
                    deletedCommissionsCount++;
                }
            }

            // Find and update all matching sales from Cudzich that are not already returned
            const updateResult = await Sales.updateMany(
                {
                    fullName: fullName,
                    size: size,
                    source: source,
                    returned: { $ne: true } // Only update sales that are not already marked as returned
                },
                {
                    $set: {
                        returned: true,
                        returnReason: returnReason || 'Zwrot przez Cudzich',
                        returnDate: returnDate || new Date().toISOString()
                    }
                }
            );

            res.status(200).json({
                message: 'Sales marked as returned and commissions removed successfully',
                matchedCount: updateResult.matchedCount,
                modifiedCount: updateResult.modifiedCount,
                deletedCommissions: deletedCommissionsCount
            });
        } catch (error) {
            console.error('Error marking sales as returned:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async createHistoricalSale(req, res) {
        try {
            const { fullName, size, price, sellingPoint, symbol, source, notes, historicalDate } = req.body;
            
            if (!fullName || !size || !price || !sellingPoint || !symbol) {
                return res.status(400).json({ 
                    error: 'fullName, size, price, sellingPoint, and symbol parameters are required' 
                });
            }

            // Parse historical date or use 30 days ago as default
            const saleDate = historicalDate ? new Date(historicalDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            
            const historicalSale = new Sales({
                _id: new mongoose.Types.ObjectId(),
                fullName,
                timestamp: saleDate,
                barcode: 'HISTORICAL-' + Date.now(), // Generate unique barcode for historical sales
                size,
                sellingPoint,
                from: symbol,
                cash: [{ price: parseFloat(price), currency: 'PLN' }],
                card: [],
                symbol,
                date: new Date(), // Current date for record creation
                source: source || 'Cudzich',
                notes: notes || 'Sprzedaż historyczna - dodana wstecznie'
            });

            await historicalSale.save();

            res.status(201).json({
                message: 'Historical sale created successfully',
                sale: historicalSale
            });
        } catch (error) {
            console.error('Error creating historical sale:', error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // Automatyczne obliczanie prowizji po sprzedaży - ZBIORCZO za cały dzień
    static async calculateCommissionForSale(sale) {
        try {
            console.log(`🔍 PROWIZJA: Rozpoczynam przeliczanie zbiorczej prowizji dla ${sale.sellingPoint} za dzień ${new Date(sale.date).toDateString()}`);
            
            const SalesAssignment = require('../db/models/salesAssignment');
            const Employee = require('../db/models/employee');
            const FinancialOperation = require('../db/models/financialOperation');
            const WorkHours = require('../db/models/workHours');
            const Sales = require('../db/models/sales');

            const saleDate = new Date(sale.date);
            const dateString = saleDate.toISOString().split('T')[0]; // "2025-11-12"
            const dateStart = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
            const dateEnd = new Date(dateStart);
            dateEnd.setDate(dateEnd.getDate() + 1);

            // 1. Usuń wszystkie stare prowizje z tego dnia w tym punkcie
            const deletedOldCommissions = await FinancialOperation.deleteMany({
                type: 'sales_commission',
                date: { $gte: dateStart, $lt: dateEnd },
                reason: { $regex: sale.sellingPoint }
            });

            console.log(`�️ Usunięto ${deletedOldCommissions.deletedCount} starych prowizji przed przeliczeniem`);

            // 2. Znajdź wszystkie sprzedaże z tego dnia w tym punkcie
            const salesFromDay = await Sales.find({
                sellingPoint: sale.sellingPoint,
                date: { $gte: dateStart, $lt: dateEnd }
            });

            // 3. Znajdź wszystkie godziny pracy z tego dnia w tym punkcie
            const allWorkHours = await WorkHours.find({
                date: dateString,
                sellingPoint: sale.sellingPoint
            });

            console.log(`🕐 Dostępne godziny pracy:`, allWorkHours.map(wh => 
                `${wh.employeeName}: ${wh.startTime}-${wh.endTime}`
            ));

            if (allWorkHours.length === 0) {
                console.log(`❌ Brak godzin pracy - nie można obliczyć prowizji`);
                return;
            }

            // 4. Grupuj sprzedaże po pracownikach i oblicz łączne prowizje
            const employeeCommissions = new Map();

            for (const saleItem of salesFromDay) {
                // Oblicz łączną cenę ze sprzedaży (cash + card)
                let totalPrice = 0;
                if (saleItem.cash && saleItem.cash.length > 0) {
                    totalPrice += saleItem.cash.reduce((sum, payment) => sum + (payment.price || 0), 0);
                }
                if (saleItem.card && saleItem.card.length > 0) {
                    totalPrice += saleItem.card.reduce((sum, payment) => sum + (payment.price || 0), 0);
                }

                if (totalPrice <= 0) continue;

                const saleTime = new Date(saleItem.date).toTimeString().substring(0, 5);
                
                // Sprawdź dla każdego pracownika czy sprzedaż była w jego godzinach
                for (const workHours of allWorkHours) {
                    if (saleTime >= workHours.startTime && saleTime <= workHours.endTime) {
                        const employeeKey = `${workHours.employeeId}`;
                        
                        if (!employeeCommissions.has(employeeKey)) {
                            employeeCommissions.set(employeeKey, {
                                employeeId: workHours.employeeId,
                                employeeName: workHours.employeeName,
                                employeeCode: workHours.employeeCode || 'N/A',
                                totalSales: 0,
                                totalCommission: 0,
                                salesCount: 0,
                                salesDetails: []
                            });
                        }
                        
                        const commissionData = employeeCommissions.get(employeeKey);
                        const commissionAmount = totalPrice * 0.01; // 1% prowizja
                        
                        commissionData.totalSales += totalPrice;
                        commissionData.totalCommission += commissionAmount;
                        commissionData.salesCount++;
                        commissionData.salesDetails.push({
                            productName: `${saleItem.fullName} ${saleItem.size}`,
                            price: totalPrice,
                            commission: commissionAmount
                        });
                        
                        console.log(`💰 Dodano prowizję ${commissionAmount} zł dla ${workHours.employeeName}`);
                        break; // Jedna sprzedaż = jedna prowizja
                    }
                }
            }

            // 5. Utwórz zbiorcze prowizje dla każdego pracownika
            let createdCommissions = 0;
            
            for (const [employeeKey, commissionData] of employeeCommissions) {
                if (commissionData.totalCommission > 0) {
                    // Utwórz zbiorczą prowizję za cały dzień
                    const commissionReason = `Prowizja dzienna 1% od sprzedaży ${commissionData.totalSales} zł - ${sale.sellingPoint} (${commissionData.salesCount} sprzedaży: ${commissionData.salesDetails.map(s => s.productName).join(', ')})`;
                    
                    const newCommission = new FinancialOperation({
                        userSymbol: 'SYSTEM',
                        amount: commissionData.totalCommission,
                        currency: 'PLN',
                        type: 'sales_commission',
                        reason: commissionReason,
                        date: new Date(),
                        employeeId: commissionData.employeeId,
                        employeeName: commissionData.employeeName,
                        employeeCode: commissionData.employeeCode,
                        salesAmount: commissionData.totalSales,
                        commissionRate: 1
                    });

                    await newCommission.save();
                    createdCommissions++;
                    
                    console.log(`✅ Utworzono zbiorczą prowizję dla ${commissionData.employeeName}: ${commissionData.totalCommission} zł za ${commissionData.salesCount} sprzedaży`);
                }
            }

            console.log(`✅ Utworzono ${createdCommissions} zbiorczych prowizji za dzień ${dateString}`);

        } catch (error) {
            console.error(`❌ Błąd podczas obliczania prowizji:`, error);
        }
    }

}

module.exports = SalesController;
