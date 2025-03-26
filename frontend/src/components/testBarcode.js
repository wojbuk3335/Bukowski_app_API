import React from 'react';
import Barcode from 'react-barcode';

const TestBarcode = () => {
    return (
        <div>
            <h1>Test Barcode</h1>
            <Barcode
                value="123456789012"
                width={1} // Adjust the width to make it smaller
                height={25} // Adjust the height to make it smaller
                background="#000000" // Set background to black
                lineColor="#FFFFFF" // Set line color to white
            />
        </div>
    );
};

export default TestBarcode;
