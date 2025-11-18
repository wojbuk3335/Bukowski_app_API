const FinancialOperation = require('../db/models/financialOperation');

class FinancialOperationController {
    // Create a new financial operation
    createFinancialOperation = async (req, res) => {
        try {
            const operation = new FinancialOperation(req.body);
            await operation.save();
            
            // Sprawdź czy to zaliczka na produkt z ceną finalną - jeśli tak, oblicz prowizję
            await this.calculateAdvanceCommission(operation);
            
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
            
            // Jeśli zapytanie dotyczy prowizji, grupuj je dziennie
            if (req.query.type === 'sales_commission') {
                const groupedCommissions = await this.groupCommissionsByDay(operations);
                res.status(200).json(groupedCommissions);
            } else {
                res.status(200).json(operations);
            }
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
    calculateAdvanceCommission = async (operation) => {
        try {
            // Sprawdź czy to zaliczka na produkt z ceną finalną
            if (operation.type !== 'addition' || !operation.finalPrice || operation.finalPrice <= 0) {
                return; // Nie jest to zaliczka na produkt lub brak ceny finalnej
            }

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

            // KONTROLA GODZIN PRACY - sprawdź czy zaliczka była wzięta w godzinach pracy
            const WorkHours = require('../db/models/workHours');
            const operationTime = new Date(operation.date);
            const operationHour = operationTime.getHours();
            const operationMinute = operationTime.getMinutes();
            const operationTimeInMinutes = operationHour * 60 + operationMinute;

            // Znajdź godziny pracy pracownika dla tego dnia
            const dateString = operationDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            const workHours = await WorkHours.findOne({
                employeeId: assignment.employeeId,
                date: dateString // Używaj string zamiast Date range
            });

            if (!workHours) {
                console.log(`❌ Brak godzin pracy dla pracownika ${employee.firstName} ${employee.lastName} na dzień ${operationDate.toLocaleDateString()}`);
                return;
            }

            // Konwertuj godziny pracy na minuty
            const startTime = workHours.startTime.split(':');
            const endTime = workHours.endTime.split(':');
            const startTimeInMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
            const endTimeInMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);

            // Sprawdź czy operacja była w godzinach pracy
            if (operationTimeInMinutes < startTimeInMinutes || operationTimeInMinutes > endTimeInMinutes) {
                return;
            }

            // Oblicz prowizję od całkowitej ceny (zaliczka + dopłata)
            const totalAmount = operation.finalPrice;
            const commissionAmount = (totalAmount * employee.salesCommission) / 100;

            // Sprawdź czy już istnieje dzienna prowizja dla tego pracownika
            const existingDailyCommission = await FinancialOperation.findOne({
                type: 'sales_commission',
                employeeId: assignment.employeeId,
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });

            if (existingDailyCommission) {
                // Aktualizuj istniejącą prowizję - dodaj nową kwotę i sprzedaż
                const newCommissionAmount = existingDailyCommission.amount + commissionAmount;
                const newSalesAmount = existingDailyCommission.salesAmount + totalAmount;
                
                // Dodaj nowy szczegół prowizji do listy
                const newCommissionDetail = {
                    productName: operation.productName,
                    productId: operation.productId,
                    saleAmount: totalAmount,
                    commissionAmount: commissionAmount,
                    operationId: operation._id,
                    description: `Prowizja od zaliczki na ${operation.productName} - ${totalAmount} PLN`
                };

                const updatedDetails = [...(existingDailyCommission.commissionDetails || []), newCommissionDetail];
                
                await FinancialOperation.findByIdAndUpdate(existingDailyCommission._id, {
                    amount: newCommissionAmount,
                    salesAmount: newSalesAmount,
                    reason: `Prowizja ${employee.salesCommission}% od zaliczek - całkowita wartość sprzedaży: ${newSalesAmount} PLN`,
                    commissionDetails: updatedDetails,
                    updatedAt: new Date()
                });

                return;
            }

            // Utwórz nową dzienną prowizję jeśli nie istnieje
            const initialCommissionDetail = {
                productName: operation.productName,
                productId: operation.productId,
                saleAmount: totalAmount,
                commissionAmount: commissionAmount,
                operationId: operation._id,
                description: `Prowizja od zaliczki na ${operation.productName} - ${totalAmount} PLN`
            };

            const commissionOperation = new FinancialOperation({
                userSymbol: 'SYSTEM',
                amount: commissionAmount,
                currency: 'PLN', // Commission is always calculated in PLN
                type: 'sales_commission',
                reason: `Prowizja ${employee.salesCommission}% od zaliczek - całkowita wartość sprzedaży: ${totalAmount} PLN`,
                date: operation.date,
                employeeId: assignment.employeeId,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                employeeCode: employee.employeeId,
                salesAmount: totalAmount,
                commissionRate: employee.salesCommission,
                commissionDetails: [initialCommissionDetail]
            });

            await commissionOperation.save();

            console.log(`✅ PROWIZJA OD ZALICZKI: ${commissionAmount} ${operation.currency} dla ${employee.firstName} ${employee.lastName}`);

        } catch (error) {
            console.error('❌ Error calculating advance commission:', error);
            // Nie przerywamy procesu - zaliczka zostanie zapisana bez prowizji
        }
    }

    // Get commission details for a specific commission operation
    getCommissionDetails = async (req, res) => {
        try {
            const operation = await FinancialOperation.findById(req.params.id);
            if (!operation) {
                return res.status(404).json({ message: 'Commission operation not found' });
            }

            if (operation.type !== 'sales_commission') {
                return res.status(400).json({ message: 'This operation is not a commission' });
            }

            res.status(200).json({
                commissionDetails: operation.commissionDetails || [],
                totalAmount: operation.amount,
                totalSalesAmount: operation.salesAmount,
                commissionRate: operation.commissionRate,
                employeeName: operation.employeeName
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Grupuj prowizje według dnia
    groupCommissionsByDay = async (commissions) => {
        const grouped = {};
        
        for (const commission of commissions) {
            const dateKey = new Date(commission.date).toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = {
                    _id: `grouped_${dateKey}_${commission.employeeId}`,
                    date: commission.date,
                    type: 'sales_commission',
                    operation: 'sales_commission',
                    amount: 0,
                    currency: commission.currency || 'PLN',
                    reason: 'Prowizja od sprzedaży',
                    employeeId: commission.employeeId,
                    employeeName: commission.employeeName,
                    salesAmount: 0,
                    commissionRate: commission.commissionRate, // Bierzemy z pierwszej prowizji
                    commissionDetails: [] // Szczegółowy breakdown
                };
            }
            
            // Dodaj kwotę prowizji do sumy dziennej
            grouped[dateKey].amount += commission.amount;
            grouped[dateKey].salesAmount += commission.salesAmount || 0;
            
            // Jeśli prowizja już ma szczegóły w commissionDetails, użyj ich
            if (commission.commissionDetails && commission.commissionDetails.length > 0) {
                grouped[dateKey].commissionDetails.push(...commission.commissionDetails);
            } else {
                // Jeśli nie ma szczegółów, stwórz jeden element
                
                // Określ nazwę produktu
                let productName = commission.productName;
                
                if (!productName) {
                    if (commission.reason && commission.reason.includes('zaliczek')) {
                        productName = await this.findProductNameForAdvanceCommission(commission);
                    }
                    if (!productName) {
                        productName = this.extractProductNameFromReason(commission.reason);
                    }
                    if (!productName) {
                        productName = 'Nieznany produkt';
                    }
                }
                
                // Dodaj szczegóły do breakdown
                grouped[dateKey].commissionDetails.push({
                    productName: productName,
                    saleAmount: commission.salesAmount || 0,
                    commissionAmount: commission.amount,
                    description: commission.reason,
                    originalId: commission._id
                });
            }
        }
        
        // Konwertuj obiekt na tablicę
        return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Wyciągnij nazwę produktu z opisu prowizji
    extractProductNameFromReason = (reason) => {
        if (!reason) return null;
        
        // Dla prowizji dziennej: "Prowizja dzienna 1% od sprzedaży 25000 zł - Parzygnat (1 sprzedaży: Dagmara ZŁOTY L)"
        let match = reason.match(/sprzedaży:\s*([^)]+)/);
        if (match) {
            return match[1].trim(); // "Dagmara ZŁOTY L"
        }
        
        // Dla prowizji od zaliczek: "Prowizja 1% od zaliczek - całkowita wartość sprzedaży: 1000 PLN"
        if (reason.includes('zaliczek')) {
            return 'Prowizja od zaliczek';
        }
        
        // Jeśli nie można wyciągnąć, zwróć null
        return null;
    };

    // Znajdź nazwę produktu dla prowizji od zaliczek
    findProductNameForAdvanceCommission = async (commission) => {
        try {
            // Znajdź zaliczkę z tego samego dnia - może być type "addition" lub "employee_advance"
            const commissionDate = new Date(commission.date);
            const startOfDay = new Date(commissionDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(commissionDate.setHours(23, 59, 59, 999));

            const relatedAdvance = await FinancialOperation.findOne({
                $or: [
                    { type: 'employee_advance' },
                    { type: 'addition' }
                ],
                productName: { $exists: true, $ne: null },
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            });
            
            return relatedAdvance?.productName || null;
        } catch (error) {
            console.error('Error finding product name for advance commission:', error);
            return null;
        }
    };

    // Delete financial operation and related commission
    deleteFinancialOperation = async (req, res) => {
        try {
            const { id } = req.params;
            
            // Znajdź operację przed usunięciem
            const operation = await FinancialOperation.findById(id);
            
            if (!operation) {
                return res.status(404).json({ error: 'Operacja finansowa nie znaleziona' });
            }
            
            // Jeśli to zaliczka na produkt (type: 'addition' z finalPrice), usuń powiązaną prowizję
            if (operation.type === 'addition' && operation.finalPrice && operation.productName) {
                const operationDate = new Date(operation.date);
                const startOfDay = new Date(operationDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(operationDate.setHours(23, 59, 59, 999));
                
                // Znajdź prowizje które zawierają ten produkt w commissionDetails
                const commissions = await FinancialOperation.find({
                    type: 'sales_commission',
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    'commissionDetails.productName': operation.productName
                });
                
                let deletedCount = 0;
                
                for (const commission of commissions) {
                    // Usuń produkt z commissionDetails
                    const updatedDetails = commission.commissionDetails.filter(
                        detail => detail.productName !== operation.productName
                    );
                    
                    if (updatedDetails.length === 0) {
                        // Jeśli to był jedyny produkt w prowizji, usuń całą prowizję
                        await FinancialOperation.findByIdAndDelete(commission._id);
                        deletedCount++;
                        console.log(`Usunięto całą prowizję ${commission._id} dla produktu ${operation.productName}`);
                    } else {
                        // Jeśli są jeszcze inne produkty, przelicz prowizję
                        const newTotalSales = updatedDetails.reduce((sum, d) => sum + d.salesAmount, 0);
                        const newCommission = newTotalSales * (commission.commissionRate / 100);
                        
                        await FinancialOperation.findByIdAndUpdate(commission._id, {
                            commissionDetails: updatedDetails,
                            salesAmount: newTotalSales,
                            amount: newCommission,
                            reason: `Prowizja ${commission.commissionRate}% od zaliczek - całkowita wartość sprzedaży: ${newTotalSales} PLN`
                        });
                        
                        console.log(`Zaktualizowano prowizję ${commission._id}, usunięto produkt ${operation.productName}`);
                    }
                }
                
                console.log(`Przetworzono ${commissions.length} prowizji dla zaliczki ${id}`);
            }
            
            // Usuń główną operację
            await FinancialOperation.findByIdAndDelete(id);
            
            res.status(200).json({ 
                message: 'Financial operation deleted successfully',
                operation,
                deletedCommissions: operation.type === 'addition' && operation.finalPrice ? true : false
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Delete all financial operations
    deleteAllFinancialOperations = async (req, res) => {
        try {
            const result = await FinancialOperation.deleteMany({});
            res.status(200).json({ 
                message: 'Wszystkie operacje finansowe zostały usunięte',
                deletedCount: result.deletedCount
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    // Update financial operation
    updateFinancialOperation = async (req, res) => {
        try {
            const { id } = req.params;
            const operation = await FinancialOperation.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );
            
            if (!operation) {
                return res.status(404).json({ error: 'Operacja finansowa nie znaleziona' });
            }
            
            res.status(200).json(operation);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}

module.exports = new FinancialOperationController();