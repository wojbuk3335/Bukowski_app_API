#!/bin/bash

# Skrypt uruchamiający migrację dodającą pole rowBackgroundColor
# Użycie: ./run_migration_row_background_color.sh

echo "🚀 Uruchamianie migracji: Dodawanie pola rowBackgroundColor"
echo "📅 Data: $(date)"
echo ""

# Sprawdź czy plik .env istnieje
if [ -f "server-env-correct.env" ]; then
    echo "📁 Ładowanie zmiennych środowiskowych z server-env-correct.env"
    export $(cat server-env-correct.env | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    echo "📁 Ładowanie zmiennych środowiskowych z .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Plik .env nie znaleziony. Używanie domyślnych ustawień."
    export MONGODB_URI="mongodb://localhost:27017"
    export DB_NAME="bukowski_inventory"
fi

echo "🗃️  Baza danych: $DB_NAME"
echo "🔗 MongoDB URI: $(echo $MONGODB_URI | sed 's/\/\/[^:]*:[^@]*@/\/\/***:***@/')"
echo ""

# Uruchom migrację
echo "🔄 Uruchamianie migracji..."
node migrate_add_row_background_color.js

# Sprawdź wynik
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migracja zakończona pomyślnie!"
    echo "📝 Wszystkie produkty mają teraz pole rowBackgroundColor"
else
    echo ""
    echo "❌ Migracja zakończona błędem!"
    echo "📝 Sprawdź logi powyżej dla szczegółów"
    exit 1
fi