const mongoose = require('../db/mongoose');
const SalesAssignment = require('../db/models/salesAssignment');

const migrateSalesAssignments = async () => {
    try {
        console.log('🔄 MIGRACJA: Rozpoczęcie migracji SalesAssignment...');

        // Znajdź wszystkie przypisania bez pola workDate
        const assignmentsWithoutWorkDate = await SalesAssignment.find({
            workDate: { $exists: false }
        });

        console.log(`📊 Znaleziono ${assignmentsWithoutWorkDate.length} przypisań do migracji`);

        if (assignmentsWithoutWorkDate.length === 0) {
            console.log('✅ Wszystkie przypisania mają już pole workDate');
            return;
        }

        // Ustaw dzisiejszą datę dla wszystkich starych przypisań
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const result = await SalesAssignment.updateMany(
            { workDate: { $exists: false } },
            { 
                $set: { 
                    workDate: todayStart 
                }
            }
        );

        console.log(`✅ MIGRACJA ZAKOŃCZONA: Zaktualizowano ${result.modifiedCount} przypisań`);
        console.log(`📅 Ustawiono workDate na: ${todayStart.toISOString()}`);

    } catch (error) {
        console.error('❌ BŁĄD MIGRACJI:', error);
    }
};

// Uruchom migrację jeśli plik jest uruchamiany bezpośrednio
if (require.main === module) {
    migrateSalesAssignments().then(() => {
        console.log('🏁 Migracja zakończona, zamykanie połączenia...');
        mongoose.connection.close();
        process.exit(0);
    });
}

module.exports = { migrateSalesAssignments };