const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// 🔧 KONFIGURACJA
const BACKUP_CONFIG = {
    dbName: process.env.DB_NAME || 'bukowski_production',
    backupDir: '/backup/mongodb',
    retentionDays: 30,
    maxBackupSize: 1024 * 1024 * 1024, // 1GB
    emailAlerts: process.env.BACKUP_EMAIL || 'admin@bukowski.com'
};

class BackupManager {
    constructor() {
        this.backupDir = BACKUP_CONFIG.backupDir;
        this.dbName = BACKUP_CONFIG.dbName;
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = ['daily', 'weekly', 'monthly', 'emergency'];
        dirs.forEach(dir => {
            const fullPath = path.join(this.backupDir, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    async createBackup(type = 'daily') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `${type}_backup_${timestamp}`;
        const tempDir = path.join(this.backupDir, 'temp', backupName);
        const finalPath = path.join(this.backupDir, type, `${backupName}.tar.gz`);

        try {
            console.log(`🗃️ Starting ${type} backup...`);

            // 1. Sprawdź połączenie z bazą
            await this.checkDatabaseConnection();

            // 2. Sprawdź miejsce na dysku
            await this.checkDiskSpace();

            // 3. Wykonaj mongodump
            await this.executeMongoDump(tempDir);

            // 4. Kompresuj backup
            await this.compressBackup(tempDir, finalPath);

            // 5. Sprawdź integralność
            await this.verifyBackup(finalPath);

            // 6. Wyczyść temp
            await this.cleanup(tempDir);

            // 7. Usuń stare backupy
            await this.cleanOldBackups(type);

            // 8. Zapisz statystyki
            await this.logBackupStats(finalPath, type);

            console.log(`✅ ${type} backup completed successfully`);
            return { success: true, path: finalPath };

        } catch (error) {
            console.error(`❌ ${type} backup failed:`, error);
            await this.cleanup(tempDir);
            await this.sendAlert(`Backup ${type} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async checkDatabaseConnection() {
        return new Promise((resolve, reject) => {
            exec('mongosh --eval "db.runCommand(\'ping\')"', (error, stdout) => {
                if (error) {
                    reject(new Error('Database connection failed'));
                } else {
                    resolve();
                }
            });
        });
    }

    async checkDiskSpace() {
        return new Promise((resolve, reject) => {
            exec(`df -h ${this.backupDir}`, (error, stdout) => {
                if (error) {
                    reject(new Error('Cannot check disk space'));
                } else {
                    const lines = stdout.split('\n');
                    const diskInfo = lines[1].split(/\s+/);
                    const available = diskInfo[3];
                    console.log(`💾 Available disk space: ${available}`);
                    resolve();
                }
            });
        });
    }

    async executeMongoDump(tempDir) {
        return new Promise((resolve, reject) => {
            const command = `mongodump --db ${this.dbName} --out ${tempDir}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`MongoDump failed: ${stderr}`));
                } else {
                    console.log('✅ MongoDump completed');
                    resolve();
                }
            });
        });
    }

    async compressBackup(tempDir, finalPath) {
        return new Promise((resolve, reject) => {
            const command = `tar -czf ${finalPath} -C ${path.dirname(tempDir)} ${path.basename(tempDir)}`;
            
            exec(command, (error) => {
                if (error) {
                    reject(new Error(`Compression failed: ${error.message}`));
                } else {
                    const stats = fs.statSync(finalPath);
                    console.log(`📦 Backup compressed: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
                    resolve();
                }
            });
        });
    }

    async verifyBackup(filePath) {
        return new Promise((resolve, reject) => {
            exec(`tar -tzf ${filePath}`, (error) => {
                if (error) {
                    reject(new Error('Backup verification failed'));
                } else {
                    console.log('✅ Backup integrity verified');
                    resolve();
                }
            });
        });
    }

    async cleanup(tempDir) {
        if (fs.existsSync(tempDir)) {
            exec(`rm -rf ${tempDir}`, () => {
                console.log('🧹 Temporary files cleaned');
            });
        }
    }

    async cleanOldBackups(type) {
        const retentionDays = type === 'daily' ? 30 : type === 'weekly' ? 84 : 365;
        const typeDir = path.join(this.backupDir, type);
        
        exec(`find ${typeDir} -name "*.tar.gz" -mtime +${retentionDays} -delete`, 
            () => console.log(`🧹 Old ${type} backups cleaned`));
    }

    async logBackupStats(filePath, type) {
        const stats = fs.statSync(filePath);
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            size: stats.size,
            path: filePath,
            success: true
        };

        const logFile = path.join(this.backupDir, 'backup.log');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    async sendAlert(message) {
        // Implementacja powiadomień email/SMS
        console.log(`🚨 ALERT: ${message}`);
        // Możesz dodać SendGrid, Nodemailer, etc.
    }

    // 📅 HARMONOGRAM AUTOMATYCZNY
    scheduleBackups() {
        // Codziennie o 2:00
        cron.schedule('0 2 * * *', () => {
            this.createBackup('daily');
        });

        // Niedziela o 3:00 (tygodniowy)
        cron.schedule('0 3 * * 0', () => {
            this.createBackup('weekly');
        });

        // 1 dzień miesiąca o 4:00 (miesięczny)
        cron.schedule('0 4 1 * *', () => {
            this.createBackup('monthly');
        });

        console.log('📅 Backup scheduler started');
    }

    // 🚨 BACKUP AWARYJNY
    async emergencyBackup() {
        console.log('🚨 Emergency backup requested');
        return this.createBackup('emergency');
    }

    // 📊 STATYSTYKI BACKUPÓW
    async getBackupStats() {
        const stats = {};
        const types = ['daily', 'weekly', 'monthly', 'emergency'];

        for (const type of types) {
            const typeDir = path.join(this.backupDir, type);
            if (fs.existsSync(typeDir)) {
                const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.tar.gz'));
                const totalSize = files.reduce((sum, file) => {
                    const filePath = path.join(typeDir, file);
                    return sum + fs.statSync(filePath).size;
                }, 0);

                stats[type] = {
                    count: files.length,
                    totalSize: (totalSize / 1024 / 1024).toFixed(2) + 'MB',
                    latestBackup: files.length > 0 ? files.sort().pop() : 'None'
                };
            }
        }

        return stats;
    }
}

// 🚀 UŻYCIE
const backupManager = new BackupManager();

// Uruchom scheduler
if (process.env.NODE_ENV === 'production') {
    backupManager.scheduleBackups();
}

module.exports = backupManager;