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

        if(collectionName==='stock'){
            const operation = req.method;
            let details = '';
            if(operation === 'PATCH'){
                try {
                    const stockId = req.params.stockId;
                    const updatedStock = req.body;
                    const oldStock = await Stock.findById(stockId).lean();
                    details = `Zaaktualizowano produkt o ID: ${stockId} z ${oldStock.Tow_Opis} na ${updatedStock.Tow_Opis}`;
                } catch (error) {
                    console.error('Error logging update stock:', error);
                    details = `Błąd podczas aktualizowania stocku.`;
                }
            } else if (operation === 'DELETE') {
                details = `Usunięto całą tabelę asortymentu.`;
            } else if (operation === 'POST') {
                details = `Wgrano całą tabelę asortymentu.`;
            }
            historyEntry = new History({
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if(collectionName === 'colors') {
            const operation = req.method;
            let details = '';

            if(operation === 'PATCH') {
                try {
                    const colorId = req.params.colorId;
                    const updatedColor = req.body;
                    const oldColor = await Color.findById(colorId).lean();
                    details = `Zaktualizowano kolor o ID: ${colorId} z ${oldColor.Kol_Opis} na ${updatedColor.Kol_Opis}`;
                } catch (error) {
                    console.error('Error logging update color:', error);
                    details = `Błąd podczas aktualizowania koloru.`;
                }
            } else if (operation === 'DELETE') {
                details = `Usunięto całą tabelę kolorów.`;
            } else if (operation === 'POST') {
                details = `Wgrano całą tabelę kolorów.`;
            }
            historyEntry = new History({
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if(collectionName === 'sizes') {
            const operation = req.method;
            let details = '';

            if(operation === 'PATCH') {
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
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if(collectionName === 'category') {
            const operation = req.method;
            let details = '';

            if(operation === 'PATCH') {
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
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'goods') {
            const operation = req.method;
            let details = '';

            if (operation === 'POST') {
                try {
                    const newGood = req.body;
                    console.log('New good being added:', newGood); // Log the new product details
                    details = `Produkt o nazwie ${newGood && newGood.fullName ? newGood.fullName : 'Unknown'} został dodany.`;
                } catch (error) {
                    console.error('Error logging create good:', error);
                    details = `Błąd podczas dodawania produktu.`;
                }
            }

            if (operation === 'PUT') {
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
                        let changes = [];

                        details = `Produkt o ID: ${goodId}, `;

                        // Compare stock
                        if (updatedGood.stock && oldGood.stock._id.toString() !== updatedGood.stock) {
                            try {
                                const newStock = await Stock.findById(updatedGood.stock);
                                if (newStock) {
                                    changes.push(`Produkt został zmieniony z ${oldGood.stock.Tow_Opis} na ${newStock.Tow_Opis}`);
                                } else {
                                    changes.push(`Produkt został zmieniony z ${oldGood.stock.Tow_Opis} na nieznany produkt`);
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

            if (operation === 'DELETE') {
                try {
                    const goodId = req.params.goodId;
                    const oldGood = await Goods.findById(goodId).lean();

                    if (!oldGood) {
                        details = `Nie znaleziono produktu o ID: ${goodId}`;
                    } else {
                        details = `Produkt o nazwie ${oldGood.fullName} został usunięty.`;
                    }
                } catch (error) {
                    console.error('Error logging delete good:', error);
                    details = `Błąd podczas usuwania produktu o ID: ${req.params.goodId}`;
                }
            }

            historyEntry = new History({
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId
            });
        }

        if (collectionName === 'users') {
            const operation = req.method;
            let details = '';

            if (operation === 'POST') {
                details = `Utworzono użytkownika: ${req.body.email}`;
            }

            if (operation === 'PUT') {
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

            if (operation === 'DELETE') {
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
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId // Include user ID
            });
        } else if (collectionName === 'states') {
            const operation = req.method;
            let details = '';

            if (operation === 'POST') {
                details = `Utworzono produkt: ${req.body.fullName} rozmiar ${req.body.size}`;
            }

            if (operation === 'PUT') {
                try {
                    const stateId = req.params.id;
                    const oldState = await State.findById(stateId).populate('size').populate('sellingPoint').populate('fullName').lean();
                    const updatedState = req.body;

                    if (!oldState) {
                        details = `Nie znaleziono produktu o ID: ${stateId}`;
                    } else {
                        let changes = [];

                        if (updatedState.date && oldState.date.toISOString() !== new Date(updatedState.date).toISOString()) {
                            changes.push(`Data została zmieniona z ${oldState.date} na ${new Date(updatedState.date)}`);
                        }

                        if (updatedState.barcode && oldState.barcode !== updatedState.barcode) {
                            changes.push(`Barcode został zmieniony z ${oldState.barcode} na ${updatedState.barcode}`);
                        }

                        if (updatedState.size && oldState.size.Roz_Opis !== updatedState.size) {
                            changes.push(`Rozmiar został zmieniony z ${oldState.size.Roz_Opis} na ${updatedState.size}`);
                        }

                        if (updatedState.sellingPoint && oldState.sellingPoint !== updatedState.sellingPoint) {
                            changes.push(`Punkt sprzedaży został zmieniony z ${oldState.sellingPoint} na ${updatedState.sellingPoint}`);
                        }

                        if (updatedState.fullName && oldState.fullName.fullName !== updatedState.fullName) {
                            changes.push(`Nazwa została zmieniona z ${oldState.fullName.fullName} na ${updatedState.fullName}`);
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

            if (operation === 'DELETE') {
                try {
                    const state = await State.findById(req.params.id).populate('fullName').populate('size');
                    if (state) {
                        details = `Usunięto produkt: ${state.fullName.fullName} rozmiar ${state.size.Roz_Opis}`;
                    } else {
                        details = `Nie znaleziono produktu o ID: ${req.params.id}`;
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                    details = `Błąd podczas usuwania produktu o ID: ${req.params.id}`;
                }
            }

            historyEntry = new History({
                collectionName: collectionName,
                operation: operation,
                details: details,
                userloggedinId: userloggedinId // Include user ID
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