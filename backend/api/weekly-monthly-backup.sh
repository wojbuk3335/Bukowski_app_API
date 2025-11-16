#!/bin/bash
# 🗃️ WEEKLY & MONTHLY BACKUPS

DB_NAME="bukowski_production"
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# 📅 TYGODNIOWY BACKUP (Niedziela)
if [ $DAY_OF_WEEK -eq 7 ]; then
    echo "📅 Creating weekly backup..."
    
    # Skopiuj najnowszy dzienny backup jako tygodniowy
    LATEST_DAILY=$(ls -1t $BACKUP_DIR/daily/db_backup_*.tar.gz | head -n1)
    
    if [ -n "$LATEST_DAILY" ]; then
        cp "$LATEST_DAILY" "$BACKUP_DIR/weekly/weekly_backup_$DATE.tar.gz"
        echo "✅ Weekly backup created"
        
        # Usuń stare tygodniowe backupy (12 tygodni = 3 miesiące)
        find $BACKUP_DIR/weekly -name "weekly_backup_*.tar.gz" -mtime +84 -delete
    fi
fi

# 📅 MIESIĘCZNY BACKUP (1 dzień miesiąca)
if [ $DAY_OF_MONTH -eq "01" ]; then
    echo "📅 Creating monthly backup..."
    
    # Skopiuj najnowszy dzienny backup jako miesięczny
    LATEST_DAILY=$(ls -1t $BACKUP_DIR/daily/db_backup_*.tar.gz | head -n1)
    
    if [ -n "$LATEST_DAILY" ]; then
        cp "$LATEST_DAILY" "$BACKUP_DIR/monthly/monthly_backup_$DATE.tar.gz"
        echo "✅ Monthly backup created"
        
        # Usuń stare miesięczne backupy (12 miesięcy = 1 rok)
        find $BACKUP_DIR/monthly -name "monthly_backup_*.tar.gz" -mtime +365 -delete
    fi
fi

# 📊 RAPORT
echo "📊 Backup summary:"
echo "   📁 Daily backups: $(ls -1 $BACKUP_DIR/daily/ 2>/dev/null | wc -l)"
echo "   📁 Weekly backups: $(ls -1 $BACKUP_DIR/weekly/ 2>/dev/null | wc -l)"
echo "   📁 Monthly backups: $(ls -1 $BACKUP_DIR/monthly/ 2>/dev/null | wc -l)"