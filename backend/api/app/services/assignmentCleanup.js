const cron = require('node-cron');
const SalesAssignment = require('../db/models/salesAssignment');

// Funkcja czyszcząca stare przypisania
const cleanupOldAssignments = async () => {
    try {
        // Ustaw wczorajszą datę (bez czasu)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

        // Oznacz jako nieaktywne wszystkie przypisania starsze niż dzisiaj
        const result = await SalesAssignment.updateMany(
            { 
                workDate: { $lt: yesterdayStart },
                isActive: true 
            },
            { 
                isActive: false 
            }
        );

        console.log(`🕛 CLEANUP: Dezaktywowano ${result.modifiedCount} starych przypisań sprzedawców`);
        
        return result.modifiedCount;
    } catch (error) {
        console.error('❌ CLEANUP ERROR: Błąd podczas czyszczenia starych przypisań:', error);
        return 0;
    }
};

// Scheduler uruchamiany codziennie o 00:01 (1 minuta po północy)
const startDailyCleanup = () => {
    // Cron job: każdego dnia o 00:01
    cron.schedule('1 0 * * *', async () => {
        console.log('🕛 ROZPOCZĘCIE DZIENNEGO CZYSZCZENIA PRZYPISAŃ...');
        const cleanedCount = await cleanupOldAssignments();
        console.log(`🕛 ZAKOŃCZONO CZYSZCZENIE: ${cleanedCount} starych przypisań`);
    }, {
        scheduled: true,
        timezone: "Europe/Warsaw"
    });

    console.log('✅ SCHEDULER: Dzienne czyszczenie przypisań zostało skonfigurowane (00:01 każdego dnia)');
};

// Funkcja do manualnego uruchomienia czyszczenia (do testów)
const manualCleanup = async () => {
    console.log('🔧 MANUALNE CZYSZCZENIE: Rozpoczęcie...');
    const cleanedCount = await cleanupOldAssignments();
    console.log(`🔧 MANUALNE CZYSZCZENIE: Zakończono, ${cleanedCount} przypisań`);
    return cleanedCount;
};

module.exports = {
    startDailyCleanup,
    cleanupOldAssignments,
    manualCleanup
};