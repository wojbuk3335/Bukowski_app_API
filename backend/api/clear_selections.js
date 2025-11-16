const mongoose = require('mongoose');

async function clearSelections() {
  try {
    await mongoose.connect('mongodb+srv://wojbuk:Wojbuk123@cluster0.dddra.mongodb.net/Sprzedaz?retryWrites=true&w=majority');
    
    // Usuń wszystkie zaznaczenia z bazy
    const result = await mongoose.connection.db.collection('printselections').deleteMany({});
    console.log('🗑️ Usunięto wszystkie zaznaczenia:', result.deletedCount);
    
    await mongoose.disconnect();
    console.log('✅ Gotowe - wszystkie checkboxy są teraz odznaczone');
  } catch (error) {
    console.error('❌ Błąd:', error);
  }
}

clearSelections();