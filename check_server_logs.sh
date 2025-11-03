#!/bin/bash

# 🔍 SKRYPT SPRAWDZANIA LOGÓW SERWERA
echo "🔍 SPRAWDZANIE LOGÓW SERWERA DLA PROBLEMÓW Z POŁĄCZENIEM..."

echo ""
echo "📋 1. SPRAWDZANIE LOGÓW APLIKACJI"
echo "=================================="

# Sprawdź logi aplikacji Node.js
if [ -f "/var/log/nodejs/app.log" ]; then
    echo "📄 Ostatnie wpisy z app.log:"
    tail -20 /var/log/nodejs/app.log
else
    echo "❌ Nie znaleziono app.log w /var/log/nodejs/"
fi

echo ""
echo "📋 2. SPRAWDZANIE LOGÓW NGINX (jeśli używasz)"
echo "============================================="

if [ -f "/var/log/nginx/error.log" ]; then
    echo "📄 Ostatnie błędy Nginx:"
    tail -20 /var/log/nginx/error.log | grep -i "refused\|denied\|blocked"
else
    echo "❌ Nie znaleziono logów Nginx"
fi

echo ""
echo "📋 3. SPRAWDZANIE LOGÓW FIREWALL (UFW)"
echo "======================================"

if command -v ufw &> /dev/null; then
    echo "🔥 Status UFW:"
    sudo ufw status verbose
    
    echo ""
    echo "📄 Ostatnie blokady UFW:"
    sudo grep "UFW BLOCK" /var/log/ufw.log | tail -10
else
    echo "❌ UFW nie jest zainstalowany"
fi

echo ""
echo "📋 4. SPRAWDZANIE LOGÓW SYSTEMOWYCH"
echo "==================================="

echo "📄 Ostatnie wpisy związane z połączeniami:"
sudo journalctl -u nginx -n 20 --no-pager | grep -i "error\|denied\|refused" || echo "Brak błędów w journalctl"

echo ""
echo "📋 5. SPRAWDZANIE AKTYWNYCH POŁĄCZEŃ"
echo "===================================="

echo "🌐 Aktywne połączenia na porcie 3000:"
sudo netstat -tulpn | grep :3000 || echo "Brak aktywnych połączeń na porcie 3000"

echo ""
echo "📋 6. SPRAWDZANIE PROCESÓW NODE.JS"
echo "=================================="

echo "⚙️ Uruchomione procesy Node.js:"
ps aux | grep node | grep -v grep || echo "Brak procesów Node.js"

echo ""
echo "📋 7. SPRAWDZANIE KONFIGURACJI PM2 (jeśli używasz)"
echo "=================================================="

if command -v pm2 &> /dev/null; then
    echo "📊 Status PM2:"
    pm2 status
    
    echo ""
    echo "📄 Logi PM2:"
    pm2 logs --lines 10
else
    echo "❌ PM2 nie jest zainstalowany"
fi

echo ""
echo "💡 INSTRUKCJE DALSZEGO DEBUGOWANIA:"
echo "=================================="
echo "1. Sprawdź logi aplikacji: tail -f /path/to/your/app/logs/app.log"
echo "2. Sprawdź logi błędów: tail -f /var/log/nodejs/error.log"
echo "3. Sprawdź połączenia: netstat -an | grep :3000"
echo "4. Sprawdź firewall: sudo ufw status verbose"
echo "5. Restart aplikacji: pm2 restart app-name"
