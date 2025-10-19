#!/bin/bash
# 🗃️ AUTOMATYCZNY BACKUP MONGODB - CODZIENNIE

# 📋 KONFIGURACJA
DB_NAME="bukowski_production"
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

# 📁 Utwórz strukturę folderów
mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly
mkdir -p $BACKUP_DIR/monthly

# 🗃️ BACKUP MONGODB
echo "🗃️ Starting MongoDB backup - $(date)"

# Sprawdź czy MongoDB działa
if ! mongosh --eval "db.runCommand('ping').ok" > /dev/null 2>&1; then
    echo "❌ ERROR: MongoDB is not running!"
    exit 1
fi

# Wykonaj backup
mongodump --db $DB_NAME --out $BACKUP_DIR/temp_$DATE

if [ $? -eq 0 ]; then
    echo "✅ MongoDB dump successful"
    
    # Kompresuj backup
    tar -czf $BACKUP_DIR/daily/db_backup_$DATE.tar.gz -C $BACKUP_DIR temp_$DATE
    
    # Usuń temporary folder
    rm -rf $BACKUP_DIR/temp_$DATE
    
    # Sprawdź rozmiar
    BACKUP_SIZE=$(du -sh $BACKUP_DIR/daily/db_backup_$DATE.tar.gz | cut -f1)
    echo "📦 Backup size: $BACKUP_SIZE"
    
    # Test backup integrity
    if tar -tzf $BACKUP_DIR/daily/db_backup_$DATE.tar.gz > /dev/null 2>&1; then
        echo "✅ Backup integrity test passed"
    else
        echo "❌ ERROR: Backup is corrupted!"
        exit 1
    fi
    
else
    echo "❌ ERROR: MongoDB dump failed!"
    exit 1
fi

# 🧹 CLEANUP STARYCH BACKUPÓW
echo "🧹 Cleaning old daily backups..."
find $BACKUP_DIR/daily -name "db_backup_*.tar.gz" -mtime +$KEEP_DAYS -delete

# 📊 STATYSTYKI
TOTAL_BACKUPS=$(ls -1 $BACKUP_DIR/daily/db_backup_*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh $BACKUP_DIR/daily | cut -f1)

echo "📊 Backup statistics:"
echo "   📁 Total backups: $TOTAL_BACKUPS"
echo "   💾 Total size: $TOTAL_SIZE"
echo "   📅 Date: $(date)"

# 📧 LOG SUCCESS
echo "$(date): Daily backup completed successfully - Size: $BACKUP_SIZE" >> $BACKUP_DIR/backup.log