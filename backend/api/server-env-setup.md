# 🔒 INSTRUKCJA: Utwórz plik .env na serwerze

# POŁĄCZ SIĘ Z SERWEREM (SSH)
ssh user@twoj-serwer.com

# PRZEJDŹ DO KATALOGU APLIKACJI
cd /var/www/twoja-aplikacja  # lub gdzie masz aplikację

# UTWÓRZ PLIK .env
nano .env

# WKLEJ ZAWARTOŚĆ (ZMIEŃ DANE NA PRODUKCYJNE):
PORT=3000
DATABASE=mongodb+srv://wbukowski1985:3VX4byVnTO2CFRPc@bukowskiapp.emdzg.mongodb.net/BukowskiApp?retryWrites=true&w=majority&appName=BukowskiApp
JWT_SECRET=RVGGefx+baG+xXNGbU7xLwAxkJTWQR7nmIIIIpqZNcxbGahOGMalx742wIyieMR9Vdoo1QrXxZLGR51N+UWFhA==
DOMAIN=https://twoja-domena.com
NODE_ENV=production

# ZAPISZ PLIK (Ctrl+X, Y, Enter w nano)

# USTAW ODPOWIEDNIE UPRAWNIENIA
chmod 600 .env
chown www-data:www-data .env  # lub właściciel aplikacji

# ZRESTARTUJ APLIKACJĘ
passenger-config restart-app /var/www/twoja-aplikacja