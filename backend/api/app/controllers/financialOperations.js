const FinancialOperation = require('../db/models/financialOperation');

class FinancialOperationController {
    // Create a new financial operation
    createFinancialOperation = async (req, res) => {
        try {
            const operation = new FinancialOperation(req.body);
            await operation.save();
            
            // Sprawdź czy to zaliczka na produkt z ceną finalną - jeśli tak, oblicz prowizję
            await FinancialOperationController.calculateAdvanceCommission(operation);
            
            res.status(201).json(operation);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Get all financial operations
    getFinancialOperations = async (req, res) => {
        try {
            let query = {};
            
            // Filtrowanie po dacie
            if (req.query.date) {
                const selectedDate = new Date(req.query.date);
                const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
                
                query.date = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
            }
            
            // Filtrowanie po zakresie dat
            if (req.query.startDate && req.query.endDate) {
                query.date = {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate)
                };
            }
            
            // Filtrowanie po typie operacji
            if (req.query.operation) {
                query.type = req.query.operation;
            }
            
            // Filtrowanie po typie operacji (alternatywna nazwa parametru)
            if (req.query.type) {
                query.type = req.query.type;
            }
            
            // Filtrowanie po pracowniku (dla zaliczek)
            if (req.query.employeeId) {
                query.employeeId = req.query.employeeId;
            }
            
            // Filtrowanie po użytkowniku (przez userSymbol)
            if (req.query.user) {
                // Znajdź użytkownika po ID i pobierz jego symbol
                const User = require('../db/models/user');
                const user = await User.findById(req.query.user);
                if (user) {
                    query.userSymbol = user.symbol;
                }
            }
            
            const operations = await FinancialOperation.find(query).sort({ date: -1 });
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        } 
    };

    // Get financial operation by ID
    getFinancialOperationById = async (req, res) => {
        try {
            const operation = await FinancialOperation.findById(req.params.id);
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json(operation);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Update financial operation
    updateFinancialOperation = async (req, res) => {
        try {
            const operation = await FinancialOperation.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json(operation);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };

    // Delete financial operation
    deleteFinancialOperation = async (req, res) => {
        try {
            const operation = await FinancialOperation.findByIdAndDelete(req.params.id);
            if (!operation) {
                return res.status(404).json({ message: 'Financial operation not found' });
            }
            res.status(200).json({ message: 'Financial operation deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Delete all financial operations
    deleteAllFinancialOperations = async (req, res) => {
        try {
            await FinancialOperation.deleteMany({});
            res.status(200).json({ message: 'All financial operations deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get financial operations by user symbol
    getFinancialOperationsByUser = async (req, res) => {
        try {
            const operations = await FinancialOperation.find({ userSymbol: req.params.userSymbol });
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Get financial operations by type
    getFinancialOperationsByType = async (req, res) => {
        try {
            const operations = await FinancialOperation.find({ type: req.params.type });
            res.status(200).json(operations);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Search for advance payments by product name and size
    searchAdvancePayments = async (req, res) => {
        try {
            const { productName, size } = req.query;
            
            if (!productName || !size) {
                return res.status(400).json({ 
                    error: 'Parametry productName i size są wymagane' 
                });
            }

            console.log(`🔍 Szukam zaliczek dla produktu: ${productName}, rozmiar: ${size}`);

            // Znajdź zaliczki na produkty które pasują do kryteriów wyszukiwania
            // i nie zostały jeszcze odebrane (nie ma powiązanej sprzedaży pickup)
            const advances = await FinancialOperation.find({
                type: 'advance',
                productName: { $regex: productName, $options: 'i' }, // Case-insensitive search
                productSize: size,
                // Możemy dodać więcej kryteriów, np. czy zaliczka nie została już wykorzystana
            }).sort({ date: -1 }); // Najnowsze pierwsze

            console.log(`✅ Znaleziono ${advances.length} zaliczek`);

            res.status(200).json(advances);
        } catch (error) {
            console.error('❌ Error searching advance payments:', error);
            res.status(500).json({ error: error.message });
        }
    };

    // Calculate and save sales commission for employee
    calculateSalesCommission = async (req, res) => {
        try {
            const { employeeId, startDate, endDate, userSymbol } = req.body;

            // Pobierz dane pracownika
            const Employee = require('../db/models/employee');
            const employee = await Employee.findById(employeeId);
            
            if (!employee) {
                return res.status(404).json({ error: 'Pracownik nie został znaleziony' });
            }

            if (employee.salesCommission <= 0) {
                return res.status(400).json({ error: 'Pracownik nie ma ustawionej prowizji od sprzedaży' });
            }

            // Pobierz sprzedaże z danego okresu dla tego pracownika
            const Sales = require('../db/models/sales');
            const SalesAssignment = require('../db/models/salesAssignment');

            // Znajdź przypisania sprzedawcy w danym okresie
            const assignments = await SalesAssignment.find({
                employeeId: employeeId,
                workDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                active: true
            });

            if (assignments.length === 0) {
                return res.status(400).json({ error: 'Brak przypisań sprzedawcy w podanym okresie' });
            }

            const sellingPoints = assignments.map(a => a.sellingPoint);
            
            // Pobierz sprzedaże z punktów sprzedaży w których pracował
            const salesQuery = {
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                sellingPoint: { $in: sellingPoints },
                processed: true,
                returned: { $ne: true }
            };

            const sales = await Sales.find(salesQuery);

            // Oblicz całkowitą wartość sprzedaży
            let totalSalesAmount = 0;
            const salesDetails = [];

            sales.forEach(sale => {
                let saleAmount = 0;
                
                // Sumuj płatności gotówkowe
                if (sale.cash && Array.isArray(sale.cash)) {
                    saleAmount += sale.cash.reduce((sum, payment) => sum + (payment.price || 0), 0);
                }
                
                // Sumuj płatności kartą
                if (sale.card && Array.isArray(sale.card)) {
                    saleAmount += sale.card.reduce((sum, payment) => sum + (payment.price || 0), 0);
                }

                if (saleAmount > 0) {
                    totalSalesAmount += saleAmount;
                    salesDetails.push({
                        salesId: sale._id,
                        amount: saleAmount,
                        date: sale.date,
                        sellingPoint: sale.sellingPoint
                    });
                }
            });

            if (totalSalesAmount === 0) {
                return res.status(400).json({ error: 'Brak sprzedaży w podanym okresie' });
            }

            // Oblicz prowizję
            const commissionAmount = (totalSalesAmount * employee.salesCommission) / 100;

            // Sprawdź czy prowizja za ten okres już istnieje
            const existingCommission = await FinancialOperation.findOne({
                employeeId: employeeId,
                type: 'sales_commission',
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            });

            if (existingCommission) {
                return res.status(400).json({ error: 'Prowizja za ten okres została już obliczona' });
            }

            // Zapisz prowizję jako operację finansową
            const commissionOperation = new FinancialOperation({
                userSymbol: userSymbol,
                amount: commissionAmount,
                currency: 'PLN',
                type: 'sales_commission',
                reason: `Prowizja ${employee.salesCommission}% od sprzedaży za okres ${new Date(startDate).toLocaleDateString('pl-PL')} - ${new Date(endDate).toLocaleDateString('pl-PL')}`,
                date: new Date(),
                employeeId: employeeId,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeCode: employee.employeeId,
                salesAmount: totalSalesAmount,
                commissionRate: employee.salesCommission
            });

            await commissionOperation.save();

            res.status(201).json({
                message: 'Prowizja została obliczona i zapisana pomyślnie',
                commission: commissionOperation,
                salesDetails: {
                    totalSales: totalSalesAmount,
                    salesCount: sales.length,
                    commissionRate: employee.salesCommission,
                    commissionAmount: commissionAmount,
                    period: `${new Date(startDate).toLocaleDateString('pl-PL')} - ${new Date(endDate).toLocaleDateString('pl-PL')}`
                }
            });

        } catch (error) {
            console.error('Error calculating sales commission:', error);
            res.status(500).json({ error: error.message });
        }
    };

    // Oblicz prowizję od zaliczki na produkt
    static async calculateAdvanceCommission(operation) {
        try {
            // Sprawdź czy to zaliczka na produkt z ceną finalną
            if (operation.type !== 'addition' || !operation.finalPrice || operation.finalPrice <= 0) {
                return; // Nie jest to zaliczka na produkt lub brak ceny finalnej
            }

            console.log(`💰 ZALICZKA: Sprawdzam prowizję dla operacji ${operation._id}`);
            console.log(`💰 Typ: ${operation.type}, Cena finalna: ${operation.finalPrice}`);

            // Znajdź aktywne przypisanie pracownika dla danego użytkownika i daty
            const SalesAssignment = require('../db/models/salesAssignment');
            const Employee = require('../db/models/employee');

            const operationDate = new Date(operation.date);
            const startOfDay = new Date(operationDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(operationDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Znajdź przypisanie na podstawie symbolUserSymbol
            const assignment = await SalesAssignment.findOne({
                workDate: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                $or: [
                    { active: true },
                    { active: { $exists: false } },
                    { active: undefined },
                    { active: null }
                ]
            });

            if (!assignment) {
                console.log(`❌ Brak przypisania pracownika na dzień ${operationDate.toLocaleDateString()}`);
                return;
            }

            // Pobierz dane pracownika
            const employee = await Employee.findById(assignment.employeeId);
            if (!employee || employee.salesCommission <= 0) {
                console.log(`❌ Pracownik nie znaleziony lub brak prowizji: ${assignment.employeeId}`);
                return;
            }

            console.log(`👤 Pracownik: ${employee.firstName} ${employee.lastName} (${employee.salesCommission}%)`);

            // Oblicz prowizję od całkowitej ceny (zaliczka + dopłata)
            const totalAmount = operation.finalPrice;
            const commissionAmount = (totalAmount * employee.salesCommission) / 100;

            console.log(`💵 Obliczam prowizję: ${employee.salesCommission}% z ${totalAmount} zł = ${commissionAmount} zł`);

            // Sprawdź czy prowizja za tę operację już istnieje
            const existingCommission = await FinancialOperation.findOne({
                productId: operation.productId,
                type: 'sales_commission',
                employeeId: assignment.employeeId,
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (existingCommission) {
                console.log(`⚠️ Prowizja już istnieje dla tej operacji`);
                return;
            }

            // Zapisz prowizję
            const commissionOperation = new FinancialOperation({
                userSymbol: 'SYSTEM',
                amount: commissionAmount,
                currency: operation.currency,
                type: 'sales_commission',
                reason: `Prowizja ${employee.salesCommission}% od zaliczki na produkt ${operation.productName} - całkowita wartość: ${totalAmount} ${operation.currency}`,
                date: operation.date,
                employeeId: assignment.employeeId,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeCode: employee.employeeId,
                productId: operation.productId,
                salesAmount: totalAmount,
                commissionRate: employee.salesCommission
            });

            await commissionOperation.save();

            console.log(`✅ PROWIZJA OD ZALICZKI: ${commissionAmount} ${operation.currency} dla ${employee.firstName} ${employee.lastName}`);

        } catch (error) {
            console.error('❌ Error calculating advance commission:', error);
            // Nie przerywamy procesu - zaliczka zostanie zapisana bez prowizji
        }
    }
}

module.exports = new FinancialOperationController();