const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SalesAssignment = require('../db/models/salesAssignment');
const Employee = require('../db/models/employee');
const User = require('../db/models/user');
const WorkHours = require('../db/models/workHours');
const FinancialOperation = require('../db/models/financialOperation');
const checkAuth = require('../middleware/check-auth');

// GET /api/sales-assignments - Pobieranie przypisań dla punktu sprzedaży (tylko dzisiejsze)
router.get('/', checkAuth, async (req, res) => {
  try {
    const { sellingPoint } = req.query;
    
    if (!sellingPoint) {
      return res.status(400).json({ message: 'Punkt sprzedaży jest wymagany' });
    }

    // Ustaw dzisiejszą datę (bez czasu)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const assignments = await SalesAssignment.find({ 
      sellingPoint: sellingPoint,
      isActive: true,
      workDate: todayStart  // Tylko dzisiejsze przypisania
    })
    .populate('employeeId', 'firstName lastName employeeId hourlyRate')
    .populate('assignedBy', 'email symbol')
    .sort({ assignedAt: -1 });

    res.json({
      success: true,
      assignments: assignments,
      count: assignments.length,
      workDate: todayStart
    });
  } catch (error) {
    console.error('Error fetching sales assignments:', error);
    res.status(500).json({ 
      message: 'Błąd podczas pobierania przypisań sprzedawców',
      error: error.message 
    });
  }
});

// POST /api/sales-assignments - Przypisanie sprzedawcy do punktu sprzedaży
router.post('/', checkAuth, async (req, res) => {
  try {
    const { employeeId, sellingPoint, notes } = req.body;
    const assignedById = req.userData.userId;

    if (!employeeId || !sellingPoint) {
      return res.status(400).json({ 
        message: 'ID pracownika i punkt sprzedaży są wymagane' 
      });
    }

    // Sprawdź czy pracownik istnieje
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Pracownik nie znaleziony' });
    }

    // Sprawdź czy już jest przypisany do tego punktu sprzedaży DZIŚ
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existingAssignment = await SalesAssignment.findOne({
      employeeId,
      sellingPoint,
      workDate: todayStart,
      isActive: true
    });

    if (existingAssignment) {
      return res.status(400).json({ 
        message: 'Pracownik jest już przypisany do tego punktu sprzedaży' 
      });
    }

    // Dezaktywuj wszystkie stare aktywne przypisania dla tego pracownika w tym punkcie sprzedaży
    await SalesAssignment.updateMany(
      {
        employeeId,
        sellingPoint,
        workDate: { $lt: todayStart },
        isActive: true
      },
      {
        isActive: false
      }
    );

    // Utwórz nowe przypisanie
    const assignment = new SalesAssignment({
      _id: new mongoose.Types.ObjectId(),
      employeeId,
      sellingPoint,
      assignedBy: assignedById,
      notes
    });

    await assignment.save();

    // ✅ NOWA LOGIKA: Pracownik dostaje prowizje tylko za PRZYSZŁE sprzedaże
    // NIE naliczamy mu prowizji za sprzedaże które były przed jego dodaniem
    // System automatycznie będzie mu naliczał prowizje za nowe sprzedaże bo isActive = true
    
    console.log(`✅ Pracownik ${employee.firstName} ${employee.lastName} został dodany. Będzie dostawał prowizje za sprzedaże od teraz.`);

    // Populate przed zwróceniem
    await assignment.populate('employeeId', 'firstName lastName employeeId hourlyRate');
    await assignment.populate('assignedBy', 'email symbol');

    res.status(201).json({
      success: true,
      message: 'Sprzedawca został pomyślnie przypisany',
      assignment
    });
  } catch (error) {
    console.error('Error creating sales assignment:', error);
    res.status(500).json({ 
      message: 'Błąd podczas przypisywania sprzedawcy',
      error: error.message 
    });
  }
});

// DELETE /api/sales-assignments/:id - Usunięcie przypisania sprzedawcy
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Nieprawidłowe ID przypisania' });
    }

    const assignment = await SalesAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ message: 'Przypisanie nie znalezione' });
    }

    if (!assignment.isActive) {
      return res.status(400).json({ message: 'Przypisanie jest już nieaktywne' });
    }

    // Oznacz przypisanie jako nieaktywne (soft delete)
    assignment.isActive = false;
    assignment.deactivatedAt = new Date(); // Dodaj timestamp deaktywacji
    await assignment.save();

    // ✅ NIE USUWAMY prowizji - pracownik zasłużył na te które już ma!
    // System automatycznie nie będzie naliczał mu nowych prowizji bo isActive = false
    
    console.log(`✅ Pracownik ${assignment.employeeId} został dezaktywowany. Zachowuje prowizje do momentu ${assignment.deactivatedAt.toLocaleString()}`);

    // Usuń wszystkie godziny pracy tego pracownika dla tego punktu sprzedaży
    try {
      const deletedWorkHours = await WorkHours.deleteMany({
        employeeId: assignment.employeeId,
        sellingPoint: assignment.sellingPoint
      });
      
      console.log(`Usunięto ${deletedWorkHours.deletedCount} wpisów godzin pracy dla przypisania ${id}`);
    } catch (workHoursError) {
      console.error('Błąd podczas usuwania godzin pracy:', workHoursError);
      // Nie przerywamy procesu - przypisanie już zostało usunięte
    }

    res.json({
      success: true,
      message: 'Przypisanie sprzedawcy zostało usunięte wraz z godzinami pracy'
    });
  } catch (error) {
    console.error('Error deleting sales assignment:', error);
    res.status(500).json({ 
      message: 'Błąd podczas usuwania przypisania',
      error: error.message 
    });
  }
});

// DELETE /api/sales-assignments/employee/:employeeId - Usunięcie przypisania przez ID pracownika
router.delete('/employee/:employeeId', checkAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { sellingPoint, deleteWorkHours } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Nieprawidłowe ID pracownika' });
    }

    if (!sellingPoint) {
      return res.status(400).json({ message: 'Punkt sprzedaży jest wymagany' });
    }

    // Konwertuj deleteWorkHours na boolean
    const shouldDeleteWorkHours = deleteWorkHours === 'true';

    // Ustaw dzisiejszą datę (bez czasu)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const assignment = await SalesAssignment.findOne({
      employeeId,
      sellingPoint,
      workDate: todayStart,  // Tylko dzisiejsze przypisanie
      isActive: true
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Przypisanie nie znalezione' });
    }

    // Oznacz przypisanie jako nieaktywne
    assignment.isActive = false;
    assignment.deactivatedAt = new Date(); // Dodaj timestamp deaktywacji
    await assignment.save();

    let deletedWorkHoursCount = 0;
    let deletedCommissionsCount = 0;

    // Usuń godziny pracy tylko jeśli użytkownik tego chce
    if (shouldDeleteWorkHours) {
      try {
        const deletedWorkHours = await WorkHours.deleteMany({
          employeeId: employeeId,
          sellingPoint: sellingPoint
        });
        
        deletedWorkHoursCount = deletedWorkHours.deletedCount;
        console.log(`Usunięto ${deletedWorkHoursCount} wpisów godzin pracy dla pracownika ${employeeId} w punkcie ${sellingPoint}`);

        // Usuń także wszystkie prowizje tego pracownika
        const deletedCommissions = await FinancialOperation.deleteMany({
          employeeId: employeeId.toString(),
          type: 'sales_commission'
        });
        
        deletedCommissionsCount = deletedCommissions.deletedCount;
        console.log(`🗑️ Usunięto ${deletedCommissionsCount} prowizji dla pracownika ${employeeId}`);

      } catch (workHoursError) {
        console.error('Błąd podczas usuwania godzin pracy lub prowizji:', workHoursError);
        // Nie przerywamy procesu - przypisanie już zostało usunięte
      }
    } else {
      console.log(`Zachowywanie godzin pracy i prowizji dla pracownika ${employeeId} w punkcie ${sellingPoint}`);
    }

    res.json({
      success: true,
      message: shouldDeleteWorkHours 
        ? 'Sprzedawca został usunięty z zespołu wraz z jego godzinami pracy i prowizbami'
        : 'Sprzedawca został usunięty z zespołu. Godziny pracy i prowizje zostały zachowane',
      deletedWorkHours: deletedWorkHoursCount,
      deletedCommissions: deletedCommissionsCount
    });
  } catch (error) {
    console.error('Error removing employee assignment:', error);
    res.status(500).json({ 
      message: 'Błąd podczas usuwania sprzedawcy z zespołu',
      error: error.message 
    });
  }
});

// GET /api/sales-assignments/employee/:employeeId - Pobieranie przypisań dla pracownika
router.get('/employee/:employeeId', checkAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Nieprawidłowe ID pracownika' });
    }

    const assignments = await SalesAssignment.find({ 
      employeeId,
      isActive: true 
    })
    .populate('assignedBy', 'email symbol')
    .sort({ assignedAt: -1 });

    res.json({
      success: true,
      assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error fetching employee assignments:', error);
    res.status(500).json({ 
      message: 'Błąd podczas pobierania przypisań pracownika',
      error: error.message 
    });
  }
});

// POST /api/sales-assignments/recalculate-commissions - Przelicz prowizje dla punktu sprzedaży
router.post('/recalculate-commissions', checkAuth, async (req, res) => {
  try {
    const { sellingPoint, date } = req.body;
    
    if (!sellingPoint) {
      return res.status(400).json({ message: 'Punkt sprzedaży jest wymagany' });
    }

    // Użyj podanej daty lub dziś
    const targetDate = date ? new Date(date) : new Date();
    const dateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);

    console.log(`🔄 Przeliczam prowizje dla punktu ${sellingPoint} za dzień ${dateStart.toLocaleDateString()}`);

    const Sales = require('../db/models/sales');
    const FinancialOperation = require('../db/models/financialOperation');

    // 1. Usuń wszystkie stare prowizje za ten dzień w tym punkcie
    const deletedOldCommissions = await FinancialOperation.deleteMany({
      type: 'sales_commission',
      date: { $gte: dateStart, $lt: dateEnd },
      reason: { $regex: sellingPoint }
    });

    console.log(`🗑️ Usunięto ${deletedOldCommissions.deletedCount} starych prowizji`);

    // 2. Znajdź aktywnych pracowników przypisanych do tego punktu w tym dniu
    const activeAssignments = await SalesAssignment.find({
      sellingPoint: sellingPoint,
      workDate: dateStart,
      isActive: true
    }).populate('employeeId');

    if (activeAssignments.length === 0) {
      return res.status(200).json({
        message: 'Brak aktywnych pracowników - nie ma prowizji do naliczenia',
        deletedCommissions: deletedOldCommissions.deletedCount,
        addedCommissions: 0
      });
    }

    console.log(`👥 Znaleziono ${activeAssignments.length} aktywnych pracowników`);

    // 3. Znajdź wszystkie sprzedaże z tego punktu w tym dniu
    const sales = await Sales.find({
      sellingPoint: sellingPoint,
      date: { $gte: dateStart, $lt: dateEnd },
      returned: { $ne: true }
    });

    console.log(`💰 Znaleziono ${sales.length} sprzedaży do przeliczenia`);

    let totalAddedCommissions = 0;
    let totalCommissionAmount = 0;

    // 4. Dla każdej sprzedaży nalicz prowizje wszystkim aktywnym pracownikom
    for (const sale of sales) {
      // Oblicz wartość sprzedaży
      let saleAmount = 0;
      if (sale.cash && Array.isArray(sale.cash)) {
        saleAmount += sale.cash.reduce((sum, payment) => sum + (payment.price || 0), 0);
      }
      if (sale.card && Array.isArray(sale.card)) {
        saleAmount += sale.card.reduce((sum, payment) => sum + (payment.price || 0), 0);
      }

      if (saleAmount <= 0) continue;

      // Nalicz prowizję każdemu pracownikowi
      for (const assignment of activeAssignments) {
        const employee = assignment.employeeId;
        if (!employee || !employee.salesCommission || employee.salesCommission <= 0) continue;

        const commissionAmount = (saleAmount * employee.salesCommission) / 100;

        const commissionOperation = new FinancialOperation({
          userSymbol: 'SYSTEM',
          amount: commissionAmount,
          currency: 'PLN',
          type: 'sales_commission',
          reason: `Prowizja ${employee.salesCommission}% od sprzedaży ${saleAmount} zł - ${sellingPoint} (przeliczenie)`,
          date: sale.date,
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeCode: employee.employeeId,
          salesId: sale._id.toString(),
          salesAmount: saleAmount,
          commissionRate: employee.salesCommission
        });

        await commissionOperation.save();
        totalAddedCommissions++;
        totalCommissionAmount += commissionAmount;

        console.log(`✅ Naliczono ${commissionAmount.toFixed(2)} PLN dla ${employee.firstName} ${employee.lastName}`);
      }
    }

    res.status(200).json({
      message: `Przeliczono prowizje dla punktu ${sellingPoint}`,
      date: dateStart.toLocaleDateString(),
      deletedCommissions: deletedOldCommissions.deletedCount,
      addedCommissions: totalAddedCommissions,
      totalAmount: totalCommissionAmount.toFixed(2),
      salesProcessed: sales.length,
      activeEmployees: activeAssignments.length
    });

  } catch (error) {
    console.error('Error recalculating commissions:', error);
    res.status(500).json({ 
      message: 'Błąd podczas przeliczania prowizji',
      error: error.message 
    });
  }
});

module.exports = router;