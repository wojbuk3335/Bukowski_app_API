const mongoose = require('mongoose');

const workHoursSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID jest wymagane']
  },
  employeeName: {
    type: String,
    required: [true, 'Imię i nazwisko pracownika jest wymagane']
  },
  date: {
    type: String, // Format: "2025-11-08"
    required: [true, 'Data jest wymagana'],
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Data musi być w formacie YYYY-MM-DD'
    }
  },
  startTime: {
    type: String, // Format: "08:00"
    required: [true, 'Godzina rozpoczęcia jest wymagana'],
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Godzina rozpoczęcia musi być w formacie HH:MM'
    }
  },
  endTime: {
    type: String, // Format: "16:00"
    required: [true, 'Godzina zakończenia jest wymagana'],
    validate: {
      validator: function(v) {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
      },
      message: 'Godzina zakończenia musi być w formacie HH:MM'
    }
  },
  totalHours: {
    type: Number,
    required: true,
    min: [0, 'Liczba godzin nie może być ujemna'],
    max: [24, 'Liczba godzin nie może przekraczać 24']
  },
  sellingPoint: {
    type: String,
    required: [true, 'Punkt sprzedaży jest wymagany'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Lokalizacja jest wymagana'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ID użytkownika tworzącego wpis jest wymagane']
  },
  createdByName: {
    type: String,
    required: [true, 'Nazwa użytkownika tworzącego wpis jest wymagana']
  },
  notes: {
    type: String,
    trim: true,
    maxLength: [500, 'Notatki nie mogą przekraczać 500 znaków']
  },
  hourlyRate: {
    type: Number,
    required: [true, 'Stawka godzinowa jest wymagana'],
    min: [0, 'Stawka godzinowa nie może być ujemna']
  },
  dailyPay: {
    type: Number,
    required: true,
    min: [0, 'Dzienna wypłata nie może być ujemna']
  }
}, {
  timestamps: true // Automatyczne createdAt i updatedAt
});

// Index dla szybszego wyszukiwania
workHoursSchema.index({ employeeId: 1, date: 1 });
workHoursSchema.index({ date: 1 });
workHoursSchema.index({ sellingPoint: 1, date: 1 });

// Middleware do automatycznego obliczania totalHours i dailyPay przed zapisem
workHoursSchema.pre('save', function(next) {
  // Obliczanie totalHours na podstawie startTime i endTime
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  // Obsługa pracy przez północ
  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // Dodaj 24 godziny jeśli praca przez północ
  }
  
  this.totalHours = totalMinutes / 60;
  
  // Obliczanie dziennej wypłaty
  this.dailyPay = this.totalHours * this.hourlyRate;
  
  next();
});

// Statyczna metoda do pobierania zapisów dla konkretnego pracownika w danym okresie
workHoursSchema.statics.getEmployeeWorkHours = function(employeeId, startDate, endDate) {
  const query = { employeeId };
  
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    query.date = { $gte: startDate };
  } else if (endDate) {
    query.date = { $lte: endDate };
  }
  
  return this.find(query).sort({ date: -1 });
};

// Statyczna metoda do obliczania całkowitej wypłaty dla pracownika w okresie
workHoursSchema.statics.calculateTotalPay = function(employeeId, startDate, endDate) {
  const matchQuery = { employeeId };
  
  if (startDate && endDate) {
    matchQuery.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    matchQuery.date = { $gte: startDate };
  } else if (endDate) {
    matchQuery.date = { $lte: endDate };
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$employeeId',
        totalHours: { $sum: '$totalHours' },
        totalPay: { $sum: '$dailyPay' },
        workDays: { $sum: 1 },
        employeeName: { $first: '$employeeName' },
        averageHoursPerDay: { $avg: '$totalHours' }
      }
    }
  ]);
};

module.exports = mongoose.model('WorkHours', workHoursSchema);