const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Employee = require('../db/models/employee'); // Model pracownika
const FinancialOperation = require('../db/models/financialOperation'); // Model operacji finansowych
const WorkHours = require('../db/models/workHours'); // Model godzin pracy
const checkAuth = require('../middleware/check-auth'); // Middleware autoryzacji
const historyLogger = require('../middleware/historyLogger');

// ========== ZABEZPIECZONE ENDPOINTY (wymagają autoryzacji) ==========

// GET - Pobierz wszystkich pracowników
router.get('/', checkAuth, async (req, res) => {
    try {
        const employees = await Employee.find({}).sort({ employeeId: 1 });
        res.status(200).json({
            success: true,
            employees: employees
        });
    } catch (error) {
        console.error('Błąd podczas pobierania pracowników:', error);
        res.status(500).json({
            success: false,
            message: 'Błąd serwera podczas pobierania pracowników'
        });
    }
});

// POST - Dodaj nowego pracownika
router.post('/', checkAuth, historyLogger('employees'), async (req, res) => {
    try {
        const { firstName, lastName, workLocation, position, hourlyRate, salesCommission, notes } = req.body;

        // Walidacja wymaganych pól
        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Imię i nazwisko są wymagane'
            });
        }

        // Walidacja miejsca zatrudnienia
        if (!workLocation) {
            return res.status(400).json({
                success: false,
                message: 'Miejsce zatrudnienia jest wymagane'
            });
        }

        // Walidacja stawki godzinowej
        if (hourlyRate && (isNaN(hourlyRate) || hourlyRate < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Stawka godzinowa musi być liczbą większą lub równą 0'
            });
        }

        // Walidacja procentu od sprzedaży
        if (salesCommission && (isNaN(salesCommission) || salesCommission < 0 || salesCommission > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Procent od sprzedaży musi być liczbą między 0 a 100'
            });
        }

        // Generowanie automatycznego ID pracownika
        const lastEmployee = await Employee.findOne({}).sort({ employeeId: -1 });
        let newEmployeeNumber = 1;
        if (lastEmployee && lastEmployee.employeeId) {
            const lastNumber = parseInt(lastEmployee.employeeId.replace('EMP', ''));
            newEmployeeNumber = lastNumber + 1;
        }
        const employeeId = `EMP${newEmployeeNumber.toString().padStart(3, '0')}`;

        const newEmployee = new Employee({
            employeeId,
            firstName,
            lastName,
            workLocation,
            position: position || '',
            hourlyRate: hourlyRate || 0,
            salesCommission: salesCommission || 0,
            notes: notes || ''
        });

        const savedEmployee = await newEmployee.save();

        res.status(201).json({
            success: true,
            message: 'Pracownik został dodany pomyślnie',
            employee: savedEmployee
        });

    } catch (error) {
        console.error('Błąd podczas dodawania pracownika:', error);
        res.status(500).json({
            success: false,
            message: 'Błąd serwera podczas dodawania pracownika'
        });
    }
});

// PUT - Aktualizuj pracownika
router.put('/:id', checkAuth, historyLogger('employees'), async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, workLocation, position, hourlyRate, salesCommission, notes } = req.body;

        // Walidacja ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Nieprawidłowe ID pracownika'
            });
        }

        // Walidacja wymaganych pól
        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'Imię i nazwisko są wymagane'
            });
        }

        // Walidacja miejsca zatrudnienia
        if (!workLocation) {
            return res.status(400).json({
                success: false,
                message: 'Miejsce zatrudnienia jest wymagane'
            });
        }

        // Walidacja stawki godzinowej
        if (hourlyRate && (isNaN(hourlyRate) || hourlyRate < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Stawka godzinowa musi być liczbą większą lub równą 0'
            });
        }

        // Walidacja procentu od sprzedaży
        if (salesCommission && (isNaN(salesCommission) || salesCommission < 0 || salesCommission > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Procent od sprzedaży musi być liczbą między 0 a 100'
            });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            {
                firstName,
                lastName,
                workLocation,
                position: position || '',
                hourlyRate: hourlyRate || 0,
                salesCommission: salesCommission || 0,
                notes: notes || ''
            },
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({
                success: false,
                message: 'Pracownik nie został znaleziony'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Pracownik został zaktualizowany pomyślnie',
            employee: updatedEmployee
        });

    } catch (error) {
        console.error('Błąd podczas aktualizacji pracownika:', error);
        res.status(500).json({
            success: false,
            message: 'Błąd serwera podczas aktualizacji pracownika'
        });
    }
});

// DELETE - Usuń pracownika
router.delete('/:id', checkAuth, historyLogger('employees'), async (req, res) => {
    try {
        const { id } = req.params;

        // Walidacja ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Nieprawidłowe ID pracownika'
            });
        }

        const deletedEmployee = await Employee.findByIdAndDelete(id);

        if (!deletedEmployee) {
            return res.status(404).json({
                success: false,
                message: 'Pracownik nie został znaleziony'
            });
        }

        // Usuń wszystkie prowizje i operacje finansowe powiązane z pracownikiem
        const deletedCommissions = await FinancialOperation.deleteMany({
            employeeId: id.toString()
        });

        // Usuń godziny pracy dla tego pracownika
        const deletedWorkHours = await WorkHours.deleteMany({
            employeeId: id
        });

        console.log(`🗑️ Usunięto pracownika ${deletedEmployee.firstName} ${deletedEmployee.lastName}`);
        console.log(`🗑️ Usunięto ${deletedCommissions.deletedCount} prowizji/operacji finansowych`);
        console.log(`🗑️ Usunięto ${deletedWorkHours.deletedCount} wpisów godzin pracy`);

        res.status(200).json({
            success: true,
            message: 'Pracownik został usunięty pomyślnie',
            deletedData: {
                employee: deletedEmployee,
                commissionsDeleted: deletedCommissions.deletedCount,
                workHoursDeleted: deletedWorkHours.deletedCount
            }
        });

    } catch (error) {
        console.error('Błąd podczas usuwania pracownika:', error);
        res.status(500).json({
            success: false,
            message: 'Błąd serwera podczas usuwania pracownika'
        });
    }
});

module.exports = router;