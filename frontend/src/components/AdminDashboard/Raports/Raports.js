import React from 'react';
import ZebraBrowserPrintWrapper from 'zebra-browser-print-wrapper';

const Raports = () => {
    const checkAvailablePrinters = async () => {
        try {
            const browserPrint = new ZebraBrowserPrintWrapper();

            // Ensure the library is initialized correctly
            if (!browserPrint) {
                console.error("Failed to initialize ZebraBrowserPrintWrapper.");
                return;
            }

            const printers = await browserPrint.getAvailablePrinters();
            if (printers.length > 0) {
                console.log("Available Printers:", printers);
            } else {
                console.log("No printers available.");
            }
        } catch (error) {
            console.error("Error checking printers:", error.message || error);
            console.error(
                "Ensure Zebra Browser Print is installed, running, and accessible. " +
                "Check if the service is reachable at http://localhost:9100."
            );
        }
    };

    return (
        <div>
            <h1>Raports</h1>
            <button onClick={checkAvailablePrinters}>Check Available Printers</button>
        </div>
    );
};

export default Raports;