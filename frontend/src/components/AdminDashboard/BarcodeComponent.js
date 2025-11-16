import Barcode from 'react-barcode';

function BarcodeComponent() {
    return <Barcode value="123456789" width={0.8} height={30} fontSize={10} />;
}

export default BarcodeComponent;
                bcid: 'code128',       // Barcode type
                text: '123456789',     // Text to encode
                scale: 3,              // Scale factor
                height: 10,            // Bar height
                includetext: true,     // Include human-readable text
                textxalign: 'center',  // Text alignment
            });
            return canvas.toDataURL(); // Return the barcode as a data URL
        } catch (error) {
            console.error('Error generating barcode:', error);
            return null;
        }
    };

    return <img src={generateBarcode()} alt="Barcode" />;
}

export default BarcodeComponent;
