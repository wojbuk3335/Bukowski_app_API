const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();
const config = require('../config');
const net = require('net');
let zpl; // Declare zpl outside the async function

async function loadZpl() {
    zpl = await import('node-zpl');
    zpl = zpl.default;
}
loadZpl();

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

            console.log('Generated ZPL Commands:', zplCommands); // Log the ZPL commands

            // 2. Send ZPL to the printer using TCP/IP socket
            const client = new net.Socket();

            client.connect(printerPort, printerAddress, () => {
                console.log('Connected to printer.');
                client.write(zplCommands);
                client.end();
            });

            client.on('data', (data) => {
                console.log('Received: ' + data);
            });

            client.on('close', () => {
                console.log('Connection closed.');
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
}

module.exports = new PrintController();