import React from 'react';

// Mock komponentu react-barcode aby uniknąć błędów canvas w środowisku testowym
const Barcode = ({ value, ...props }) => (
  <div data-testid="barcode-mock" data-value={value} {...props}>
    Barcode: {value}
  </div>
);

export default Barcode;
