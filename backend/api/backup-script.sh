#!/bin/bash
# 🔄 AUTOMATYCZNY BACKUP SCRIPT

# 📅 Konfiguracja
BACKUP_DIR="/backup/bukowski-app"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="bukowski_production"
RETENTION_DAYS=30

# 📁 Utwórz folder backup
mkdir -p $BACKUP_DIR

# 🗃️ BACKUP MONGODB
echo "🗃️ Starting MongoDB backup..."
mongodump --db $DB_NAME --out $BACKUP_DIR/mongo_$DATE
tar -czf $BACKUP_DIR/mongo_$DATE.tar.gz -C $BACKUP_DIR mongo_$DATE
rm -rf $BACKUP_DIR/mongo_$DATE

# 📁 BACKUP APLIKACJI
echo "📁 Starting application backup..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='.git' \
    /var/www/bukowski-app/

# 🔐 BACKUP KONFIGURACJI
echo "🔐 Starting config backup..."
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /etc/nginx/sites-available/ \
    /etc/ssl/ \
    /etc/fail2ban/jail.local

# 📝 BACKUP LOGÓW
echo "📝 Starting logs backup..."
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/www/bukowski-app/logs/

# 🧹 CLEANUP STARYCH BACKUPÓW
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 📊 RAPORT
echo "✅ Backup completed:"
echo "📦 Files created:"
ls -lh $BACKUP_DIR/*$DATE*

# 📧 NOTIFICATION (opcjonalnie)
echo "Backup completed at $(date)" | mail -s "Bukowski App Backup Report" admin@twoja-domena.com