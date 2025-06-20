const History = require('../db/models/history');
const User = require('../db/models/user');
const State = require('../db/models/state');
const Goods = require('../db/models/goods');
const Stock = require('../db/models/stock');
const Color = require('../db/models/color');
const Category = require('../db/models/category');
const Size = require('../db/models/size');

const historyLogger = (collectionName) => {
    return async (req, res, next) => {
        const userloggedinId = req.user ? req.user._id : null;
        let historyEntry;

        const mapOperationToPolish = (method, collection) => {
            if (method === 'PUT' || method === 'PATCH') return 'Aktualizacja';
            if (method === 'DELETE') {
                if (collection === 'states') return 'Usunięto ze stanu'; // Special case for states
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
            return collection;
        };

        const operation = mapOperationToPolish(req.method, collectionName);
        const collectionNamePolish = mapCollectionToPolish(collectionName);

        if (collectionName === 'stock') {
            let details = '';
            if (operation === 'Aktualizacja') {
                try {
                    const stockId = req.params.stockId;
                    const updatedStock = req.body;
                    const oldStock = await Stock.findById(stockId).lean();
                    details = `Aktualizacja asortymentu: Zaaktualizowano asortyment o ID: ${stockId} z ${oldStock.Tow_Opis} na ${updatedStock.Tow_Opis}`;
                } catch (error) {
                    console.error('Aktualizacja asortymentu: Error logging update stock:', error);
                    details = `Aktualizacja asortymentu: Błąd podczas aktualizowania asortymentu.`;
                }
            } else if (operation === 'Usunięcie') {
                details = `Usunięcie asortymentu: Usunięto całą tabelę asortymentu.`;
            } else if (operation === 'Utworzenie') {
                details = `Utworzenie asortymentu: Wgrano całą tabelę asortymentu.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'goods') {
            let details = '';
            let from = '-'; // Explicitly set "from" to "-"
            let to = '-';   // Explicitly set "to" to "-"
            let product = 'Nieznany produkt'; // Default value for product

            if (operation === 'Dodano produkt') {
                try {
                    const newGood = req.body;
                    console.log('New good being added:', newGood); // Log the new product details
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

                        // Compare stock
                        if (updatedGood.stock && oldGood.stock._id.toString() !== updatedGood.stock) {
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

                        // Compare subcategory
                        if (updatedGood.subcategory && oldGood.subcategory._id.toString() !== updatedGood.subcategory) {
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
        }

        if (collectionName === 'sizes') {
            let details = '';

            if (operation === 'Aktualizacja') {
                try {
                    const sizeId = req.params.sizeId;
                    const updatedSize = req.body;
                    const oldSize = await Size.findById(sizeId).lean();
                    details = `Zaktualizowano rozmiar o ID: ${sizeId} z ${oldSize.Roz_Opis} na ${updatedSize.Roz_Opis}`;
                } catch (error) {
                    console.error('Error logging update size:', error);
                    console.error('Error object:', error); // Log the error object
                    details = `Błąd podczas aktualizowania rozmiaru.`;
                }
            } else if (operation === 'DELETE') {
                details = `Usunięto całą tabelę rozmiarów.`;
            } else if (operation === 'POST') {
                details = `Wgrano całą tabelę rozmiarów.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'category') {
            let details = '';

            if (operation === 'Aktualizacja') {
                try {
                    const categoryId = req.params.categoryId;
                    const updatedCategory = req.body;
                    const oldCategory = await Category.findById(categoryId).lean();
                    details = `Zaktualizowano kategorię o ID: ${categoryId} z ${oldCategory.Kat_1_Opis_1} na ${updatedCategory.Kat_1_Opis_1}`;
                } catch (error) {
                    console.error('Error logging update category:', error);
                    details = `Błąd podczas aktualizowania kategorii.`;
                }
            } else if (operation === 'DELETE') {
                details = `Usunięto całą tabelę kategorii.`;
            } else if (operation === 'POST') {
                details = `Wgrano całą tabelę kategorii.`;
            }
            historyEntry = new History({
                collectionName: collectionNamePolish,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'users') {
            let details = '';

            if (operation === 'Utworzenie') {
                details = `Utworzono użytkownika: ${req.body.email}`;
            }

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
                            } else if (key === 'sellingPoint' && oldUser.role === 'admin') {
                                // Skip logging sellingPoint change for admin users
                                continue;
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
                details: details,
                userloggedinId: userloggedinId // Include user ID
            });
        } 
        if (collectionName === 'states') {
            let details = '';
            let product = ''; // Add product field
            let from = '-'; // Default "Skąd" value
            let to = '-'; // Default "Dokąd" value

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
                            changes.push(`Punkt sprzedaży został zmieniony z ${from} na ${to}`);
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
                        from = state.sellingPoint?.symbol || '-'; // Set "Skąd" to the previous "Dokąd" value
                        to = '-'; // Set "Dokąd" to "-"
                    } else {
                        details = `Nie znaleziono produktu o ID: ${req.params.id}`;
                    }
                } catch (error) {
                    console.error('Error fetching state:', error);
                    details = `Błąd podczas usuwania produktu o ID: ${req.params.id}`;
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

        if (historyEntry) {
            historyEntry.save()
                .then(() => {
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