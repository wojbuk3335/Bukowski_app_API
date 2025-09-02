// Mock for node-zpl module during tests
module.exports = {
    default: {
        // Mock functions for ZPL printing
        printBarcode: jest.fn(),
        generateZPL: jest.fn(() => '^XA^FO100,100^A0N,50,50^FDTest^FS^XZ')
    }
};
