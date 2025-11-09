const express = require('express');
const router = express.Router();
const WorkHours = require('../db/models/workHours');
const Employee = require('../db/models/employee');
const checkAuth = require('../middleware/check-auth');

// GET /api/work-hours - Pobieranie wszystkich wpisów czasu pracy
router.get('/', checkAuth, async (req, res) => {
  try {
    const { 
      employeeId, 
      startDate, 
      endDate, 
      sellingPoint, 
      location,
      page = 1, 
      limit = 50 
    } = req.query;

    // Budowanie query
    const query = {};
    
    if (employeeId) query.employeeId = employeeId;
    if (sellingPoint) query.sellingPoint = sellingPoint;
    if (location) query.location = location;
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const skip = (page - 1) * limit;

    const workHours = await WorkHours.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('createdBy', 'email username')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkHours.countDocuments(query);

    res.json({
      workHours,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching work hours:', error);
    res.status(500).json({ 
      message: 'Błąd podczas pobierania godzin pracy', 
      error: error.message 
    });
  }
});

// GET /api/work-hours/:employeeId/summary - Podsumowanie dla konkretnego pracownika
router.get('/:employeeId/summary', checkAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    // Pobieranie danych pracownika
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Pracownik nie znaleziony' });
    }

    // Pobieranie godzin pracy
    const workHours = await WorkHours.getEmployeeWorkHours(employeeId, startDate, endDate);
    
    // Obliczanie podsumowania
    const summary = await WorkHours.calculateTotalPay(employeeId, startDate, endDate);

    res.json({
      employee: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        hourlyRate: employee.hourlyRate
      },
      workHours,
      summary: summary[0] || {
        totalHours: 0,
        totalPay: 0,
        workDays: 0,
        averageHoursPerDay: 0
      }
    });
  } catch (error) {
    console.error('Error fetching work hours summary:', error);
    res.status(500).json({ 
      message: 'Błąd podczas pobierania podsumowania godzin pracy', 
      error: error.message 
    });
  }
});

// POST /api/work-hours - Dodawanie nowego wpisu godzin pracy
router.post('/', checkAuth, async (req, res) => {
  try {
    const {
      employeeId,
      date,
      startTime,
      endTime,
      sellingPoint,
      location,
      notes
    } = req.body;

    // Walidacja wymaganych pól
    if (!employeeId || !date || !startTime || !endTime || !sellingPoint || !location) {
      return res.status(400).json({ 
        message: 'Wszystkie wymagane pola muszą być wypełnione',
        required: ['employeeId', 'date', 'startTime', 'endTime', 'sellingPoint', 'location']
      });
    }

    // Sprawdzenie czy pracownik istnieje
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Pracownik nie znaleziony' });
    }

    // Sprawdzenie czy wpis dla tego pracownika i daty już istnieje
    const existingRecord = await WorkHours.findOne({
      employeeId,
      date
    });

    if (existingRecord) {
      return res.status(400).json({ 
        message: 'Wpis godzin pracy dla tego pracownika w tym dniu już istnieje',
        existingRecord
      });
    }

    // Tworzenie nowego wpisu
    const workHoursData = {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      date,
      startTime,
      endTime,
      sellingPoint,
      location,
      notes,
      hourlyRate: employee.hourlyRate,
      createdBy: req.userData.userId,
      createdByName: req.userData.email || req.userData.username
    };

    // Calculate totalHours and dailyPay manually as backup
    const start = startTime.split(':');
    const end = endTime.split(':');
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    
    let totalMinutes = endMinutes - startMinutes;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Handle overnight work
    }
    
    workHoursData.totalHours = totalMinutes / 60;
    workHoursData.dailyPay = workHoursData.totalHours * employee.hourlyRate;

    const newWorkHours = new WorkHours(workHoursData);
    await newWorkHours.save();

    // Populate przed zwróceniem
    await newWorkHours.populate('employeeId', 'firstName lastName employeeId');
    await newWorkHours.populate('createdBy', 'email username');

    res.status(201).json({
      message: 'Godziny pracy zostały dodane pomyślnie',
      workHours: newWorkHours
    });
  } catch (error) {
    console.error('Error creating work hours:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Błąd walidacji danych',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Błąd podczas dodawania godzin pracy', 
      error: error.message 
    });
  }
});

// PUT /api/work-hours/:id - Aktualizacja wpisu godzin pracy
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      startTime,
      endTime,
      notes
    } = req.body;

    const workHours = await WorkHours.findById(id);
    if (!workHours) {
      return res.status(404).json({ message: 'Wpis godzin pracy nie znaleziony' });
    }

    // Aktualizacja pól
    if (startTime) workHours.startTime = startTime;
    if (endTime) workHours.endTime = endTime;
    if (notes !== undefined) workHours.notes = notes;

    // Ręczne obliczenie totalHours i dailyPay jako backup dla pre-save middleware
    if (workHours.startTime && workHours.endTime) {
      const startHour = parseInt(workHours.startTime.split(':')[0]);
      const startMinute = parseInt(workHours.startTime.split(':')[1]);
      const endHour = parseInt(workHours.endTime.split(':')[0]);
      const endMinute = parseInt(workHours.endTime.split(':')[1]);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      const totalMinutes = endMinutes - startMinutes;
      workHours.totalHours = totalMinutes / 60; // Konwersja na godziny
      
      // Oblicz dailyPay
      const employee = await Employee.findById(workHours.employeeId);
      if (employee && employee.hourlyRate) {
        workHours.dailyPay = workHours.totalHours * employee.hourlyRate;
      }
    }

    await workHours.save();

    // Populate przed zwróceniem
    await workHours.populate('employeeId', 'firstName lastName employeeId');
    await workHours.populate('createdBy', 'email username');

    res.json({
      message: 'Godziny pracy zostały zaktualizowane',
      workHours
    });
  } catch (error) {
    console.error('Error updating work hours:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Błąd walidacji danych',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Błąd podczas aktualizacji godzin pracy', 
      error: error.message 
    });
  }
});

// DELETE /api/work-hours/:id - Usuwanie wpisu godzin pracy
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const workHours = await WorkHours.findById(id);
    if (!workHours) {
      return res.status(404).json({ message: 'Wpis godzin pracy nie znaleziony' });
    }

    await WorkHours.findByIdAndDelete(id);

    res.json({
      message: 'Wpis godzin pracy został usunięty',
      deletedWorkHours: workHours
    });
  } catch (error) {
    console.error('Error deleting work hours:', error);
    res.status(500).json({ 
      message: 'Błąd podczas usuwania godzin pracy', 
      error: error.message 
    });
  }
});

// GET /api/work-hours/reports/daily - Raport dzienny wszystkich pracowników
router.get('/reports/daily', checkAuth, async (req, res) => {
  try {
    const { date, sellingPoint, location } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Data jest wymagana' });
    }

    const query = { date };
    if (sellingPoint) query.sellingPoint = sellingPoint;
    if (location) query.location = location;

    const dailyReport = await WorkHours.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ employeeName: 1 });

    const summary = {
      totalEmployees: dailyReport.length,
      totalHours: dailyReport.reduce((sum, record) => sum + record.totalHours, 0),
      totalPay: dailyReport.reduce((sum, record) => sum + record.dailyPay, 0),
      averageHours: dailyReport.length > 0 ? 
        dailyReport.reduce((sum, record) => sum + record.totalHours, 0) / dailyReport.length : 0
    };

    res.json({
      date,
      sellingPoint,
      location,
      summary,
      employees: dailyReport
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ 
      message: 'Błąd podczas generowania raportu dziennego', 
      error: error.message 
    });
  }
});

module.exports = router;