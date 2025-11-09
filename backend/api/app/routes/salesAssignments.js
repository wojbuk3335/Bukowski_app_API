const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SalesAssignment = require('../db/models/salesAssignment');
const Employee = require('../db/models/employee');
const User = require('../db/models/user');
const WorkHours = require('../db/models/workHours');
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
    await assignment.save();

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
    const { sellingPoint } = req.query;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Nieprawidłowe ID pracownika' });
    }

    if (!sellingPoint) {
      return res.status(400).json({ message: 'Punkt sprzedaży jest wymagany' });
    }

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
    await assignment.save();

    // Usuń wszystkie godziny pracy tego pracownika dla tego punktu sprzedaży
    try {
      const deletedWorkHours = await WorkHours.deleteMany({
        employeeId: employeeId,
        sellingPoint: sellingPoint
      });
      
      console.log(`Usunięto ${deletedWorkHours.deletedCount} wpisów godzin pracy dla pracownika ${employeeId} w punkcie ${sellingPoint}`);
    } catch (workHoursError) {
      console.error('Błąd podczas usuwania godzin pracy:', workHoursError);
      // Nie przerywamy procesu - przypisanie już zostało usunięte
    }

    res.json({
      success: true,
      message: 'Sprzedawca został usunięty z zespołu wraz z jego godzinami pracy'
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

module.exports = router;