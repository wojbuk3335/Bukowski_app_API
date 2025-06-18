const State = require('../db/models/state'); // Adjusted to use the correct model
const mongoose = require('mongoose');
const config = require('../config');
const Goods = require('../db/models/goods'); // Import Goods model
const Size = require('../db/models/size');   // Import Size model

// Corrected checksum calculation function
const calculateChecksum = (barcode) => {
    const digits = barcode.split('').map(Number);
    const sum = digits.reduce((acc, digit, index) => {
        return acc + (index % 2 === 0 ? digit : digit * 3); // Correct weights: 1 for odd, 3 for even
    }, 0);
    const checksum = (10 - (sum % 10)) % 10; // Ensure checksum is between 0-9
    return checksum;
};

class StatesController {
    // Get all states
    async getAllStates(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName price priceExceptions discount_price') // Include discount_price
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol');

            const sanitizedStates = states.map(state => ({
                id: state._id,
                fullName: state.fullName ? state.fullName.fullName : 'Nieznany produkt', // Handle null fullName
                date: state.date,
                plec: state.plec,
                size: state.size ? state.size.Roz_Opis : 'Nieznany rozmiar', // Handle null size
                barcode: state.barcode,
                symbol: state.sellingPoint ? state.sellingPoint.symbol : 'Nieznany punkt sprzedaży', // Handle null sellingPoint
                price: state.price, // Use the saved price
                discount_price: state.discount_price || null, // Include discount_price if available
            }));

            res.status(200).json(sanitizedStates);
        } catch (error) {
            console.error('Error fetching states:', error); // Log the error for debugging
            res.status(500).json({ message: 'Failed to fetch states', error: error.message });
        }
    }

    // Create a new state
    async createState(req, res, next) {
        try {
            // Find the ObjectId for fullName in Goods
            const goods = await Goods.findOne({ fullName: req.body.fullName }).populate('priceExceptions.size');
            if (!goods) {
                return res.status(404).send('Goods not found');
            }

            const plec = goods.Plec; // Assuming `Plec` is the field in Goods
            if (!plec) {
                return res.status(404).send('Plec not found');
            }

            // Find the ObjectId for size in Size
            const size = await Size.findOne({ Roz_Opis: req.body.size });
            if (!size) {
                return res.status(404).send('Size not found');
            }

            // Find the ObjectId for sellingPoint in User
            const user = await mongoose.models.User.findOne({ symbol: req.body.sellingPoint });
            if (!user) {
                return res.status(404).send('Selling point not found');
            }

            // Extract the code from Goods and update it with Roz_Kod
            let barcode = goods.code; // Assuming `code` is the field in Goods
            const rozKod = size.Roz_Kod; // Assuming `Roz_Kod` is the field in Size
            barcode = barcode.substring(0, 5) + rozKod + barcode.substring(7, 11);

            // Corrected checksum calculation
            const checksum = calculateChecksum(barcode);
            barcode = barcode.substring(0, 12) + checksum; // Append checksum to barcode

            // Calculate the price
            const basePrice = goods.price || 0;
            const discountPrice = goods.discount_price || 0;
            const exception = goods.priceExceptions.find(
                (ex) => ex.size && ex.size._id.toString() === size._id.toString()
            );
            const price = exception ? exception.value : basePrice;

            // Save both price and discount_price
            const state = new State({
                _id: new mongoose.Types.ObjectId(),
                fullName: goods._id,
                date: req.body.date,
                plec: goods.Plec,
                size: size._id,
                barcode,
                sellingPoint: user._id,
                price: price,
                discount_price: !exception && discountPrice && Number(discountPrice) !== 0 ? discountPrice : undefined
            });

            const newState = await state.save();
            res.status(201).json(newState);
        } catch (error) {
            console.error('Error creating state:', error); // Log the error
            res.status(500).json({ message: 'Failed to create state', error: error.message });
        }
    }

    // Get a state by ID
    async getStateById(req, res, next) {
        try {
            const state = await State.findById(req.params.id);
            if (!state) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json(state);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Update a state by ID
    async updateStateById(req, res, next) {
        try {
            const { id } = req.params;
            const { fullName, date, size, sellingPoint } = req.body;

            // Znajdź obiekt Goods na podstawie pełnej nazwy
            const goods = fullName ? await Goods.findOne({ fullName }) : null;
            if (fullName && !goods) {
                return res.status(404).send('Goods not found');
            }

            // Znajdź obiekt Size na podstawie Roz_Opis
            const sizeObj = size ? await Size.findOne({ Roz_Opis: size }) : null;
            if (size && !sizeObj) {
                return res.status(404).send('Size not found');
            }

            // Znajdź użytkownika na podstawie symbolu
            const user = sellingPoint ? await mongoose.models.User.findOne({ symbol: sellingPoint }) : null;
            if (sellingPoint && !user) {
                return res.status(404).send('Selling point not found');
            }

            // Pobierz aktualny stan, aby określić wartości "from" i "to"
            const currentState = await State.findById(id).populate('sellingPoint');
            if (!currentState) {
                return res.status(404).json({ message: 'State not found' });
            }

            let from = currentState.sellingPoint?.symbol || '-'; // Domyślna wartość "from"
            let to = sellingPoint || '-'; // Domyślna wartość "to"

            // Ustaw "from" i "to" na "-" tylko wtedy, gdy aktualizowany jest rozmiar
            if (size && !fullName && !sellingPoint) {
                from = '-';
                to = '-';
            }

            // Zaktualizuj kod kreskowy, jeśli podano fullName i size
            let barcode = currentState.barcode;
            if (goods && sizeObj) {
                const rozKod = sizeObj.Roz_Kod; // Zakładamy, że `Roz_Kod` jest polem w Size
                barcode = goods.code.substring(0, 5) + rozKod + goods.code.substring(7, 11);
                const checksum = calculateChecksum(barcode);
                barcode = barcode.substring(0, 12) + checksum;
            }

            // Zaktualizuj stan
            const updatedState = await State.findByIdAndUpdate(
                id,
                {
                    fullName: goods ? goods._id : currentState.fullName,
                    date: date || currentState.date,
                    size: sizeObj ? sizeObj._id : currentState.size,
                    barcode,
                    sellingPoint: user ? user._id : currentState.sellingPoint,
                    from, // Ustaw "from"
                    to    // Ustaw "to"
                },
                { new: true } // Zwróć zaktualizowany dokument
            );

            if (!updatedState) {
                return res.status(404).json({ message: 'State not found' });
            }

            res.status(200).json(updatedState);
        } catch (error) {
            console.error('Error updating state:', error); // Loguj błąd dla debugowania
            res.status(400).json({ error: error.message });
        }
    }

    // Delete a state by ID
    async deleteState(req, res, next) {
        try {
            const { id } = req.params;

            // Check if the ID is valid
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid state ID' });
            }

            const deletedState = await State.findByIdAndDelete(id);
            if (!deletedState) {
                return res.status(404).json({ message: 'State not found' });
            }
            res.status(200).json({ message: 'State deleted successfully' });
        } catch (error) {
            console.error('Error deleting state:', error); // Log the error for debugging
            res.status(500).json({ message: 'Failed to delete state', error: error.message });
        }
    }

    // Get states formatted for a frontend table
    async getStatesForTable(req, res, next) {
        try {
            const states = await State.find()
                .populate('fullName', 'fullName') // Populate fullName with its value from Goods
                .populate('size', 'Roz_Opis')
                .populate('sellingPoint', 'symbol'); // Populate symbol instead of sellingPoint

            // Format the data for the table
            const tableData = states.map(state => ({
                id: state._id,
                fullName: state.fullName ? state.fullName.fullName : 'Nieznany produkt', // Handle null fullName
                date: state.date,
                size: state.size ? state.size.Roz_Opis : 'Nieznany rozmiar',         // Handle null size
                symbol: state.sellingPoint ? state.sellingPoint.symbol : 'Nieznany punkt sprzedaży' // Handle null sellingPoint
            }));

            res.status(200).json(tableData);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new StatesController();