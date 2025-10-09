const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();
const config = require('../config');

// Import net module with error handling
let net;
try {
    net = require('net');
    console.log('✅ Module net successfully imported');
} catch (error) {
    console.error('❌ Failed to import net module:', error);
    throw error;
}

// Mock node-zpl for testing compatibility
let zpl;
try {
    // Try to require the mock first (for testing)
    if (process.env.NODE_ENV === 'test') {
        zpl = require('../../__mocks__/node-zpl').default;
    } else {
        // In production, dynamically import would go here
        zpl = { generateZPL: () => '^XA^FO100,100^A0N,50,50^FDTest^FS^XZ' };
    }
} catch (error) {
    console.warn('node-zpl not available, using fallback');
    zpl = { generateZPL: () => '^XA^FO100,100^A0N,50,50^FDTest^FS^XZ' };
}

class PrintController {
    async printBarcodes(req, res) {
        const { barcodes } = req.body;
        const printerAddress = '192.168.1.100'; // Replace with your printer's IP address
        const printerPort = 9100; // Default Zebra printer port

        if (!barcodes || barcodes.length === 0) {
            return res.status(400).send('No barcodes to print.');
        }

        let responseSent = false; // Flag to track if a response has been sent

        try {
            // 1. Convert barcodes to ZPL
            const zplCommands = barcodes.map(barcode => {
                // Example ZPL command (adjust as needed for your printer and barcode type)
                return `^XA^FO20,20^BCN,100,Y,N,N,A^FD${barcode}^FS^XZ`;
            }).join('');

            // 2. Send ZPL to the printer using TCP/IP socket
            const client = new net.Socket();

            client.connect(printerPort, printerAddress, () => {
                client.write(zplCommands);
                client.end();
            });

            client.on('data', (data) => {
            });

            client.on('close', () => {
                if (!responseSent) {
                    res.status(200).json({
                        message: 'Barcodes sent to printer.',
                        barcodes: barcodes,
                        zplCommands: zplCommands
                    });
                    responseSent = true;
                }
            });

            client.on('error', (err) => {
                console.error('Error connecting to printer:', err);
                if (!responseSent) {
                    res.status(500).send('Error connecting to printer: ' + err.message);
                    responseSent = true;
                }
            });

            // Handle timeout if no connection is established
            client.setTimeout(5000, () => {
                console.error('Connection timed out.');
                client.destroy(); // Close the socket
                if (!responseSent) {
                    res.status(500).send('Error connecting to printer: Connection timed out.');
                    responseSent = true;
                }
            });


        } catch (error) {
            console.error('Error printing barcodes:', error);
            if (!responseSent) {
                res.status(500).send('Error printing barcodes.');
                responseSent = true;
            }
        }
    }

    async printLabel(req, res) {
        console.log('🔄 printLabel method called');
        console.log('📋 Request body:', req.body);
        
        const { zplCode, printerIP = '192.168.1.100', itemName = 'Nieznany produkt' } = req.body;
        
        // Tryb debugowania - wyświetl ZPL zamiast drukowania
        const debugMode = process.env.ZEBRA_DEBUG === 'true';
        
        if (debugMode) {
            console.log('🐛 ZEBRA DEBUG MODE - ZPL Code:');
            console.log(zplCode);
            return res.json({
                success: true,
                message: 'DEBUG MODE: ZPL code logged to console',
                zplCode: zplCode,
                debugMode: true
            });
        }
        const printerPort = 9100; // Default Zebra printer port

        if (!zplCode) {
            console.log('❌ No ZPL code provided');
            return res.status(400).json({
                success: false,
                message: 'Brak kodu ZPL do drukowania.'
            });
        }

        let responseSent = false; // Flag to track if a response has been sent

        try {
            console.log(`🖨️ Wysyłanie etykiety ZPL do drukarki ${printerIP}:${printerPort}`);
            console.log(`📦 Produkt: ${itemName}`);
            console.log(`📄 Kod ZPL: ${zplCode.substring(0, 100)}...`);

            // Połącz z drukarką przez TCP/IP socket
            const client = new net.Socket();

            client.connect(printerPort, printerIP, () => {
                console.log(`✅ Połączono z drukarką ${printerIP}:${printerPort}`);
                client.write(zplCode);
                client.end();
            });

            client.on('data', (data) => {
                console.log('📥 Odpowiedź od drukarki:', data.toString());
            });

            client.on('close', () => {
                console.log('🔌 Połączenie z drukarką zamknięte');
                if (!responseSent) {
                    res.status(200).json({
                        success: true,
                        message: `Etykieta dla "${itemName}" została wysłana do drukarki.`,
                        printerIP: printerIP,
                        itemName: itemName,
                        timestamp: new Date().toISOString()
                    });
                    responseSent = true;
                }
            });

            client.on('error', (err) => {
                console.error('❌ Błąd połączenia z drukarką:', err.message);
                if (!responseSent) {
                    res.status(500).json({
                        success: false,
                        message: `Błąd połączenia z drukarką: ${err.message}`,
                        printerIP: printerIP,
                        error: err.code || 'UNKNOWN_ERROR'
                    });
                    responseSent = true;
                }
            });

            // Handle timeout if no connection is established
            client.setTimeout(10000, () => {
                console.error('⏰ Timeout połączenia z drukarką.');
                client.destroy(); // Close the socket
                if (!responseSent) {
                    res.status(500).json({
                        success: false,
                        message: 'Timeout połączenia z drukarką. Sprawdź czy drukarka jest włączona i dostępna w sieci.',
                        printerIP: printerIP,
                        error: 'CONNECTION_TIMEOUT'
                    });
                    responseSent = true;
                }
            });

        } catch (error) {
            console.error('💥 Błąd podczas drukowania etykiety:', error);
            if (!responseSent) {
                res.status(500).json({
                    success: false,
                    message: 'Błąd podczas drukowania etykiety: ' + error.message,
                    error: error.code || 'UNKNOWN_ERROR'
                });
                responseSent = true;
            }
        }
    }

    // Nowa metoda dla drukarki USB
    async printLabelUSB(req, res) {
        console.log('🔄 printLabelUSB method called');
        console.log('📋 Request body:', req.body);
        
        const { zplCode, itemName = 'Nieznany produkt' } = req.body;

        if (!zplCode) {
            console.log('❌ No ZPL code provided');
            return res.status(400).json({
                success: false,
                message: 'Brak kodu ZPL do drukowania'
            });
        }
        
        // DEBUG: Wyświetl kod ZPL
        console.log('🐛 DEBUG - ZPL Code to print:');
        console.log('==========================================');
        console.log(zplCode);
        console.log('==========================================');

        try {
            // Import fs and child_process modules
            const fs = require('fs');
            const { exec } = require('child_process');
            const path = require('path');
            const os = require('os');

            // Ścieżka do tymczasowego pliku ZPL
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `label_${Date.now()}.zpl`);

            console.log('📄 Zapisywanie ZPL do pliku:', tempFile);
            
            // Zapisz ZPL do pliku tymczasowego
            fs.writeFileSync(tempFile, zplCode);

            // Komendy dla różnych systemów operacyjnych
            let printCommand;
            const platform = os.platform();
            
            if (platform === 'win32') {
                // Windows - spróbuj znaleźć prawidłowy port drukarki
                const { exec: execSync } = require('child_process');
                
                // Lista portów do przetestowania - dodany PRN: który często działa dla USB
                const portsToTry = [
                    'PRN:',        // Domyślna drukarka Windows
                    'LPT1:',
                    'COM1:',
                    'COM2:',
                    'COM3:',
                    'COM4:',
                    'USB001:',
                    'USB002:',
                    'USB003:'
                ];
                
                let responseSent = false;
                let portIndex = 0;
                
                const tryNextPort = () => {
                    if (portIndex >= portsToTry.length || responseSent) {
                        if (!responseSent) {
                            // Wyczyść plik tymczasowy
                            try { fs.unlinkSync(tempFile); } catch (e) {}
                            
                            // Jeśli porty nie działają, sprawdź wszystkie drukarki (nie tylko Zebra)
                            exec('wmic printer get name /format:list | findstr "Name="', (error, stdout, stderr) => {
                                console.log('🖨️ Dostępne drukarki w systemie:', stdout);
                                if (!error && stdout && stdout.includes('Zebra')) {
                                    // Znaleziono drukarkę Zebra, spróbuj drukować bezpośrednio
                                    const printerLines = stdout.split('\n');
                                    const zebraPrinter = printerLines.find(line => 
                                        line.includes('Name=') && line.toLowerCase().includes('zebra')
                                    );
                                    
                                    if (zebraPrinter) {
                                        const printerName = zebraPrinter.replace('Name=', '').trim();
                                        const printCommand = `copy "${tempFile}" "${printerName}" /B`;
                                        
                                        console.log(`🦓 Próba drukowania przez nazwę drukarki: ${printerName}`);
                                        
                                        exec(printCommand, (error3, stdout3, stderr3) => {
                                            try { fs.unlinkSync(tempFile); } catch (e) {}
                                            
                                            if (!error3 && !responseSent) {
                                                res.json({
                                                    success: true,
                                                    message: `Etykieta "${itemName}" została wysłana do drukarki`,
                                                    method: 'printer-name',
                                                    printerName: printerName
                                                });
                                                responseSent = true;
                                            } else if (!responseSent) {
                                                res.status(500).json({
                                                    success: false,
                                                    message: `Nie udało się wydrukować przez żaden port ani nazwę drukarki. Błąd: ${error3?.message || 'Nieznany błąd'}`,
                                                    testedPorts: portsToTry,
                                                    foundPrinter: printerName,
                                                    suggestion: 'Sprawdź czy drukarka Zebra jest włączona i gotowa do drukowania.'
                                                });
                                                responseSent = true;
                                            }
                                        });
                                        return;
                                    }
                                }
                                
                                // Nie znaleziono drukarki Zebra lub błąd
                                if (!responseSent) {
                                    try { fs.unlinkSync(tempFile); } catch (e) {}
                                    
                                    res.status(500).json({
                                        success: false,
                                        message: `Nie znaleziono drukarki Zebra w systemie. Sprawdź czy drukarka jest podłączona i zainstalowana.`,
                                        testedPorts: portsToTry,
                                        suggestion: 'Zainstaluj sterowniki drukarki Zebra i upewnij się że drukarka jest widoczna w Panelu Sterowania > Drukarki.'
                                    });
                                    responseSent = true;
                                }
                            });
                        }
                        return;
                    }
                    
                    const currentPort = portsToTry[portIndex];
                    const currentCommand = `copy "${tempFile}" ${currentPort} /B`;
                    
                    console.log(`🔍 Próba portu ${portIndex + 1}/${portsToTry.length}: ${currentPort}`);
                    
                    exec(currentCommand, (error, stdout, stderr) => {
                        if (!error && !responseSent) {
                            // Sukces!
                            try { fs.unlinkSync(tempFile); } catch (e) {}
                            
                            console.log(`✅ Etykieta wysłana przez port: ${currentPort}`);
                            
                            // Dodatkowo spróbuj też przez domyślną drukarkę
                            exec('wmic printer where default=true get name /format:list | findstr "Name="', (err, out) => {
                                if (!err && out) {
                                    console.log(`🖨️ Domyślna drukarka: ${out.trim()}`);
                                }
                            });
                            
                            res.json({
                                success: true,
                                message: `Etykieta "${itemName}" została wysłana do drukarki przez ${currentPort}. Sprawdź czy drukarka fizycznie drukuje.`,
                                method: currentPort,
                                workingPort: currentPort,
                                zplSent: true,
                                instruction: 'Jeśli drukarka nie drukuje, sprawdź: 1) Status drukarki, 2) Papier/taśmę, 3) Czy nie jest wstrzymana'
                            });
                            responseSent = true;
                        } else {
                            // Błąd, spróbuj następny port
                            console.log(`❌ Port ${currentPort} nie działa:`, error?.message?.substring(0, 100));
                            portIndex++;
                            setTimeout(tryNextPort, 100); // Krótka pauza między próbami
                        }
                    });
                };
                
                // Rozpocznij testowanie portów
                tryNextPort();
                
            } else if (platform === 'linux' || platform === 'darwin') {
                // Linux/Mac - użyj lp command
                printCommand = `lp -d zebra "${tempFile}"`;
                
                console.log('🖨️ Próba drukowania na Linux/Mac:', printCommand);
                
                exec(printCommand, (error, stdout, stderr) => {
                    // Wyczyść plik tymczasowy
                    try { fs.unlinkSync(tempFile); } catch (e) {}
                    
                    if (error) {
                        console.error('❌ Błąd drukowania:', error);
                        return res.status(500).json({
                            success: false,
                            message: `Błąd drukowania: ${error.message}. Sprawdź czy drukarka jest skonfigurowana jako 'zebra' w systemie.`,
                            error: error.code
                        });
                    }
                    
                    console.log('✅ Etykieta wysłana do drukarki');
                    res.json({
                        success: true,
                        message: `Etykieta "${itemName}" została wysłana do drukarki`,
                        method: 'lp'
                    });
                });
            } else {
                // Nieobsługiwany system
                try { fs.unlinkSync(tempFile); } catch (e) {}
                return res.status(500).json({
                    success: false,
                    message: `Nieobsługiwany system operacyjny: ${platform}`
                });
            }

        } catch (error) {
            console.error('💥 Błąd podczas drukowania etykiety USB:', error);
            res.status(500).json({
                success: false,
                message: 'Błąd podczas drukowania etykiety: ' + error.message,
                error: error.code || 'UNKNOWN_ERROR'
            });
        }
    }
}

module.exports = new PrintController();