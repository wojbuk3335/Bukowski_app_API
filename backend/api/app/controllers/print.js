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
}

module.exports = new PrintController();