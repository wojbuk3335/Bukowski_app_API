#!/bin/bash
# 🔐 AUTOMATYCZNE SSL CERTIFICATES

# 1. Zainstaluj Certbot
sudo apt update
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# 2. Utwórz symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# 3. Wygeneruj certificates
sudo certbot --nginx -d twoja-domena.com -d www.twoja-domena.com

# 4. Test automatycznego odnowienia
sudo certbot renew --dry-run

# 5. Automatyczne odnowienie (crontab)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# 6. Sprawdź SSL rating
echo "Sprawdź swój SSL na: https://www.ssllabs.com/ssltest/"