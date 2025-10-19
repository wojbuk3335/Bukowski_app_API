# 🔥 KONFIGURACJA FIREWALL NA SERWERZE
# Ubuntu/Debian przykład

# 1. Włącz UFW firewall
sudo ufw enable

# 2. Domyślnie blokuj wszystko
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 3. Otwórz tylko potrzebne porty
sudo ufw allow 22/tcp      # SSH (zmień port!)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Twoja aplikacja (tylko tymczasowo)

# 4. Blokuj niepotrzebne porty
sudo ufw deny 3306        # MySQL
sudo ufw deny 5432        # PostgreSQL
sudo ufw deny 27017       # MongoDB

# 5. Sprawdź status
sudo ufw status verbose

# 6. Dodatkowe zabezpieczenia
sudo ufw limit ssh        # Rate limiting dla SSH
sudo fail2ban-client status # Sprawdź fail2ban