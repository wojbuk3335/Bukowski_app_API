const History = require('../db/models/history');
const User = require('../db/models/user');
const State = require('../db/models/state');
const Goods = require('../db/models/goods');
const Stock = require('../db/models/stock');
const Color = require('../db/models/color');
const Category = require('../db/models/category');
const Size = require('../db/models/size');

// Helper function to get symbol by sellingPoint
const getSymbolBySellingPoint = async (sellingPoint) => {
    try {
        if (!sellingPoint || sellingPoint === '-' || sellingPoint === 'Manual') {
            return sellingPoint;
        }
        
        const user = await User.findOne({ sellingPoint: sellingPoint }).lean();
        
        if (user && user.symbol) {
            return user.symbol;
        } else {
            return sellingPoint;
        }
    } catch (error) {
        console.error(`Error finding user by sellingPoint "${sellingPoint}":`, error);
        return sellingPoint; // Return original value on error
    }
};

const historyLogger = (collectionName) => {
    return async (req, res, next) => {
        const userloggedinId = req.user ? req.user._id : null;
        let historyEntry;

        const mapOperationToPolish = (method, collection, operationType) => {
            if (method === 'PUT' || method === 'PATCH') return 'Aktualizacja';
            if (method === 'DELETE') {
                if (collection === 'states') {
                    // Handle different operation types for states
                    if (operationType === 'delete') return 'Usunięto ze stanu';
                    if (operationType === 'transfer-same') return 'Przeniesiono w ramach stanu';
                    if (operationType === 'transfer-from-magazyn') return 'Przesunięto ze stanu';
                    return 'Przesunięto ze stanu'; // Default
                }
                return 'Usunięcie';
            }
            if (method === 'POST') {
                if (collection === 'states') return 'Dodano do stanu'; // Special case for states
                if (collection === 'goods') return 'Dodano produkt'; // Special case for goods
                return 'Utworzenie';
            }
            return method;
        };

        const mapCollectionToPolish = (collection) => {
            if (collection === 'stock') return 'Asortyment';
            if (collection === 'goods') return 'Produkty';
            if (collection === 'sizes') return 'Rozmiary';
            if (collection === 'state') return 'Stan';
            if (collection === 'color') return 'Kolory';
            if (collection === 'category') return 'Kategoria';
            if (collection === 'states') return 'Stan'; // Correct translation for "states"
            if (collection === 'users') return 'Użytkownicy'; // Replace "Users" with "Użytkownicy"
            if (collection === 'colors') return 'Kolory'; // Translate "colors" to "Kolory"
            if (collection === 'bagsCategory') return 'Kategorie torebek'; // Add bags category mapping
            if (collection === 'wallets') return 'Portfele'; // Add wallets mapping
            if (collection === 'bags') return 'Torebki'; // Add bags mapping
            return collection;
        };

        const operation = mapOperationToPolish(req.method, collectionName, req.headers['operation-type']);
        const collectionNamePolish = mapCollectionToPolish(collectionName);

        if (collectionName === 'stock') {
            let details = '';
            let product = 'Nieznany produkt'; // Default value for product

            if (operation === 'Aktualizacja') {
                try {
                    const stockId = req.params.stockId;
                    const updatedStock = req.body;
                    const oldStock = await Stock.findById(stockId).lean();
                    const oldDescription = oldStock.Tow_Opis || '-'; // Replace empty value with "-"
                    const newDescription = updatedStock.Tow_Opis || '-'; // Replace empty value with "-"
                    product = newDescription; // Use updated Tow_Opis for product
                    details = `Zaaktualizowano asortyment z ${oldDescription} na ${newDescription}`;
                } catch (error) {
                    console.error('Aktualizacja asortymentu: Error logging update stock:', error);
                    details = `Aktualizacja asortymentu: Błąd podczas aktualizowania asortymentu.`;
                }
            } else if (operation === 'Utworzenie') {
                try {
                    const newStock = req.body;
                    product = newStock.Tow_Opis || 'Nieznany produkt'; // Use Tow_Opis for the new product
                    details = `Dodano nowy produkt: ${product}`;
                } catch (error) {
                    console.error('Utworzenie asortymentu: Error logging new stock:', error);
                    details = `Utworzenie asortymentu: Błąd podczas dodawania nowego produktu.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięcie asortymentu: Usunięto całą tabelę asortymentu.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Include product field
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'goods') {
            console.log('Processing goods history - Method:', req.method, 'Operation:', operation);
            let details = '';
            let from = '-'; // Explicitly set "from" to "-"
            let to = '-';   // Explicitly set "to" to "-"
            let product = 'Nieznany produkt'; // Default value for product

            if (operation === 'Dodano produkt') {
                try {
                    const newGood = req.body;
                    console.log('Creating goods history for new product:', newGood.fullName);
                    product = newGood.fullName || 'Nieznany produkt'; // Set product to fullName or default value
                    details = newGood.fullName || 'Unknown'; // Ensure details is explicitly set to fullName
                } catch (error) {
                    console.error('Error logging create good:', error);
                    details = `Błąd podczas dodawania produktu.`;
                }
            }

            if (operation === 'Aktualizacja') {
                try {
                    const goodId = req.params.goodId;
                    const oldGood = await Goods.findById(goodId)
                        .populate('stock')
                        .populate('color')
                        .populate('subcategory')
                        .lean();
                    const updatedGood = req.body;

                    if (!oldGood) {
                        details = `Nie znaleziono produktu o ID: ${goodId}`;
                    } else {
                        product = oldGood.fullName || 'Nieznany produkt'; // Set product to oldGood's fullName
                        let changes = [];

                        details = ``;

                        // Compare stock (for regular products) or bagProduct (for bags)
                        if (oldGood.category === 'Torebki') {
                            // Handle bags category
                            if (updatedGood.bagProduct && oldGood.bagProduct !== updatedGood.bagProduct) {
                                changes.push(`Torebka została zmieniona z ${oldGood.bagProduct} na ${updatedGood.bagProduct}`);
                            }
                            if (updatedGood.bagsCategoryId && oldGood.bagsCategoryId !== updatedGood.bagsCategoryId) {
                                changes.push(`Podkategoria torebki została zmieniona`);
                            }
                        } else {
                            // Handle regular products
                            if (updatedGood.stock && oldGood.stock && oldGood.stock._id.toString() !== updatedGood.stock) {
                                try {
                                    const newStock = await Stock.findById(updatedGood.stock);
                                    if (newStock) {
                                        changes.push(`Zmiana z  ${oldGood.stock.Tow_Opis} na ${newStock.Tow_Opis}`);
                                    } else {
                                        changes.push(`Zmiana z  ${oldGood.stock.Tow_Opis} na nieznany produkt`);
                                    }
                                } catch (error) {
                                    console.error('Error fetching newStock:', error);
                                    changes.push(`Błąd podczas zmiany Produktu`);
                                }
                            }
                        }

                        // Compare color
                        if (updatedGood.color && oldGood.color._id.toString() !== updatedGood.color) {
                            try {
                                const newColor = await Color.findById(updatedGood.color);
                                if (newColor) {
                                    changes.push(`Kolor został zmieniony z ${oldGood.color.Kol_Opis} na ${newColor.Kol_Opis}`);
                                } else {
                                    changes.push(`Kolor został zmieniony z ${oldGood.color.Kol_Opis} na nieznany kolor`);
                                }
                            } catch (error) {
                                console.error('Error fetching newColor:', error);
                                changes.push(`Błąd podczas zmiany Koloru`);
                            }
                        }

                        // Compare subcategory (only for non-bags products)
                        if (oldGood.category !== 'Torebki' && updatedGood.subcategory && oldGood.subcategory && oldGood.subcategory._id.toString() !== updatedGood.subcategory) {
                            try {
                                const newSubcategory = await Category.findById(updatedGood.subcategory);
                                if (newSubcategory) {
                                    changes.push(`Podkategoria została zmieniona z ${oldGood.subcategory.Kat_1_Opis_1} na ${newSubcategory.Kat_1_Opis_1}`);
                                } else {
                                    changes.push(`Podkategoria została zmieniona z ${oldGood.subcategory.Kat_1_Opis_1} na nieznaną podkategorię`);
                                }
                            } catch (error) {
                                console.error('Error fetching newSubcategory:', error);
                                changes.push(`Błąd podczas zmiany Podkategorii`);
                            }
                        }

                        // Compare fullName
                        if (updatedGood.fullName && oldGood.fullName !== updatedGood.fullName) {
                            changes.push(`Nazwa została zmieniona z ${oldGood.fullName} na ${updatedGood.fullName}`);
                        }

                        if (req.file && req.file.filename) {
                            changes.push(`Zdjęcie zostało zmienione`);
                        }

                        // Compare other fields
                        if (updatedGood.price && oldGood.price !== Number(updatedGood.price)) {
                            changes.push(`Cena została zmieniona z ${oldGood.price} na ${updatedGood.price}`);
                        }
                        if (updatedGood.discount_price && oldGood.discount_price !== Number(updatedGood.discount_price)) {
                            changes.push(`Cena promocyjna została zmieniona z ${oldGood.discount_price} na ${updatedGood.discount_price}`);
                        }

                        if (changes.length > 0) {
                            details += changes.join(', ');
                        } else {
                            details += "Zaktualizowano produkt - brak zmian";
                        }
                    }
                } catch (error) {
                    console.error('Error fetching good:', error);
                    details = `Błąd podczas aktualizowania produktu o ID: ${req.params.goodId}`;
                }
            }

            if (operation === 'Usunięcie') {
                try {
                    const goodId = req.params.goodId;
                    const oldGood = await Goods.findById(goodId).lean();

                    if (!oldGood) {
                        details = `Nie znaleziono produktu o ID: ${goodId}`;
                    } else {
                        product = oldGood.fullName || 'Nieznany produkt'; // Set product to oldGood's fullName
                        details = `Produkt o nazwie ${oldGood.fullName} został usunięty.`;
                    }
                } catch (error) {
                    console.error('Error logging delete good:', error);
                    details = `Błąd podczas usuwania produktu o ID: ${req.params.goodId}`;
                }
            }

            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Include product field
                details: details, // Ensure details is explicitly set
                userloggedinId: userloggedinId,
                from: from, // Ensure "from" is "-"
                to: to     // Ensure "to" is "-"
            });
            console.log('Created goods history entry:', {
                collectionName: collectionNamePolish,
                operation,
                product,
                details,
                userloggedinId
            });
        }

        if (collectionName === 'sizes') {
            let details = '';
            let product = '-'; // Always set product to "-" for sizes

            if (operation === 'Aktualizacja') {
                try {
                    const sizeId = req.params.sizeId;
                    const updatedSize = req.body;
                    const oldSize = await Size.findById(sizeId).lean();
                    const oldDescription = oldSize.Roz_Opis || '-'; // Replace empty value with "-"
                    const newDescription = updatedSize.Roz_Opis || '-'; // Replace empty value with "-"
                    details = `Zaaktualizowano rozmiar z ${oldDescription} na ${newDescription}`;
                } catch (error) {
                    console.error('Aktualizacja rozmiaru: Error logging update size:', error);
                    details = `Aktualizacja rozmiaru: Błąd podczas aktualizowania rozmiaru.`;
                }
            } else if (operation === 'Utworzenie') {
                try {
                    const newSize = req.body;
                    product = '-'; // Always set product to "-"
                    details = `Dodano nowy rozmiar: ${newSize.Roz_Opis || '-'}`;
                } catch (error) {
                    console.error('Utworzenie rozmiaru: Error logging new size:', error);
                    details = `Utworzenie rozmiaru: Błąd podczas dodawania nowego rozmiaru.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięcie rozmiaru: Usunięto całą tabelę rozmiarów.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Always set product to "-"
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'category') {
            let details = '';
            let product = '-'; // Always set product to "-" for category

            if (operation === 'Aktualizacja') {
                try {
                    const categoryId = req.params.categoryId;
                    const updatedCategory = req.body;
                    const oldCategory = await Category.findById(categoryId).lean();
                    const oldDescription = oldCategory.Kat_1_Opis_1 || '-'; // Replace empty value with "-"
                    const newDescription = updatedCategory.Kat_1_Opis_1 || '-'; // Replace empty value with "-"
                    details = `Zaaktualizowano kategorię z ${oldDescription} na ${newDescription}`;
                } catch (error) {
                    console.error('Aktualizacja kategorii: Error logging update category:', error);
                    details = `Aktualizacja kategorii: Błąd podczas aktualizowania kategorii.`;
                }
            } else if (operation === 'Utworzenie') {
                try {
                    const newCategory = req.body;
                    product = '-'; // Always set product to "-"
                    details = `Dodano nową kategorię: ${newCategory.Kat_1_Opis_1 || '-'}`;
                } catch (error) {
                    console.error('Utworzenie kategorii: Error logging new category:', error);
                    details = `Utworzenie kategorii: Błąd podczas dodawania nowej kategorii.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięcie kategorii: Usunięto całą tabelę kategorii.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Always set product to "-"
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'users') {
            let details = '';
            let product = '-'; // Ensure product is set to '-'

            if (operation === 'Aktualizacja') {
                try {
                    const userId = req.params.userId;
                    const oldUser = await User.findById(userId).lean();
                    const updatedUser = req.body;

                    if (!oldUser) {
                        details = `Nie znaleziono użytkownika o ID: ${userId}`;
                    } else {
                        let changes = [];
                        for (const key in updatedUser) {
                            if (key === '_id') { // Skip logging _id change
                                continue;
                            }
                            if (key === 'password') {
                                changes.push(`Hasło zostało zmienione`);
                            } else if (key === 'sellingPoint' && oldUser.role !== 'admin' && oldUser.sellingPoint !== updatedUser.sellingPoint) {
                                changes.push(`Punkt sprzedaży został zmieniony z ${oldUser.sellingPoint || '-'} na ${updatedUser.sellingPoint || '-'}`);
                            } else if (oldUser[key] !== String(updatedUser[key])) {
                                changes.push(`${key} został zmieniony z ${oldUser[key]} na ${updatedUser[key]}`);
                            }
                        }

                        if (changes.length > 0) {
                            details = changes.join(', '); // Join the changes into a single string
                        } else {
                            details = "Zaktualizowano użytkownika - brak zmian";
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                    details = `Błąd podczas aktualizowania użytkownika o ID: ${req.params.userId}`;
                }
            }

            if (operation === 'Utworzenie') {
                details = `Utworzono użytkownika: ${req.body.email}`;
            }

            if (operation === 'Usunięcie') {
                try {
                    const user = await User.findById(req.params.userId);
                    if (user) {
                        details = `Usunięto użytkownika: ${user.email}`;
                    } else {
                        details = `Nie znaleziono użytkownika o ID: ${req.params.userId}`;
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                    details = `Błąd podczas usuwania użytkownika o ID: ${req.params.userId}`;
                }
            }

            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Ensure product is set to '-'
                details: details,
                userloggedinId: userloggedinId // Include user ID
            });
        } 
        if (collectionName === 'states') {
            let details = '';
            let product = ''; // Add product field
            let from = '-'; // Default "Skąd" value
            let to = '-'; // Default "Dokąd" value

            // Special handling for barcode/symbol endpoint
            if (req.params.barcode && req.params.symbol && req.method === 'DELETE') {
                // This is the /barcode/:barcode/symbol/:symbol endpoint
                // The controller already handles history logging, so skip middleware logging
                return next();
            }

            // Special handling for ID-based delete endpoint when it has operation-type header
            if (req.params.id && req.method === 'DELETE' && req.headers['operation-type']) {
                // This is the /:id endpoint with operation-type header
                // The controller already handles history logging, so skip middleware logging
                return next();
            }

            if (operation === 'Dodano do stanu') {
                from = 'Produkcja'; // Set "Skąd" to "Produkcja" for this operation
                to = req.body.sellingPoint || '-'; // Set "Dokąd" to sellingPoint or "-" if not provided
                product = req.body.fullName + " " + req.body.size || 'Nieznany produkt'; // Ensure product is set to fullName
                details = 'Dodano produkt do stanu: ' + (req.body.fullName + " " + req.body.size || 'Nieznany rozmiar'); // Set details to size
            }

            if (operation === 'Aktualizacja') {
                try {
                    const stateId = req.params.id;
                    const oldState = await State.findById(stateId).populate('size').populate('sellingPoint').populate('fullName').lean();
                    const updatedState = req.body;

                    if (!oldState) {
                        details = `Nie znaleziono produktu o ID: ${stateId}`;
                    } else {
                        // Include both fullName and size in product
                        product = `${oldState.fullName?.fullName || 'Nieznany produkt'} ${oldState.size?.Roz_Opis || 'Nieznany rozmiar'}`;
                        let changes = [];

                        // Handle sellingPoint changes
                        if (updatedState.sellingPoint && oldState.sellingPoint.symbol !== updatedState.sellingPoint) {
                            from = oldState.sellingPoint.symbol || '-'; // Set "Skąd" to the old symbol
                            to = updatedState.sellingPoint || '-'; // Set "Dokąd" to the new symbol
                            changes.push(`Punkt sprzedaży został zmieniony z ${from} na ${to}`); // Use "punkt sprzedaży" instead of "sellingPoint"
                        }

                        // Handle size changes separately without affecting "Skąd" and "Dokąd"
                        if (updatedState.size && oldState.size.Roz_Opis !== updatedState.size) {
                            changes.push(`Rozmiar został zmieniony z ${oldState.size.Roz_Opis} na ${updatedState.size}`);
                        }

                        // Handle fullName changes separately
                        if (updatedState.fullName && oldState.fullName.fullName !== updatedState.fullName) {
                            changes.push(`Nazwa produktu została zmieniona z ${oldState.fullName.fullName} na ${updatedState.fullName}`);
                        }

                        if (changes.length > 0) {
                            details = changes.join(', ');
                        } else {
                            details = "Zaktualizowano produkt - brak zmian";
                        }
                    }
                } catch (error) {
                    console.error('Error fetching state:', error);
                    details = `Błąd podczas aktualizowania produktu o ID: ${req.params.id}`;
                }
            }

            if (operation === 'Usunięto ze stanu') {
                try {
                    const state = await State.findById(req.params.id).populate('fullName').populate('size').populate('sellingPoint');
                    if (state) {
                        product = `${state.fullName.fullName || 'Nieznany produkt'} ${state.size.Roz_Opis || 'Nieznany rozmiar'}`; // Set product
                        details = `Usunięto produkt ze stanu ${product}`;
                        from = state.sellingPoint?.symbol || 'MAGAZYN'; // Set "Skąd" to the current symbol or MAGAZYN
                        to = '-'; // Set "Dokąd" to "-" for deletion
                    } else {
                        details = `Nie znaleziono produktu o ID: ${req.params.id}`;
                    }
                } catch (error) {
                    console.error('Error fetching state for deletion:', error);
                    details = `Błąd podczas usuwania produktu o ID: ${req.params.id}`;
                }
            }

            if (operation === 'Przeniesiono w ramach stanu') {
                try {
                    const state = await State.findById(req.params.id).populate('fullName').populate('size').populate('sellingPoint');
                    if (state) {
                        product = `${state.fullName.fullName || 'Nieznany produkt'} ${state.size.Roz_Opis || 'Nieznany rozmiar'}`; // Set product
                        const currentSymbol = state.sellingPoint?.symbol || 'MAGAZYN';
                        let targetSymbol = req.headers['target-symbol'] || currentSymbol;
                        
                        // If targetSymbol is a sellingPoint name (not a symbol), find the corresponding symbol
                        if (targetSymbol && targetSymbol !== '-' && targetSymbol !== 'Manual' && targetSymbol !== currentSymbol) {
                            try {
                                const targetUser = await User.findOne({ sellingPoint: targetSymbol }).lean();
                                if (targetUser && targetUser.symbol) {
                                    targetSymbol = targetUser.symbol;
                                }
                            } catch (userError) {
                                console.error('Error finding user by sellingPoint:', userError);
                            }
                        }
                        
                        details = `Przeniesiono produkt w ramach stanu ${product} z ${currentSymbol} do ${targetSymbol}`;
                        from = currentSymbol; // Set "Skąd" to current symbol
                        to = targetSymbol; // Set "Dokąd" to target symbol (same as from for green items)
                    } else {
                        details = `Nie znaleziono produktu o ID: ${req.params.id}`;
                    }
                } catch (error) {
                    console.error('Error fetching state for same transfer:', error);
                    details = `Błąd podczas przenoszenia produktu o ID: ${req.params.id}`;
                }
            }

            if (operation === 'Przesunięto ze stanu') {
                try {
                    const state = await State.findById(req.params.id).populate('fullName').populate('size').populate('sellingPoint');
                    if (state) {
                        product = `${state.fullName.fullName || 'Nieznany produkt'} ${state.size.Roz_Opis || 'Nieznany rozmiar'}`; // Set product
                        details = `Przesunięto produkt ze stanu ${product}`;
                        from = state.sellingPoint?.symbol || 'MAGAZYN'; // Set "Skąd" to the current symbol or MAGAZYN
                        
                        // Try to determine the target selling point from sales data
                        try {
                            // This will be set by the frontend when making the delete request
                            let targetSymbol = req.headers['target-symbol'] || req.query.targetSymbol || '-';
                            
                            // Use helper function to map sellingPoint to symbol
                            targetSymbol = await getSymbolBySellingPoint(targetSymbol);
                            
                            to = targetSymbol; // Set "Dokąd" to the target symbol
                        } catch (error) {
                            console.error('Error in targetSymbol mapping:', error);
                            to = '-'; // Fallback to "-"
                        }
                    } else {
                        details = `Nie znaleziono produktu o ID: ${req.params.id}`;
                    }
                } catch (error) {
                    console.error('Error fetching state:', error);
                    details = `Błąd podczas przesuwania produktu o ID: ${req.params.id}`;
                }
            }

            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Include product field
                details: details || 'Brak szczegółów', // Fallback to "Brak szczegółów" if details are empty
                userloggedinId: userloggedinId, // Include user ID
                from: from, // Ensure "Skąd" field stores correct value
                to: to, // Ensure "Dokąd" field stores correct value
            });
        }

        if (collectionName === 'colors') {
            let details = '';
            let product = '-'; // Always set product to "-" for colors

            if (operation === 'Aktualizacja') {
                try {
                    const colorId = req.params.colorId;
                    const updatedColor = req.body;
                    const oldColor = await Color.findById(colorId).lean();
                    const oldDescription = oldColor.Kol_Opis || '-'; // Replace empty value with "-"
                    const newDescription = updatedColor.Kol_Opis || '-'; // Replace empty value with "-"
                    details = `Zaaktualizowano kolor z ${oldDescription} na ${newDescription}`;
                } catch (error) {
                    console.error('Aktualizacja koloru: Error logging update color:', error);
                    details = `Aktualizacja koloru: Błąd podczas aktualizowania koloru.`;
                }
            } else if (operation === 'Utworzenie') {
                try {
                    const newColor = req.body;
                    product = '-'; // Always set product to "-"
                    details = `Dodano nowy kolor: ${newColor.Kol_Opis || '-'}`;
                } catch (error) {
                    console.error('Utworzenie koloru: Error logging new color:', error);
                    details = `Utworzenie koloru: Błąd podczas dodawania nowego koloru.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięcie koloru: Usunięto całą tabelę kolorów.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                product: product, // Always set product to "-"
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'bagsCategory') {
            console.log('Processing bagsCategory history - Method:', req.method, 'Operation:', operation);
            let details = '';
            let product = '-'; // Always set product to "-" for bags categories

            if (operation === 'Aktualizacja') {
                try {
                    const bagsCategoryId = req.params.bagsCategoryId;
                    const updatedBagsCategory = req.body;
                    const oldBagsCategory = await require('../db/models/bagsCategory').findById(bagsCategoryId).lean();
                    
                    if (!oldBagsCategory) {
                        details = `Nie znaleziono kategorii torebek o ID: ${bagsCategoryId}`;
                    } else {
                        let changes = [];
                        
                        // Compare Kat_1_Kod_1
                        if (updatedBagsCategory.Kat_1_Kod_1 && oldBagsCategory.Kat_1_Kod_1 !== updatedBagsCategory.Kat_1_Kod_1) {
                            changes.push(`Kod został zmieniony z ${oldBagsCategory.Kat_1_Kod_1} na ${updatedBagsCategory.Kat_1_Kod_1}`);
                        }
                        
                        // Compare Kat_1_Opis_1
                        if (updatedBagsCategory.Kat_1_Opis_1 && oldBagsCategory.Kat_1_Opis_1 !== updatedBagsCategory.Kat_1_Opis_1) {
                            changes.push(`Opis został zmieniony z ${oldBagsCategory.Kat_1_Opis_1} na ${updatedBagsCategory.Kat_1_Opis_1}`);
                        }
                        
                        // Compare Plec
                        if (updatedBagsCategory.Plec && oldBagsCategory.Plec !== updatedBagsCategory.Plec) {
                            changes.push(`Płeć została zmieniona z ${oldBagsCategory.Plec} na ${updatedBagsCategory.Plec}`);
                        }
                        
                        details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w kategorii torebek';
                    }
                } catch (error) {
                    console.error('Error logging update bags category:', error);
                    details = `Błąd podczas aktualizowania kategorii torebek o ID: ${req.params.bagsCategoryId}`;
                }
            } else if (operation === 'Utworzenie' || operation === 'Dodano produkt') {
                try {
                    const newBagsCategory = req.body;
                    details = `Dodano nową kategorię torebek: ${newBagsCategory.Kat_1_Opis_1 || 'Nieznana kategoria'}`;
                } catch (error) {
                    console.error('Error logging create bags category:', error);
                    details = `Błąd podczas dodawania kategorii torebek.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięto wszystkie kategorie torebek.`;
            }
            
            historyEntry = new History({
                collectionName: 'Kategorie torebek',
                operation: operation,
                product: product,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'bags') {
            console.log('Processing bags history - Method:', req.method, 'Operation:', operation);
            let details = '';
            let product = '-'; // Always set product to "-" for bags

            if (operation === 'Aktualizacja') {
                try {
                    const bagId = req.params.id;
                    const updatedBag = req.body;
                    const oldBag = await require('../db/models/bags').findById(bagId).lean();
                    
                    if (!oldBag) {
                        details = `Nie znaleziono torebki o ID: ${bagId}`;
                    } else {
                        let changes = [];
                        
                        // Compare Torebki_Kod
                        if (updatedBag.Torebki_Kod && oldBag.Torebki_Kod !== updatedBag.Torebki_Kod) {
                            changes.push(`Kod torebki został zmieniony z ${oldBag.Torebki_Kod} na ${updatedBag.Torebki_Kod}`);
                        }
                        
                        // Compare Torebki_Opis
                        if (updatedBag.Torebki_Opis && oldBag.Torebki_Opis !== updatedBag.Torebki_Opis) {
                            changes.push(`Opis został zmieniony z ${oldBag.Torebki_Opis} na ${updatedBag.Torebki_Opis}`);
                        }
                        
                        // Compare Torebki_Cena
                        if (updatedBag.Torebki_Cena && oldBag.Torebki_Cena !== updatedBag.Torebki_Cena) {
                            changes.push(`Cena została zmieniona z ${oldBag.Torebki_Cena} na ${updatedBag.Torebki_Cena}`);
                        }
                        
                        details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w torebce';
                    }
                } catch (error) {
                    console.error('Error logging update bag:', error);
                    details = `Błąd podczas aktualizowania torebki o ID: ${req.params.id}`;
                }
            } else if (operation === 'Utworzenie' || operation === 'Dodano produkt') {
                try {
                    const newBag = req.body;
                    details = `Dodano nową torebkę: ${newBag.Torebki_Kod || 'Nieznany kod'}`;
                } catch (error) {
                    console.error('Error logging create bag:', error);
                    details = `Błąd podczas dodawania torebki.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięto wszystkie torebki.`;
            }
            
            historyEntry = new History({
                collectionName: 'Torebki',
                operation: operation,
                product: product,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'wallets') {
            console.log('Processing wallets history - Method:', req.method, 'Operation:', operation);
            let details = '';
            let product = '-'; // Always set product to "-" for wallets

            if (operation === 'Aktualizacja') {
                try {
                    const walletId = req.params.id;
                    const updatedWallet = req.body;
                    const oldWallet = await require('../db/models/wallet').findById(walletId).lean();
                    
                    if (!oldWallet) {
                        details = `Nie znaleziono portfela o ID: ${walletId}`;
                    } else {
                        let changes = [];
                        
                        // Compare Torebki_Kod
                        if (updatedWallet.Torebki_Kod && oldWallet.Torebki_Kod !== updatedWallet.Torebki_Kod) {
                            changes.push(`Kod torebki został zmieniony z ${oldWallet.Torebki_Kod} na ${updatedWallet.Torebki_Kod}`);
                        }
                        
                        // Compare Torebki_Opis
                        if (updatedWallet.Torebki_Opis && oldWallet.Torebki_Opis !== updatedWallet.Torebki_Opis) {
                            changes.push(`Opis został zmieniony z ${oldWallet.Torebki_Opis} na ${updatedWallet.Torebki_Opis}`);
                        }
                        
                        // Compare Torebki_Cena
                        if (updatedWallet.Torebki_Cena && oldWallet.Torebki_Cena !== updatedWallet.Torebki_Cena) {
                            changes.push(`Cena została zmieniona z ${oldWallet.Torebki_Cena} na ${updatedWallet.Torebki_Cena}`);
                        }
                        
                        details = changes.length > 0 ? changes.join(', ') : 'Brak zmian w portfelu';
                    }
                } catch (error) {
                    console.error('Error logging update wallet:', error);
                    details = `Błąd podczas aktualizowania portfela o ID: ${req.params.id}`;
                }
            } else if (operation === 'Utworzenie' || operation === 'Dodano produkt') {
                try {
                    const newWallet = req.body;
                    details = `Dodano nowy portfel: ${newWallet.Torebki_Kod || 'Nieznany kod'}`;
                } catch (error) {
                    console.error('Error logging create wallet:', error);
                    details = `Błąd podczas dodawania portfela.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięto wszystkie portfele.`;
            }
            
            historyEntry = new History({
                collectionName: 'Portfele',
                operation: operation,
                product: product,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (historyEntry) {
            // Add transactionId if provided in headers (try both formats)
            const transactionId = req.headers['transactionid'] || req.headers['transaction-id'];
            if (transactionId) {
                historyEntry.transactionId = transactionId;
                console.log('Setting transactionId in history entry:', transactionId);
            } else {
                console.log('No transactionid or transaction-id header found in request');
                console.log('Available headers:', Object.keys(req.headers));
            }
            
            historyEntry.save()
                .then(() => {
                    console.log('History entry saved with transactionId:', historyEntry.transactionId);
                    next();
                })
                .catch(err => {
                    console.error('Error saving history:', err);
                    next(err);
                });
        } else {
            next();
        }
    };
};

module.exports = historyLogger;