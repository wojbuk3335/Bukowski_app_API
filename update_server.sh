#!/bin/bash

echo "🚀 Skrypt aktualizacji serwera produkcyjnego"
echo "=========================================="

# Przejście do katalogu aplikacji
cd /home/server846283/bukowskiapp/backend/backend/api/app

echo ""
echo "1️⃣ Aktualizacja kodu z GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Kod zaktualizowany pomyślnie!"
else
    echo "❌ Błąd podczas aktualizacji kodu!"
    exit 1
fi

echo ""
echo "2️⃣ Test połączenia z MongoDB..."
if [ -f "test_complete_login.js" ]; then
    node test_complete_login.js
    if [ $? -eq 0 ]; then
        echo "✅ Test MongoDB zakończony sukcesem!"
    else
        echo "❌ Problem z połączeniem MongoDB!"
        echo "🔧 Sprawdzenie .env..."
        if [ -f "../.env" ]; then
            echo "📁 .env istnieje:"
            head -2 ../.env | grep DATABASE
        else
            echo "❌ Brak pliku .env!"
        fi
    fi
else
    echo "❌ Brak pliku test_complete_login.js"
fi

echo ""
echo "3️⃣ Restart aplikacji (Phusion Passenger)..."
if [ ! -d "tmp" ]; then
    mkdir tmp
    echo "📁 Utworzono katalog tmp"
fi

touch tmp/restart.txt
echo "✅ Aplikacja zostanie zrestartowana!"

echo ""
echo "4️⃣ Test API przez curl..."
sleep 3  # Krótka pauza na restart

echo "🧪 Testowanie endpointu login..."
curl -X POST https://bukowskiapp.pl/api/user/login \
     -H "Content-Type: application/json" \
     -d '{"email":"w.bukowski1985@gmail.com","password":"Jezusmoimpanem30!"}' \
     -w "\n📊 Status HTTP: %{http_code}\n" \
     -s

echo ""
echo "🎉 Skrypt zakończony!"
echo "=================================="
echo "Jeśli wszystko przebiegło pomyślnie, aplikacja powinna teraz działać!"
echo "📧 Email: w.bukowski1985@gmail.com" 
echo "🔑 Hasło: Jezusmoimpanem30!"