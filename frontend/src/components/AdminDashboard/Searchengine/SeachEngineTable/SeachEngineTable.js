import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from './SeachEngineTable.module.css';

const SeachEngineTable = () => {
    const [products, setProducts] = useState([]);
    const [tableArray, setTableArray] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [symbols, setSymbols] = useState([]); // State for unique symbols
    const [selectedSymbols, setSelectedSymbols] = useState([]); // State for selected symbols
    const [selectedProducts, setSelectedProducts] = useState([]); // State for products selected for printing
    const [persistentSelections, setPersistentSelections] = useState({}); // State for persistent checkbox selections
    const [rowColors, setRowColors] = useState({}); // State for row colors (productName -> color)

    // Fetch persistent checkbox selections from database
    const fetchPrintSelections = async () => {
        try {
            const response = await axios.get('/api/goods/print-selections');
            setPersistentSelections(response.data.selections);
            return response.data.selections;
        } catch (error) {
            console.error('❌ Error fetching print selections:', error);
            console.error('Error details:', error.response?.data);
            return {};
        }
    };

    // Fetch persistent row colors from database
    const fetchRowColors = async () => {
        try {
            const response = await axios.get('/api/goods/row-colors');
            setRowColors(response.data.colors);
            return response.data.colors;
        } catch (error) {
            console.error('❌ Error fetching row colors:', error);
            console.error('Error details:', error.response?.data);
            return {};
        }
    };

    // Update persistent checkbox selection in database
    const updatePrintSelection = async (productId, isSelected) => {
        try {
            const response = await axios.post('/api/goods/print-selections', {
                selections: [{ productId, isSelected }]
            });
            
            // Update local state
            setPersistentSelections(prev => ({
                ...prev,
                [productId]: isSelected
            }));
            
        } catch (error) {
            console.error('❌ Error updating print selection:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    // Update row color in database
    const updateRowColor = async (productId, color) => {
        try {
            const response = await axios.post('/api/goods/row-colors', {
                colors: [{ productId, color }]
            });
            
        } catch (error) {
            console.error('❌ Error updating row color:', error);
            console.error('Error details:', error.response?.data);
        }
    };

    // Helper function to determine if color is dark or light
    const isColorDark = (hexColor) => {
        if (!hexColor) return false;
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return brightness < 128;
    };

    // Funkcja sprawdzająca czy produkt to kurtka R&B
    const isRBProduct = (product, productName) => {
        if (!product) return false;
        
        // Method 1: Check by manufacturer ID (R&B ID na serwerze: 68eb68aa9c8a8a8eb473f2e0)
        if (product.manufacturer === '68eb68aa9c8a8a8eb473f2e0') {
            return true;
        }
        
        // Method 2: Check by manufacturer object if it's populated
        if (product.manufacturer && 
            typeof product.manufacturer === 'object' &&
            product.manufacturer.Prod_Opis === 'R&B') {
            return true;
        }
        
        // Method 3: DODATKOWA OCHRONA - sprawdź po nazwie produktu
        if (productName && typeof productName === 'string' && 
            productName.toLowerCase().includes('r&b')) {
            return true;
        }
        
        return false;
    };

    // Helper function to identify women's leather jackets for limit enforcement
    const isWomenLeatherJacket = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako damska kurtka licówka (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // Method 1: Proper category structure check
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory && 
            typeof product.subcategory === 'object' &&
            (product.subcategory.Kat_1_Opis_1 === 'Kurtka skórzana damska' || 
             product.subcategory.Kat_1_Opis_1 === 'Kurtka damska licówka') &&
            product.plec === 'D') {
            return true;
        }
        
        // Method 2: Direct subcategory ID check (if we know the ID)
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory === '68f7d26c5b8f61302b06f658' && // ID subcategory "Kurtka skórzana damska" 
            product.plec === 'D') {
            return true;
        }
        
        // Method 3: Fallback - name-based identification for products that might have incorrect structure
        if (product.plec === 'D' && 
            product.category === 'Kurtki kożuchy futra' &&
            (productName.toLowerCase().includes('kurtka') || 
             productName.toLowerCase().includes('skórzana') ||
             productName.toLowerCase().includes('skorzana') ||
             productName.toLowerCase().includes('jacket'))) {
            return true;
        }
        
        return false;
    };

    // Funkcja sprawdzająca czy produkt to kurtka męska licówka
    const isMenLeatherJacket = (product, productName) => {
        if (!product) return false;
        
        // Wyklucz produkty R&B - one mają swój własny limit 40 sztuk
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // Method 1: Proper category structure check
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory && 
            typeof product.subcategory === 'object' &&
            product.subcategory.Kat_1_Opis_1 === 'Kurtka męska licówka' &&
            product.plec === 'M') {
            return true;
        }
        
        // Method 2: Direct subcategory ID check for men jackets (ID from our script: 68f7db03d1dde0b668d4c378)
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory === '68f7db03d1dde0b668d4c378' && // ID subcategory "Kurtka męska licówka" 
            product.plec === 'M') {
            return true;
        }
        
        return false;
    };

    // Funkcja sprawdzająca czy produkt to kamizelka licówka (męska lub damska)
    const isVestLicowka = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako kamizelka licówka (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // WYKLUCZENIE: Jeśli brak podkategorii, nie może być kamizelką licówka
        if (!product.subcategory || !product.subcategory.Kat_1_Opis_1) {
            return false;
        }
        
        // Sprawdź podkategorię "Kamizelka damska licówka" lub "Kamizelka męska licówka"
        return product.category === 'Kurtki kożuchy futra' && 
               product.subcategory && 
               typeof product.subcategory === 'object' &&
               (product.subcategory.Kat_1_Opis_1 === 'Kamizelka damska licówka' ||
                product.subcategory.Kat_1_Opis_1 === 'Kamizelka męska licówka');
    };

    // Funkcja sprawdzająca czy produkt to kożuch damski
    const isWomensFurCoat = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako kożuch damski (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // WYKLUCZENIE: Jeśli brak podkategorii, nie może być kożuchem damskim
        if (!product.subcategory || !product.subcategory.Kat_1_Opis_1) {
            return false;
        }
        
        // Sprawdź podkategorię "Kożuch damski"
        return product.category === 'Kurtki kożuchy futra' && 
               product.subcategory && 
               typeof product.subcategory === 'object' &&
               product.subcategory.Kat_1_Opis_1 === 'Kożuch damski';
    };

    // Funkcja sprawdzająca czy produkt to kożuch męski
    const isMensFurCoat = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako kożuch męski (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // WYKLUCZENIE: Jeśli brak podkategorii, nie może być kożuchem męskim
        if (!product.subcategory || !product.subcategory.Kat_1_Opis_1) {
            return false;
        }
        
        // Sprawdź podkategorię "Kożuch męski " (uwaga na spację na końcu!)
        return product.category === 'Kurtki kożuchy futra' && 
               product.subcategory && 
               typeof product.subcategory === 'object' &&
               product.subcategory.Kat_1_Opis_1 === 'Kożuch męski ';
    };

    // Funkcja sprawdzająca czy produkt to kożuch dziecięcy
    const isChildrensFurCoat = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako kożuch dziecięcy (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // WYKLUCZENIE: Jeśli brak podkategorii, nie może być kożuchem dziecięcym
        if (!product.subcategory || !product.subcategory.Kat_1_Opis_1) {
            return false;
        }
        
        // Sprawdź podkategorię "Kożuch dziecięcy"
        return product.category === 'Kurtki kożuchy futra' && 
               product.subcategory && 
               typeof product.subcategory === 'object' &&
               product.subcategory.Kat_1_Opis_1 === 'Kożuch dziecięcy';
    };

    // Funkcja sprawdzająca czy produkt to kamizelka dziecięca
    const isChildrensVest = (product, productName) => {
        if (!product) return false;
        
        // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako kamizelka dziecięca (ma własny limit)
        if (isRBProduct(product, productName)) {
            return false;
        }
        
        // WYKLUCZENIE: Jeśli brak podkategorii, nie może być kamizelką dziecięcą
        if (!product.subcategory || !product.subcategory.Kat_1_Opis_1) {
            return false;
        }
        
        // Sprawdź podkategorię "Kamizelka dziecięca"
        return product.category === 'Kurtki kożuchy futra' && 
               product.subcategory && 
               typeof product.subcategory === 'object' &&
               product.subcategory.Kat_1_Opis_1 === 'Kamizelka dziecięca';
    };

    const fetchProducts = async () => {
        try {
            const goodsResponse = await axios.get('/api/excel/goods/get-all-goods');
            const productData = goodsResponse.data.goods.map((item) => ({
                id: item._id,
                fullName: item.fullName,
                plec: item.Plec,
                category: item.category,
                subcategory: item.subcategory,
                manufacturer: item.manufacturer
            }));
            setProducts(productData);

            // Fetch persistent checkbox selections
            const selections = await fetchPrintSelections();

            // Fetch persistent row colors
            const colors = await fetchRowColors();

            const stateResponse = await axios.get('/api/state');
            // Use stateResponse.data directly, no need for additional API calls
            const resolvedStateData = stateResponse.data.map((stateItem) => ({
                ...stateItem,
                fullName: stateItem.fullName, // Use fullName directly from state
                size: stateItem.size, // Use size directly from state
                sellingPoint: stateItem.sellingPoint, // Include sellingPoint
            }));

            // Extract unique symbols from state data
            const uniqueSymbols = [...new Set(resolvedStateData.map((item) => item.symbol))];
            setSymbols(uniqueSymbols);

            const columns = 17; // Number of table columns: 1 checkbox + 1 new column + 1 product name + 14 sizes
            const rows = productData.length;

            
            const tableArray = Array.from({ length: rows }, (_, rowIndex) =>
                Array.from({ length: columns }, (_, colIndex) => {
                    if (colIndex === 0) {
                        // Checkbox column - use persistent selection state
                        const productId = productData[rowIndex].id;
                        const isSelected = selections[productId] || false;

                        return isSelected;
                    }
                    if (colIndex === 1) {
                        // Color column - use color from database or default to white
                        const productId = productData[rowIndex].id;
                        return colors[productId] || '#ffffff';
                    }
                    if (colIndex === 2) return productData[rowIndex].fullName; // Product name
                    if (colIndex === 3) return productData[rowIndex].plec; // Keep Plec in the array
                    return null;
                })
            );

            resolvedStateData.forEach((stateItem) => {
                const matchedProduct = productData.find(
                    (product) => product.fullName === stateItem.fullName
                );
                if (matchedProduct) {
                    const size = stateItem.size;
                    let columnIndex;
                    switch (size) {
                        case 'XXS':
                        case '32':
                            columnIndex = 4;
                            break;
                        case 'XS':
                        case '34':
                            columnIndex = 5;
                            break;
                        case 'S':
                        case '36':
                            columnIndex = 6;
                            break;
                        case 'M':
                        case '38':
                            columnIndex = 7;
                            break;
                        case 'L':
                        case '40':
                            columnIndex = 8;
                            break;
                        case 'XL':
                        case '42':
                            columnIndex = 9;
                            break;
                        case '2XL':
                        case '44':
                            columnIndex = 10;
                            break;
                        case '3XL':
                        case '46':
                            columnIndex = 11;
                            break;
                        case '4XL':
                        case '48':
                            columnIndex = 12;
                            break;
                        case '5XL':
                        case '50':
                            columnIndex = 13;
                            break;
                        case '6XL':
                        case '52':
                            columnIndex = 14;
                            break;
                        case '7XL':
                        case '54':
                            columnIndex = 15;
                            break;
                        case '8XL':
                        case '56':
                        case '66':
                            columnIndex = 16;
                            break;
                        // Rozmiary dziecięce
                        case '92':
                            columnIndex = 4;
                            break;
                        case '98':
                            columnIndex = 5;
                            break;
                        case '104':
                            columnIndex = 6;
                            break;
                        case '110':
                            columnIndex = 7;
                            break;
                        case '116':
                            columnIndex = 8;
                            break;
                        case '122':
                            columnIndex = 9;
                            break;
                        case '128':
                            columnIndex = 10;
                            break;
                        case '134':
                            columnIndex = 11;
                            break;
                        case '140':
                            columnIndex = 12;
                            break;
                        case '146':
                            columnIndex = 13;
                            break;
                        case '152':
                            columnIndex = 14;
                            break;
                        case '158':
                            columnIndex = 15;
                            break;
                        case '164':
                            columnIndex = 16;
                            break;
                        default:
                            return;
                    }
                    tableArray.forEach((row) => {
                        if (row[2] === matchedProduct.fullName) { // Product name is now at index 2
                            if (row[columnIndex]) {
                                const existingSymbols = row[columnIndex].split('/');
                                if (!existingSymbols.includes(stateItem.symbol)) {
                                    row[columnIndex] = `${row[columnIndex]}/${stateItem.symbol}`;
                                }
                            } else {
                                row[columnIndex] = stateItem.symbol;
                            }
                        }
                    });
                }
            });

            setTableArray(tableArray);
            
            // 🔄 SYNCHRONIZACJA: Po załadowaniu danych, zsynchronizuj selectedProducts z persistentSelections
            const selectedProductNames = productData
                .filter(product => selections[product.id]) // Produkty zaznaczone w bazie
                .map(product => product.fullName); // Pobierz nazwy produktów
            
            setSelectedProducts(selectedProductNames);

            // 🎨 SYNCHRONIZACJA KOLORÓW: Mapuj kolory z ID produktów na nazwy produktów
            const colorsByProductName = {};
            productData.forEach(product => {
                const colorFromDb = colors[product.id] || '#ffffff';
                colorsByProductName[product.fullName] = colorFromDb;
            });
            setRowColors(colorsByProductName);
            
            // 📊 SZCZEGÓŁOWE STATYSTYKI ZAZNACZONYCH PRODUKTÓW
            const totalSelectedCheckboxes = Object.values(selections).filter(Boolean).length;
            const womenLeatherJacketsSelected = selectedProductNames.filter(productName => {
                const product = productData.find(p => p.fullName === productName);
                return isWomenLeatherJacket(product, productName);
            }).length;
            
            const menLeatherJacketsSelected = selectedProductNames.filter(productName => {
                const product = productData.find(p => p.fullName === productName);
                return isMenLeatherJacket(product, productName);
            }).length;
            
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Handle color change for rows
    const handleColorChange = async (productName, color) => {
        // Find product ID by name
        const product = products.find(p => p.fullName === productName);
        if (!product) {
            console.error('❌ Product not found:', productName);
            return;
        }

        // Update local state immediately for UI responsiveness
        setRowColors(prev => ({
            ...prev,
            [productName]: color
        }));

        // Update table array with new color
        setTableArray(prev => prev.map(row => {
            if (row[2] === productName) {
                const newRow = [...row];
                newRow[1] = color; // Update color column
                return newRow;
            }
            return row;
        }));

        // Save to database
        await updateRowColor(product.id, color);
    };

    // Reset all colors to white
    const handleResetColors = async () => {
        // Wyświetl okno potwierdzenia z prośbą o wpisanie słowa "RESETUJ"
        const confirmationWord = prompt(
            '⚠️ UWAGA! RESETOWANIE KOLORÓW\n\n' +
            'Ta operacja wyczyści WSZYSTKIE kolory produktów w tabeli!\n' +
            'Wszystkie produkty zostaną ustawione na kolor biały.\n\n' +
            'Aby potwierdzić, wpisz słowo: RESETUJ\n' +
            '(wielkość liter ma znaczenie)'
        );

        // Sprawdź czy użytkownik wpisał poprawne słowo potwierdzające
        if (confirmationWord !== 'RESETUJ') {
            if (confirmationWord !== null) {
                // Użytkownik wpisał coś, ale niepoprawnie
                alert('❌ Błędne słowo potwierdzające!\n\nOperacja resetowania kolorów została anulowana.\n\nAby zresetować kolory, spróbuj ponownie i wpisz dokładnie: RESETUJ');
            }
            // Jeśli confirmationWord === null, użytkownik anulował (kliknął Cancel)
            console.log('🚫 Resetowanie kolorów zostało anulowane przez użytkownika');
            return; // Przerwij wykonywanie funkcji
        }

        // Jeśli doszliśmy tutaj, użytkownik wpisał poprawne słowo
        console.log('✅ Potwierdzenie resetowania kolorów - rozpoczynam resetowanie...');

        // Reset local state
        setRowColors({});
        setTableArray(prev => prev.map(row => {
            const newRow = [...row];
            newRow[1] = '#ffffff'; // Reset color to white
            return newRow;
        }));

        // Reset colors in database for all products
        try {
            const colorUpdates = products.map(product => ({
                productId: product.id,
                color: '#ffffff'
            }));

            await axios.post('/api/goods/row-colors', {
                colors: colorUpdates
            });

            // Pokaż komunikat o powodzeniu
            alert('✅ RESETOWANIE KOLORÓW ZAKOŃCZONE POMYŚLNIE!\n\nWszystkie kolory produktów zostały zresetowane do białego.');

        } catch (error) {
            console.error('❌ Error resetting colors in database:', error);
            alert('❌ BŁĄD PODCZAS RESETOWANIA KOLORÓW!\n\nWystąpił problem z połączeniem z bazą danych.\nSpróbuj ponownie lub skontaktuj się z administratorem.');
        }
    };

    // Monitor zmian w selectedProducts i wyświetlaj statystyki
    useEffect(() => {
        if (products.length > 0 && selectedProducts.length >= 0) {
            const womenLeatherJacketsCount = selectedProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isWomenLeatherJacket(product, productName);
            }).length;
            
            const menLeatherJacketsCount = selectedProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isMenLeatherJacket(product, productName);
            }).length;
        }
    }, [selectedProducts, products]); // Reaguj na zmiany w selectedProducts i products

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const refreshComponent = async () => {
        setSearchQuery('');
        setLoading(true);
        try {
            await fetchProducts();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle symbol checkbox changes
    const handleSymbolChange = (symbol) => {
        setSelectedSymbols((prevSelected) =>
            prevSelected.includes(symbol)
                ? prevSelected.filter((s) => s !== symbol) // Remove symbol if already selected
                : [...prevSelected, symbol] // Add symbol if not selected
        );
    };

    // Handle product selection for printing - now persistent in database
    const handleProductCheckboxChange = async (productName) => {
        // Find product ID by name
        const product = products.find(p => p.fullName === productName);
        if (!product) {
            console.error('❌ Product not found:', productName);
            return;
        }
        
        const productId = product.id;
        const currentlySelected = persistentSelections[productId] || false;
        const newSelection = !currentlySelected;

        // 🚨 SPRAWDZENIE LIMITU DLA KURTEK SKÓRZANYCH DAMSKICH
        const isLeatherJacketWomen = isWomenLeatherJacket(product, productName);
        
        // 🚨 SPRAWDZENIE LIMITU DLA KURTEK MĘSKICH LICÓWKA
        const isLeatherJacketMen = isMenLeatherJacket(product, productName);

        // 🚨 SPRAWDZENIE LIMITU DLA KAMIZELEK LICÓWKA
        const isVest = isVestLicowka(product, productName);

        // 🚨 SPRAWDZENIE LIMITU DLA PRODUKTÓW R&B
        const isRB = isRBProduct(product, productName);

        // 🚨 SPRAWDZENIE LIMITU DLA KOŻUCHÓW DAMSKICH
        const isWomenFurCoat = isWomensFurCoat(product, productName);

        // 🚨 SPRAWDZENIE LIMITU DLA KOŻUCHÓW MĘSKICH
        const isMenFurCoat = isMensFurCoat(product, productName);

        // 🚨 SPRAWDZENIE LIMITU DLA PRODUKTÓW DZIECIĘCYCH
        const isChildrenProduct = isChildrensFurCoat(product, productName) || isChildrensVest(product, productName);

        // Logika zaznaczania produktu bez logowania

        // Jeśli próbujemy zaznaczyć kurtkę skórzaną damską, sprawdź limit
        if (newSelection && isLeatherJacketWomen) {
            // Policz aktualnie zaznaczone kurtki skórzane damskie
            const currentWomenLeatherJackets = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isWomenLeatherJacket(selectedProduct, selectedProductName);
            }).length;

            if (currentWomenLeatherJackets >= 140) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 140 damskich kurtek skórzanych do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentWomenLeatherJackets}/140\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne damskie kurtki skórzane.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć kurtkę męską licówka, sprawdź limit
        if (newSelection && isLeatherJacketMen) {
            // Policz aktualnie zaznaczone kurtki męskie licówka
            const currentMenLeatherJackets = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isMenLeatherJacket(selectedProduct, selectedProductName);
            }).length;

            if (currentMenLeatherJackets >= 45) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 45 męskich kurtek licówka do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentMenLeatherJackets}/45\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne męskie kurtki licówka.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć kamizelkę licówka, sprawdź limit
        if (newSelection && isVest) {
            // Policz aktualnie zaznaczone kamizelki licówka
            const currentVests = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isVestLicowka(selectedProduct, selectedProductName);
            }).length;

            if (currentVests >= 10) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 10 kamizelek licówka do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentVests}/10\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne kamizelki licówka.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć kożuch damski, sprawdź limit
        if (newSelection && isWomenFurCoat) {
            // Policz aktualnie zaznaczone kożuchy damskie
            const currentWomenFurCoats = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isWomensFurCoat(selectedProduct, selectedProductName);
            }).length;

            if (currentWomenFurCoats >= 140) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 140 kożuchów damskich do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentWomenFurCoats}/140\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne kożuchy damskie.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć kożuch męski, sprawdź limit
        if (newSelection && isMenFurCoat) {
            // Policz aktualnie zaznaczone kożuchy męskie
            const currentMenFurCoats = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isMensFurCoat(selectedProduct, selectedProductName);
            }).length;

            if (currentMenFurCoats >= 45) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 45 kożuchów męskich do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentMenFurCoats}/45\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne kożuchy męskie.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć produkt R&B, sprawdź limit
        if (newSelection && isRB) {
            // Policz aktualnie zaznaczone produkty R&B
            const currentRBProducts = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isRBProduct(selectedProduct, selectedProductName);
            }).length;

            if (currentRBProducts >= 40) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 40 produktów R&B do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentRBProducts}/40\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne produkty R&B.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Jeśli próbujemy zaznaczyć produkt dziecięcy, sprawdź limit
        if (newSelection && isChildrenProduct) {
            // Policz aktualnie zaznaczone produkty dziecięce
            const currentChildrenProducts = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isChildrensFurCoat(selectedProduct, selectedProductName) || isChildrensVest(selectedProduct, selectedProductName);
            }).length;

            if (currentChildrenProducts >= 15) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 15 produktów dziecięcych do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentChildrenProducts}/15\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne produkty dziecięce.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            }
        }

        // Update in database
        await updatePrintSelection(productId, newSelection);

        // Update local selectedProducts state for compatibility
        setSelectedProducts((prevSelected) =>
            newSelection
                ? [...prevSelected.filter(p => p !== productName), productName] // Add
                : prevSelected.filter((p) => p !== productName) // Remove
        );

        // Update table array checkbox state
        setTableArray(prev => prev.map((row, rowIndex) => {
            if (row[2] === productName) {
                const newRow = [...row];
                newRow[0] = newSelection; // Update checkbox state
                return newRow;
            }
            return row;
        }));
    };

    // Handle select all products for printing - now persistent in database
    const handleSelectAllProducts = async () => {
        const currentFilteredProducts = filteredTableArray.map(row => row[2]); // Product name is now at index 2
        
        // Check if all filtered products are currently selected
        const allSelected = currentFilteredProducts.every(productName => {
            const product = products.find(p => p.fullName === productName);
            return product && persistentSelections[product.id];
        });

        const selections = currentFilteredProducts.map(productName => {
            const product = products.find(p => p.fullName === productName);
            return {
                productId: product?.id,
                isSelected: !allSelected // If all selected, deselect all; otherwise select all
            };
        }).filter(s => s.productId);

        // 🚨 SPRAWDZENIE LIMITU KURTEK SKÓRZANYCH DAMSKICH przy "Zaznacz wszystkie"
        if (!allSelected) {
            // Policz kurtki skórzane damskie w aktualnie filtrowanych produktach
            const womenLeatherJacketsInFiltered = currentFilteredProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isWomenLeatherJacket(product, productName);
            }).length;

            // Policz aktualnie zaznaczone kurtki skórzane damskie (nie w filtrowanej liście)
            const currentWomenLeatherJackets = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isWomenLeatherJacket(selectedProduct, selectedProductName) &&
                    !currentFilteredProducts.includes(selectedProductName); // Nie w aktualnej filtrowanej liście
            }).length;

            const totalWomenLeatherJackets = currentWomenLeatherJackets + womenLeatherJacketsInFiltered;

            // 🚨 SPRAWDZENIE LIMITU KURTEK MĘSKICH LICÓWKA przy "Zaznacz wszystkie"
            const menLeatherJacketsInFiltered = currentFilteredProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isMenLeatherJacket(product, productName);
            }).length;

            const currentMenLeatherJackets = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isMenLeatherJacket(selectedProduct, selectedProductName) &&
                    !currentFilteredProducts.includes(selectedProductName);
            }).length;

            const totalMenLeatherJackets = currentMenLeatherJackets + menLeatherJacketsInFiltered;

            // 🚨 SPRAWDZENIE LIMITU KAMIZELEK LICÓWKA przy "Zaznacz wszystkie"
            const vestsInFiltered = currentFilteredProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isVestLicowka(product, productName);
            }).length;

            const currentVests = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isVestLicowka(selectedProduct, selectedProductName) &&
                    !currentFilteredProducts.includes(selectedProductName);
            }).length;

            const totalVests = currentVests + vestsInFiltered;

            // Sprawdzenie limitów bez logowania
            
            // Sprawdź limit damskich kurtek
            if (totalWomenLeatherJackets > 140) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WSZYSTKICH PRODUKTÓW!\n\n` +
                     `Przekroczenie limitu damskich kurtek skórzanych:\n` +
                     `• W aktualnej liście: ${womenLeatherJacketsInFiltered}\n` +
                     `• Już zaznaczone: ${currentWomenLeatherJackets}\n` +
                     `• Łącznie po zaznaczeniu: ${totalWomenLeatherJackets}/140\n\n` +
                     `Maksymalny limit: 140 damskich kurtek skórzanych`);
                return; // BLOKUJ - nie kontynuuj zaznaczania wszystkich
            }

            // Sprawdź limit męskich kurtek
            if (totalMenLeatherJackets > 50) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WSZYSTKICH PRODUKTÓW!\n\n` +
                     `Przekroczenie limitu męskich kurtek licówka:\n` +
                     `• W aktualnej liście: ${menLeatherJacketsInFiltered}\n` +
                     `• Już zaznaczone: ${currentMenLeatherJackets}\n` +
                     `• Łącznie po zaznaczeniu: ${totalMenLeatherJackets}/50\n\n` +
                     `Maksymalny limit: 50 męskich kurtek licówka`);
                return; // BLOKUJ - nie kontynuuj zaznaczania wszystkich
            }

            // Sprawdź limit kamizelek licówka
            if (totalVests > 20) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WSZYSTKICH PRODUKTÓW!\n\n` +
                     `Przekroczenie limitu kamizelek licówka:\n` +
                     `• W aktualnej liście: ${vestsInFiltered}\n` +
                     `• Już zaznaczone: ${currentVests}\n` +
                     `• Łącznie po zaznaczeniu: ${totalVests}/20\n\n` +
                     `Maksymalny limit: 20 kamizelek licówka`);
                return; // BLOKUJ - nie kontynuuj zaznaczania wszystkich
            }

            // 🚨 SPRAWDZENIE LIMITU PRODUKTÓW R&B przy "Zaznacz wszystkie"
            const rbProductsInFiltered = currentFilteredProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isRBProduct(product, productName);
            }).length;

            const currentRBProducts = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isRBProduct(selectedProduct, selectedProductName) &&
                    !currentFilteredProducts.includes(selectedProductName);
            }).length;

            const totalRBProducts = currentRBProducts + rbProductsInFiltered;

            // Sprawdź limit produktów R&B
            if (totalRBProducts > 40) {
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WSZYSTKICH PRODUKTÓW!\n\n` +
                     `Przekroczenie limitu produktów R&B:\n` +
                     `• W aktualnej liście: ${rbProductsInFiltered}\n` +
                     `• Już zaznaczone: ${currentRBProducts}\n` +
                     `• Łącznie po zaznaczeniu: ${totalRBProducts}/40\n\n` +
                     `Maksymalny limit: 40 produktów R&B`);
                return; // BLOKUJ - nie kontynuuj zaznaczania wszystkich
            }
        }

        // Update in database
        try {
            await axios.post('/api/goods/print-selections', { selections });
            
            // Update local states
            const newSelections = { ...persistentSelections };
            selections.forEach(({ productId, isSelected }) => {
                newSelections[productId] = isSelected;
            });
            setPersistentSelections(newSelections);

            if (allSelected) {
                setSelectedProducts([]); // Deselect all
            } else {
                setSelectedProducts(currentFilteredProducts); // Select all
            }

            // 📊 STATYSTYKI PO "ZAZNACZ WSZYSTKIE"
            setTimeout(() => {
                const newSelectedProducts = allSelected ? [] : currentFilteredProducts;
                const totalSelected = newSelectedProducts.length;
                const womenLeatherSelected = newSelectedProducts.filter(productName => {
                    const product = products.find(p => p.fullName === productName);
                    return isWomenLeatherJacket(product, productName);
                }).length;
                
                const menLeatherSelected = newSelectedProducts.filter(productName => {
                    const product = products.find(p => p.fullName === productName);
                    return isMenLeatherJacket(product, productName);
                }).length;

                const vestsSelected = newSelectedProducts.filter(productName => {
                    const product = products.find(p => p.fullName === productName);
                    return isVestLicowka(product, productName);
                }).length;

                const rbSelected = newSelectedProducts.filter(productName => {
                    const product = products.find(p => p.fullName === productName);
                    return isRBProduct(product, productName);
                }).length;
                
                // Statystyki po zaznaczeniu wszystkich (bez logowania)
            }, 100);

            // Update table array
            setTableArray(prev => prev.map(row => {
                const product = products.find(p => p.fullName === row[2]);
                if (product && currentFilteredProducts.includes(row[2])) {
                    const newRow = [...row];
                    newRow[0] = !allSelected; // Update checkbox state
                    return newRow;
                }
                return row;
            }));

        } catch (error) {
            console.error('Error updating bulk selections:', error);
        }
    };

    // Handle printing page 1 - Kurtki skórzane damskie i męskie
    const handlePrintPage1 = () => {
        if (selectedProducts.length === 0) {
            alert('Nie zaznaczono żadnych produktów do wydruku!');
            return;
        }
        
        // Pobierz wszystkie zaznaczone produkty (damskie i męskie)
        const leatherJackets = selectedProducts.filter(productName => {
            // Sprawdź czy produkt jest w kategorii kurtek skórzanych
            const productData = products.find(p => p.fullName === productName);
            return productData; // Wszystkie zaznaczone produkty
        });
        
        if (leatherJackets.length === 0) {
            alert('Brak zaznaczonych kurtek do wydruku!');
            return;
        }
        
        // Zlicz kurtki damskie i męskie
        const womenCount = leatherJackets.filter(productName => {
            const productData = products.find(p => p.fullName === productName);
            return productData && productData.plec === 'D';
        }).length;
        
        const menCount = leatherJackets.filter(productName => {
            const productData = products.find(p => p.fullName === productName);
            return productData && productData.plec === 'M';
        }).length;
        
        // Utwórz dane do wydruku - damskie po lewej, męskie po prawej
        const printData = {
            title: 'Kurtki Skórzane - Damskie i Męskie',
            products: leatherJackets,
            layout: 'split-view' // Dwie sekcje na jednej kartce
        };
        
        // Zapisz dane do sessionStorage dla funkcji drukowania
        sessionStorage.setItem('printPage1Data', JSON.stringify(printData));
        
        const printContent = generatePrintPage1HTML(leatherJackets);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Próba ustawienia domyślnej liczby kopii na 6
        printWindow.addEventListener('beforeprint', () => {
            try {
                // Dla niektórych przeglądarek można ustawić domyślną liczbę kopii
                if (printWindow.print.copies !== undefined) {
                    printWindow.print.copies = 6;
                }
            } catch (error) {
                // Błąd ustawiania liczby kopii
            }
        });
        
        printWindow.print();
        printWindow.close();
    };
    
    // Funkcja pomocnicza do zamiany MAGAZYN na X i dodania odstępów wokół /
    const formatCellContent = (content) => {
        if (!content || typeof content !== 'string') return content || '';
        return content
            .replace(/MAGAZYN/g, 'X')
            .replace(/\//g, ' / '); // Dodaj spacje wokół ukośników dla lepszej czytelności
    };
    
    // Funkcja generująca HTML dla strony 1 (dwie sekcje: damskie po lewej, męskie po prawej)
    const generatePrintPage1HTML = (leatherJackets) => {

        // Filtruj zaznaczone produkty z danych tabeli
        const printTableData = filteredTableArray.filter(row => 
            leatherJackets.includes(row[2]) // row[2] to nazwa produktu
        );
        


        // Rozdziel na kurtki damskie i męskie na podstawie podkategorii z danych produktów
        const womenJackets = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // WYKLUCZENIE: Jeśli to produkt R&B, nie licz go jako damska kurtka licówka (ma własną sekcję)
            if (isRBProduct(productData, row[2])) {
                return false;
            }
            
            // Damskie: sprawdź podkategorię "Kurtka skórzana damska" lub "Kurtka damska licówka"
            return productData.subcategory && 
                   typeof productData.subcategory === 'object' &&
                   (productData.subcategory.Kat_1_Opis_1 === 'Kurtka skórzana damska' ||
                    productData.subcategory.Kat_1_Opis_1 === 'Kurtka damska licówka');
        });
        
        const menJackets = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // Wyklucz produkty R&B - one mają swoją osobną sekcję
            if (productData.manufacturer === '68eebc6478015550b96ae903' ||
                (productData.manufacturer && 
                 typeof productData.manufacturer === 'object' &&
                 productData.manufacturer.Prod_Opis === 'R&B')) {
                return false;
            }
            
            // Męskie: sprawdź podkategorię "Kurtka męska licówka"
            return productData.subcategory && 
                   typeof productData.subcategory === 'object' &&
                   productData.subcategory.Kat_1_Opis_1 === 'Kurtka męska licówka';
        }).slice(0, 45); // LIMIT 45 kurtek męskich

        // Filtruj kamizelki licówka (męskie i damskie)
        const kamizelki = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // Kamizelki: sprawdź podkategorię "Kamizelka damska licówka" lub "Kamizelka męska licówka"
            return productData.category === 'Kurtki kożuchy futra' && 
                   productData.subcategory && 
                   typeof productData.subcategory === 'object' &&
                   (productData.subcategory.Kat_1_Opis_1 === 'Kamizelka damska licówka' ||
                    productData.subcategory.Kat_1_Opis_1 === 'Kamizelka męska licówka');
        });

        // Filtruj produkty R&B
        const rbProducts = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // R&B: sprawdź producenta R&B (ID: 68eebc6478015550b96ae903)
            return productData.manufacturer === '68eebc6478015550b96ae903' ||
                   (productData.manufacturer && 
                    typeof productData.manufacturer === 'object' &&
                    productData.manufacturer.Prod_Opis === 'R&B');
        });



        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Kurtki Skórzane - Damskie i Męskie</title>
            <!-- DOMYŚLNIE: Ustaw liczbę kopii na 6 w oknie drukowania -->
            <style>
                @page {
                    size: A4;
                    margin: 10mm;
                }
                
                /* Globalne wymuszenie kolorów tła */
                * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                @media print {
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 8px;
                        line-height: 1.1;
                        margin: 0;
                        padding: 0;
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.1;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    gap: 10px;
                }
                .section {
                    width: 48%;
                    float: left;
                }
                .section-left {
                    float: left;
                    clear: left;
                }
                .section-right {
                    float: right;
                    clear: right;
                }
                .section-title {
                    font-size: 9px;
                    font-weight: bold;
                    margin: 0;
                    padding: 0;
                    line-height: 1.0;
                    margin-bottom: 2px;
                    color: black;
                    text-align: center;
                }
                .header {
                    text-align: center;
                    font-weight: bold;
                    font-size: 10px;
                    color: black;
                    margin-bottom: 10px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 7px;
                    border-spacing: 0;
                    margin: 0;
                    margin-bottom: 5px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 0.5px;
                    text-align: center;
                    vertical-align: middle;
                    line-height: 1.0;
                    height: auto;
                    font-weight: 600;
                    font-size: 6px;
                }
                th {
                    background-color: #495057;
                    color: black;
                    font-weight: bold;
                    font-size: 7px;
                }
                .product-name {
                    text-align: left;
                    font-size: 6px;
                    max-width: 60px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-transform: uppercase;
                    font-weight: bold;
                }
                .size-cell {
                    min-width: 12px;
                    font-size: 6px;
                    background-color: white !important;
                }
                /* Kolorowe ramki dla rozmiarów - tylko lewo i prawo dla wszystkich */
                .size-xs { 
                    border-left: 2px solid orange; 
                    border-right: 2px solid orange; 
                }
                .size-m { 
                    border-left: 2px solid blue; 
                    border-right: 2px solid blue; 
                }
                .size-xl { 
                    border-left: 2px solid black; 
                    border-right: 2px solid black; 
                }
                .size-3xl { 
                    border-left: 2px solid red; 
                    border-right: 2px solid red; 
                }
                .size-5xl { 
                    border-left: 2px solid green; 
                    border-right: 2px solid green; 
                }
                .size-7xl { 
                    border-left: 2px solid yellow; 
                    border-right: 2px solid yellow; 
                }
                
                /* Bordery górne dla nagłówków */
                th.size-xs { border-top: 2px solid orange; }
                th.size-m { border-top: 2px solid blue; }
                th.size-xl { border-top: 2px solid black; }
                th.size-3xl { border-top: 2px solid red; }
                th.size-5xl { border-top: 2px solid green; }
                th.size-7xl { border-top: 2px solid yellow; }
                
                /* Bordery dolne dla ostatniego rzędu */
                tr:last-child .size-xs { border-bottom: 2px solid orange; }
                tr:last-child .size-m { border-bottom: 2px solid blue; }
                tr:last-child .size-xl { border-bottom: 2px solid black; }
                tr:last-child .size-3xl { border-bottom: 2px solid red; }
                tr:last-child .size-5xl { border-bottom: 2px solid green; }
                tr:last-child .size-7xl { border-bottom: 2px solid yellow; }
                
                /* Zapewnienie czytelności tekstu na kolorowych tłach */
                tr[style*="background-color"] td {
                    color: black !important;
                    text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
                }
                
                /* WYMUSZENIE KOLORÓW TŁA W WYDRUKU */
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* WAŻNE: Wymuszenie kolorów dla tr i td */
                    table tr[style*="background-color"] {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    table tr {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    table td {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                
                /* WYMUSZENIE KOLORÓW dla wszystkich elementów */
                * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* WYMUSZENIE KOLORÓW dla wierszy tabeli */
                tr {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            </style>
        </head>
        <body>
            <!-- Sekcja górna lewa: Kurtki damskie -->
            <div class="section section-left">
                <div class="section-title">Kurtki skórzane damskie licówka</div>
                <table>
                    <thead>
                        <tr>
                            <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                                <th class="size-cell">XXS/32</th>
                            <th class="size-cell size-xs">XS/34</th>
                            <th class="size-cell">S/36</th>
                            <th class="size-cell size-m">M/38</th>
                            <th class="size-cell">L/40</th>
                            <th class="size-cell size-xl">XL/42</th>
                            <th class="size-cell">2XL/44</th>
                            <th class="size-cell size-3xl">3XL/46</th>
                            <th class="size-cell">4XL/48</th>
                            <th class="size-cell size-5xl">5XL/50</th>
                            <th class="size-cell">6XL/52</th>
                            <th class="size-cell size-7xl">7XL/54</th>
                            <th class="size-cell">8XL/56</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${womenJackets.map((row, rowIndex) => {
                            const bgColor = row[1] || '#ffffff';
                            const isDark = isColorDark(bgColor);
                            return `
                            <tr style="
                                background-color: ${bgColor} !important; 
                                background: ${bgColor} !important;
                                color: ${isDark ? '#ffffff' : '#000000'} !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            ">
                                <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Sekcja górna prawa: Kurtki męskie -->
            <div class="section section-right">
                <div class="section-title">Kurtki skórzane męskie licówka</div>
                <table>
                    <thead>
                        <tr>
                            <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                            <th class="size-cell">XXS/44</th>
                            <th class="size-cell size-xs">XS/46</th>
                            <th class="size-cell">S/48</th>
                            <th class="size-cell size-m">M/50</th>
                            <th class="size-cell">L/52</th>
                            <th class="size-cell size-xl">XL/54</th>
                            <th class="size-cell">2XL/56</th>
                            <th class="size-cell size-3xl">3XL/58</th>
                            <th class="size-cell">4XL/60</th>
                            <th class="size-cell size-5xl">5XL/62</th>
                            <th class="size-cell">6XL/64</th>
                            <th class="size-cell size-7xl">7XL/66</th>
                            <th class="size-cell">8XL/66</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${menJackets.map((row, rowIndex) => {
                            const bgColor = row[1] || '#ffffff';
                            const isDark = isColorDark(bgColor);
                            return `
                            <tr style="
                                background-color: ${bgColor} !important; 
                                background: ${bgColor} !important;
                                color: ${isDark ? '#ffffff' : '#000000'} !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            ">
                                <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <!-- Kamizelki licówka pod męskimi -->
                <div style="margin-top: 15px;">
                    <div class="section-title">Kamizelki licówka</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                                <th class="size-cell">XXS/32</th>
                                <th class="size-cell size-xs">XS/34</th>
                                <th class="size-cell">S/36</th>
                                <th class="size-cell size-m">M/38</th>
                                <th class="size-cell">L/40</th>
                                <th class="size-cell size-xl">XL/42</th>
                                <th class="size-cell">2XL/44</th>
                                <th class="size-cell size-3xl">3XL/46</th>
                                <th class="size-cell">4XL/48</th>
                                <th class="size-cell size-5xl">5XL/50</th>
                                <th class="size-cell">6XL/52</th>
                                <th class="size-cell size-7xl">7XL/54</th>
                                <th class="size-cell">8XL/56</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${kamizelki.map((row, rowIndex) => {
                                const bgColor = row[1] || '#ffffff';
                                const isDark = isColorDark(bgColor);
                                return `
                                <tr style="
                                    background-color: ${bgColor} !important; 
                                    background: ${bgColor} !important;
                                    color: ${isDark ? '#ffffff' : '#000000'} !important;
                                    -webkit-print-color-adjust: exact !important;
                                    color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                ">
                                    <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                    <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                    <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                    <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                    <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                    <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                    <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- R&B pod kamizelkami -->
                <div style="margin-top: 15px;">
                    <div class="section-title">R&B</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                                <th class="size-cell">XXS/32</th>
                                <th class="size-cell size-xs">XS/34</th>
                                <th class="size-cell">S/36</th>
                                <th class="size-cell size-m">M/38</th>
                                <th class="size-cell">L/40</th>
                                <th class="size-cell size-xl">XL/42</th>
                                <th class="size-cell">2XL/44</th>
                                <th class="size-cell size-3xl">3XL/46</th>
                                <th class="size-cell">4XL/48</th>
                                <th class="size-cell size-5xl">5XL/50</th>
                                <th class="size-cell">6XL/52</th>
                                <th class="size-cell size-7xl">7XL/54</th>
                                <th class="size-cell">8XL/56</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rbProducts.map((row, rowIndex) => {
                                const bgColor = row[1] || '#ffffff';
                                const isDark = isColorDark(bgColor);
                                return `
                                <tr style="
                                    background-color: ${bgColor} !important; 
                                    background: ${bgColor} !important;
                                    color: ${isDark ? '#ffffff' : '#000000'} !important;
                                    -webkit-print-color-adjust: exact !important;
                                    color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                ">
                                    <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                    <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                    <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                    <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                    <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                    <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                    <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Tabela punktów sprzedaży pod R&B -->
                <div style="margin-top: 15px;">
                    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; width: 25%; background-color: #ffffff !important;">KRUPÓWKI</th>
                                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; width: 25%; background-color: #ffffff !important;">TATA</th>
                                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; width: 25%; background-color: #ffffff !important;">MOST</th>
                                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; width: 25%; background-color: #ffffff !important;">PARZYGNAT</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                                <td style="border: 1px solid #000; padding: 4px; height: 15px;">&nbsp;</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
        `;
    };

    // Funkcja generująca HTML dla strony 2 (kożuchy damskie po lewej, męskie + dziecięce po prawej)
    const generatePrintPage2HTML = () => {

        // Filtruj zaznaczone produkty z danych tabeli
        const printTableData = filteredTableArray.filter(row => 
            selectedProducts.includes(row[2]) // row[2] to nazwa produktu
        );

        // Filtruj kożuchy damskie (podkategoria "Kożuch damski") - LIMIT 140
        const womensFurCoats = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // Kożuchy damskie: sprawdź podkategorię "Kożuch damski"
            return productData.subcategory && 
                   typeof productData.subcategory === 'object' &&
                   productData.subcategory.Kat_1_Opis_1 === 'Kożuch damski';
        }).slice(0, 140); // LIMIT 140 produktów

        // Filtruj kożuchy męskie (podkategoria "Kożuch męski") - LIMIT 45
        const mensFurCoats = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // Kożuchy męskie: sprawdź podkategorię "Kożuch męski"
            return productData.subcategory && 
                   typeof productData.subcategory === 'object' &&
                   productData.subcategory.Kat_1_Opis_1 === 'Kożuch męski ';
        }).slice(0, 45); // LIMIT 45 kożuchów męskich

        // Filtruj produkty dziecięce (kożuchy + kamizelki) - LIMIT 15
        const childrenProducts = printTableData.filter(row => {
            const productData = products.find(p => p.fullName === row[2]);
            if (!productData) return false;
            
            // Użyj isChildrensFurCoat i isChildrensVest zamiast własnego filtra
            return isChildrensFurCoat(productData, row[2]) || isChildrensVest(productData, row[2]);
        }).slice(0, 15); // LIMIT 15 produktów dziecięcych

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Kożuchy Damskie i Męskie</title>
            <!-- DOMYŚLNIE: Ustaw liczbę kopii na 6 w oknie drukowania -->
            <style>
                @page {
                    size: A4;
                    margin: 10mm;
                }
                
                /* Globalne wymuszenie kolorów tła */
                * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                @media print {
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 8px;
                        line-height: 1.1;
                        margin: 0;
                        padding: 0;
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 8px;
                    line-height: 1.1;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    gap: 10px;
                }
                .section {
                    width: 48%;
                    float: left;
                }
                .section-left {
                    float: left;
                    clear: left;
                }
                .section-right {
                    float: right;
                    clear: right;
                }
                .section-title {
                    font-size: 9px;
                    font-weight: bold;
                    margin: 0;
                    padding: 0;
                    line-height: 1.0;
                    margin-bottom: 2px;
                    color: black;
                    text-align: center;
                }
                .header {
                    text-align: center;
                    font-weight: bold;
                    font-size: 10px;
                    color: black;
                    margin-bottom: 10px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 7px;
                    border-spacing: 0;
                    margin: 0;
                    margin-bottom: 5px;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 0.5px;
                    text-align: center;
                    vertical-align: middle;
                    line-height: 1.0;
                    height: auto;
                    font-weight: 600;
                    font-size: 6px;
                }
                th {
                    background-color: #495057;
                    color: black;
                    font-weight: bold;
                    font-size: 7px;
                }
                .product-name {
                    text-align: left;
                    font-size: 6px;
                    max-width: 60px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    text-transform: uppercase;
                    font-weight: bold;
                }
                .size-cell {
                    min-width: 12px;
                    font-size: 6px;
                    background-color: white !important;
                }
                /* Kolorowe ramki dla rozmiarów - tylko lewo i prawo dla wszystkich */
                .size-xs { 
                    border-left: 2px solid orange; 
                    border-right: 2px solid orange; 
                }
                .size-m { 
                    border-left: 2px solid blue; 
                    border-right: 2px solid blue; 
                }
                .size-xl { 
                    border-left: 2px solid black; 
                    border-right: 2px solid black; 
                }
                .size-3xl { 
                    border-left: 2px solid red; 
                    border-right: 2px solid red; 
                }
                .size-5xl { 
                    border-left: 2px solid green; 
                    border-right: 2px solid green; 
                }
                .size-7xl { 
                    border-left: 2px solid yellow; 
                    border-right: 2px solid yellow; 
                }
                
                /* Bordery górne dla nagłówków */
                th.size-xs { border-top: 2px solid orange; }
                th.size-m { border-top: 2px solid blue; }
                th.size-xl { border-top: 2px solid black; }
                th.size-3xl { border-top: 2px solid red; }
                th.size-5xl { border-top: 2px solid green; }
                th.size-7xl { border-top: 2px solid yellow; }
                
                /* Bordery dolne dla ostatniego rzędu */
                tr:last-child .size-xs { border-bottom: 2px solid orange; }
                tr:last-child .size-m { border-bottom: 2px solid blue; }
                tr:last-child .size-xl { border-bottom: 2px solid black; }
                tr:last-child .size-3xl { border-bottom: 2px solid red; }
                tr:last-child .size-5xl { border-bottom: 2px solid green; }
                tr:last-child .size-7xl { border-bottom: 2px solid yellow; }
                
                /* Zapewnienie czytelności tekstu na kolorowych tłach */
                tr[style*="background-color"] td {
                    color: black !important;
                    text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
                }
                
                /* WYMUSZENIE KOLORÓW TŁA W WYDRUKU */
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    html, body {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* WAŻNE: Wymuszenie kolorów dla tr i td */
                    table tr[style*="background-color"] {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    table tr {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    table td {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                
                /* WYMUSZENIE KOLORÓW dla wszystkich elementów */
                * {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                /* WYMUSZENIE KOLORÓW dla wierszy tabeli */
                tr {
                    -webkit-print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            </style>
        </head>
        <body>
            <style>
                /* Style dla rozmiarów dziecięcych */
                .size-104 { 
                    border-left: 2px solid blue; 
                    border-right: 2px solid blue; 
                }
                .size-128 { 
                    border-left: 2px solid black; 
                    border-right: 2px solid black; 
                }
                .size-152 { 
                    border-left: 2px solid red; 
                    border-right: 2px solid red; 
                }
                th.size-104 { border-top: 2px solid blue; }
                th.size-128 { border-top: 2px solid black; }
                th.size-152 { border-top: 2px solid red; }
                tr:last-child .size-104 { border-bottom: 2px solid blue; }
                tr:last-child .size-128 { border-bottom: 2px solid black; }
                tr:last-child .size-152 { border-bottom: 2px solid red; }
            </style>
            
            <!-- Sekcja lewa: Kożuchy damskie -->
            <div class="section section-left">
                <div class="section-title">Kożuchy damskie</div>
                <table>
                    <thead>
                        <tr>
                            <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                                <th class="size-cell">XXS/32</th>
                            <th class="size-cell size-xs">XS/34</th>
                            <th class="size-cell">S/36</th>
                            <th class="size-cell size-m">M/38</th>
                            <th class="size-cell">L/40</th>
                            <th class="size-cell size-xl">XL/42</th>
                            <th class="size-cell">2XL/44</th>
                            <th class="size-cell size-3xl">3XL/46</th>
                            <th class="size-cell">4XL/48</th>
                            <th class="size-cell size-5xl">5XL/50</th>
                            <th class="size-cell">6XL/52</th>
                            <th class="size-cell size-7xl">7XL/54</th>
                            <th class="size-cell">8XL/56</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${womensFurCoats.map((row, rowIndex) => {
                            const bgColor = row[1] || '#ffffff';
                            const isDark = isColorDark(bgColor);
                            return `
                            <tr style="
                                background-color: ${bgColor} !important; 
                                background: ${bgColor} !important;
                                color: ${isDark ? '#ffffff' : '#000000'} !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            ">
                                <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Sekcja prawa: Kożuchy męskie -->
            <div class="section section-right">
                <div class="section-title">Kożuchy męskie</div>
                <table>
                    <thead>
                        <tr>
                            <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                            <th class="size-cell">XXS/44</th>
                            <th class="size-cell size-xs">XS/46</th>
                            <th class="size-cell">S/48</th>
                            <th class="size-cell size-m">M/50</th>
                            <th class="size-cell">L/52</th>
                            <th class="size-cell size-xl">XL/54</th>
                            <th class="size-cell">2XL/56</th>
                            <th class="size-cell size-3xl">3XL/58</th>
                            <th class="size-cell">4XL/60</th>
                            <th class="size-cell size-5xl">5XL/62</th>
                            <th class="size-cell">6XL/64</th>
                            <th class="size-cell size-7xl">7XL/66</th>
                            <th class="size-cell">8XL/66</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mensFurCoats.map((row, rowIndex) => {
                            const bgColor = row[1] || '#ffffff';
                            const isDark = isColorDark(bgColor);
                            return `
                            <tr style="
                                background-color: ${bgColor} !important; 
                                background: ${bgColor} !important;
                                color: ${isDark ? '#ffffff' : '#000000'} !important;
                                -webkit-print-color-adjust: exact !important;
                                color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            ">
                                <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                <td class="size-cell size-xs" style="background-color: ${bgColor} !important;">${formatCellContent(row[5])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                <td class="size-cell size-m" style="background-color: ${bgColor} !important;">${formatCellContent(row[7])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                <td class="size-cell size-xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[9])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                <td class="size-cell size-3xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[11])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                <td class="size-cell size-5xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[13])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                <td class="size-cell size-7xl" style="background-color: ${bgColor} !important;">${formatCellContent(row[15])}</td>
                                <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[16])}</td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>

                <!-- Sekcja dziecięca pod kożuchami męskimi -->
                <div style="margin-top: 15px;">
                    <div class="section-title">Kamizelki i kożuchy dziecięce</div>
                    <table>
                        <thead>
                            <tr>
                                <th class="product-name" style="background-color: #ffffff !important;">Nazwa</th>
                                <th class="size-cell">92</th>
                                <th class="size-cell size-104">104</th>
                                <th class="size-cell">116</th>
                                <th class="size-cell size-128">128</th>
                                <th class="size-cell">140</th>
                                <th class="size-cell size-152">152</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${childrenProducts.map((row, rowIndex) => {
                                const bgColor = row[1] || '#ffffff';
                                const isDark = isColorDark(bgColor);
                                return `
                                <tr style="
                                    background-color: ${bgColor} !important; 
                                    background: ${bgColor} !important;
                                    color: ${isDark ? '#ffffff' : '#000000'} !important;
                                    -webkit-print-color-adjust: exact !important;
                                    color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                ">
                                    <td class="product-name" style="background-color: ${bgColor} !important; color: #000000 !important;">${row[2]}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[4])}</td>
                                    <td class="size-cell size-104" style="background-color: ${bgColor} !important;">${formatCellContent(row[6])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[8])}</td>
                                    <td class="size-cell size-128" style="background-color: ${bgColor} !important;">${formatCellContent(row[10])}</td>
                                    <td class="size-cell" style="background-color: ${bgColor} !important;">${formatCellContent(row[12])}</td>
                                    <td class="size-cell size-152" style="background-color: ${bgColor} !important;">${formatCellContent(row[14])}</td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </body>
        </html>
        `;
    };

    // Handle printing page 2
    const handlePrintPage2 = () => {
        if (selectedProducts.length === 0) {
            alert('Nie zaznaczono żadnych produktów do wydruku!');
            return;
        }
        
        // Utwórz dane do wydruku - kożuchy damskie po lewej, męskie po prawej
        const printData = {
            title: 'Kożuchy Damskie i Męskie',
            products: selectedProducts,
            layout: 'split-view' // Dwie sekcje na jednej kartce
        };
        
        // Zapisz dane do sessionStorage dla funkcji drukowania
        sessionStorage.setItem('printPage2Data', JSON.stringify(printData));
        
        const printContent = generatePrintPage2HTML();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Próba ustawienia domyślnej liczby kopii na 6
        printWindow.addEventListener('beforeprint', () => {
            try {
                // Dla niektórych przeglądarek można ustawić domyślną liczbę kopii
                if (printWindow.print.copies !== undefined) {
                    printWindow.print.copies = 6;
                }
            } catch (error) {
                // Błąd ustawiania liczby kopii
            }
        });
        
        printWindow.print();
        printWindow.close();
    };

    const filteredTableArray = tableArray.map((row) => {
        const matchesSearchQuery = row[2]?.toLowerCase().includes(searchQuery); // Product name is now at index 2

        // Filter each cell to show only selected symbols, excluding checkbox, new column and product name columns
        const filteredRow = row.map((cell, colIndex) => {
            // Checkbox state based on persistent database selection
            if (colIndex === 0) {
                const product = products.find(p => p.fullName === row[2]);
                return product ? (persistentSelections[product.id] || false) : false;
            }
            if (colIndex === 1) return cell; // New column
            if (colIndex === 2) return cell; // Always include product name column
            if (colIndex === 3 || !cell) return cell; // Skip Plec or empty cells
            if (selectedSymbols.length === 0) return cell; // Show all symbols if no checkboxes are selected

            const cellSymbols = cell.split('/'); // Split cell content by '/'
            const matchingSymbols = cellSymbols.filter((symbol) => selectedSymbols.includes(symbol));
            return matchingSymbols.join('/') || null; // Join matching symbols or return null if none match
        });

        // Check if the row has any visible symbols after filtering (excluding checkbox, new column, product name, and plec columns)
        const hasVisibleSymbols = selectedSymbols.length === 0 || filteredRow.some((cell, colIndex) => colIndex > 3 && cell);

        return matchesSearchQuery && hasVisibleSymbols ? filteredRow : null; // Keep the row if it matches the search query and has visible symbols
    }).filter(row => row !== null);

    if (loading) {
        return (
            <div
                className="spinner-container"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'black',
                }}
            >
                <div
                    className="spinner-border"
                    role="status"
                    style={{
                        color: 'white',
                        width: '3rem',
                        height: '3rem',
                    }}
                >
                    <span className="sr-only"></span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* CSS dla ukrycia kolumny kolorów w trybie print */}
            <style>
                {`
                    @media print {
                        /* Ukryj tylko color picker inputy w print, nie całą kolumnę */
                        .color-picker-column input[type="color"] {
                            display: none !important;
                        }
                    }
                    
                    /* Style dla checkboxów - powiększone z cursor pointer */
                    input[type="checkbox"] {
                        width: 18px !important;
                        height: 18px !important;
                        cursor: pointer !important;
                        transform: scale(1.2);
                        margin: 2px;
                    }
                    
                    /* Style dla labeli przy checkboxach */
                    label {
                        cursor: pointer !important;
                    }
                    
                    /* Dodatkowy margines dla komórek z checkboxami */
                    td input[type="checkbox"] {
                        margin: 4px;
                    }
                `}
            </style>
            <div className="container mt-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
                <button
                    className="btn btn-success btn-sm"
                    onClick={handlePrintPage1}
                    style={{ marginRight: '5px' }}
                    disabled={selectedProducts.length === 0}
                >
                    Drukuj stronę 1 ({selectedProducts.length})
                </button>
                <button
                    className="btn btn-success btn-sm"
                    onClick={handlePrintPage2}
                    style={{ marginRight: '10px' }}
                    disabled={selectedProducts.length === 0}
                >
                    Drukuj stronę 2 ({selectedProducts.length})
                </button>
                <button
                    className="btn btn-warning btn-sm"
                    onClick={handleResetColors}
                    style={{ marginRight: '10px' }}
                    title="Resetuj wszystkie kolory do białego"
                >
                    Resetuj kolory
                </button>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Szukaj w tabeli..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{ maxWidth: '300px', marginRight: '10px' }}
                />
                <div style={{ marginLeft: '10px' }}>
                    {symbols.map((symbol) => (
                        <div key={symbol} style={{ display: 'inline-block', marginRight: '10px' }}>
                            <input
                                type="checkbox"
                                id={`symbol-${symbol}`}
                                checked={selectedSymbols.includes(symbol)}
                                onChange={() => handleSymbolChange(symbol)}
                            />
                            <label htmlFor={`symbol-${symbol}`} style={{ marginLeft: '5px' }}>
                                Pokaż {symbol}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            <table className="table table-bordered text-center" style={{ backgroundColor: 'black' }}>
                <thead style={{ 
                    backgroundColor: '#495057',
                    fontSize: '18px',
                    fontWeight: 'bold'
                }}>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                checked={filteredTableArray.length > 0 && filteredTableArray.every(row => {
                                    const product = products.find(p => p.fullName === row[2]);
                                    return product && persistentSelections[product.id];
                                })}
                                onChange={handleSelectAllProducts}
                                title="Zaznacz/Odznacz wszystkie do wydruku"
                            />
                        </th>
                        <th className="color-picker-column">Kolor</th>
                        <th>Rozmiary męskie</th>
                        <th>XXS/40</th>
                        <th
                            style={{
                                borderLeft: '3px solid orange',
                                borderRight: '3px solid orange',
                                borderTop: '3px solid orange',
                            }}
                        >
                            XS/42
                        </th>
                        <th>S/44</th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                                borderTop: '3px solid blue',
                            }}
                        >
                            M/48
                        </th>
                        <th>L/50</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                                borderTop: '3px solid white',
                            }}
                        >
                            XL/52
                        </th>
                        <th>2XL/54</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                                borderTop: '3px solid red',
                            }}
                        >
                            3XL/56
                        </th>
                        <th>4XL/58</th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                                borderTop: '3px solid green',
                            }}
                        >
                            5XL/60
                        </th>
                        <th>6XL/62</th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                                borderTop: '3px solid yellow',
                            }}
                        >
                            7XL/64
                        </th>
                        <th>8XL/66</th>
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Rozmiary damskie</th>
                        <th>XXS/32</th>
                        <th
                            style={{
                                borderLeft: '3px solid orange',
                                borderRight: '3px solid orange',
                            }}
                        >
                            XS/34
                        </th>
                        <th>S/36</th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                            }}
                        >
                            M/38
                        </th>
                        <th>L/40</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                            }}
                        >
                            XL/42
                        </th>
                        <th>2XL/44</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                            }}
                        >
                            3XL/46
                        </th>
                        <th>4XL/48</th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                            }}
                        >
                            5XL/50
                        </th>
                        <th>6XL/52</th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                            }}
                        >
                            7XL/54
                        </th>
                        <th>8XL/56</th>
                    </tr>
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Rozmiary dziecięce</th>
                        <th></th>
                        <th style={{
                            borderLeft: '3px solid orange',
                            borderRight: '3px solid orange',
                        }}
                        ></th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                            }}
                        >
                            104
                        </th>
                        <th>116</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                            }}
                        >128</th>
                        <th>140</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                            }}
                        >152</th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                            }}
                        ></th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                            }}
                        ></th>
                        <th></th>
                    </tr>
                </thead>
                <tbody style={{
                    fontSize: '15px',
                    fontWeight: '600'
                }}>
                    {filteredTableArray.map((row, rowIndex) => {
                        const bgColor = row[1] || '#ffffff';
                        const isDark = isColorDark(bgColor);
                        
                        return (
                            <tr 
                                key={rowIndex}
                                style={{
                                    backgroundColor: bgColor, // Apply background color from color picker
                                    transition: 'background-color 0.3s ease', // Smooth color transition
                                    color: isDark ? '#ffffff' : '#000000', // White text on dark bg, black on light bg
                                    textShadow: isDark ? '1px 1px 1px rgba(0,0,0,0.8)' : '1px 1px 1px rgba(255,255,255,0.8)' // Appropriate text shadow
                                }}
                            >
                            {row.map((cell, colIndex) => {
                                if (colIndex === 3) return null; // Skip the Plec column (index 3)
                                
                                if (colIndex === 0) {
                                    // Checkbox column
                                    return (
                                        <td key={colIndex}>
                                            <input
                                                type="checkbox"
                                                checked={(() => {
                                                    const product = products.find(p => p.fullName === row[2]);
                                                    return product ? (persistentSelections[product.id] || false) : false;
                                                })()}
                                                onChange={() => handleProductCheckboxChange(row[2])}
                                                title="Zaznacz do wydruku"
                                            />
                                        </td>
                                    );
                                }
                                
                                if (colIndex === 1) {
                                    // Color picker column
                                    return (
                                        <td key={colIndex} className="color-picker-column" style={{ 
                                            padding: '2px', 
                                            textAlign: 'center'
                                        }}>
                                            <input
                                                type="color"
                                                value={row[1] || '#ffffff'}
                                                onChange={(e) => handleColorChange(row[2], e.target.value)}
                                                style={{
                                                    width: '30px',
                                                    height: '25px',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Wybierz kolor dla wydruku"
                                            />
                                        </td>
                                    );
                                }
                                
                                return (
                                    <td
                                        key={colIndex}
                                        style={{
                                            backgroundColor: colIndex === 16 ? 'black' : '', // Set background color for column 16 (8XL)
                                            borderLeft: colIndex === 5 ? '3px solid orange' :
                                                        colIndex === 7 ? '3px solid blue' :
                                                        colIndex === 9 ? '3px solid white' :
                                                        colIndex === 11 ? '3px solid red' :
                                                        colIndex === 13 ? '3px solid green' :
                                                        colIndex === 15 ? '3px solid yellow' : '',
                                            borderRight: colIndex === 5 ? '3px solid orange' :
                                                         colIndex === 7 ? '3px solid blue' :
                                                         colIndex === 9 ? '3px solid white' :
                                                         colIndex === 11 ? '3px solid red' :
                                                         colIndex === 13 ? '3px solid green' :
                                                         colIndex === 15 ? '3px solid yellow' : '',
                                            borderBottom: rowIndex === filteredTableArray.length - 1
                                                ? colIndex === 5
                                                    ? '3px solid orange' // Bottom border for column 5
                                                    : colIndex === 7
                                                    ? '3px solid blue' // Bottom border for column 7
                                                    : colIndex === 9
                                                    ? '3px solid white' // Bottom border for column 9
                                                    : colIndex === 11
                                                    ? '3px solid red' // Bottom border for column 11
                                                    : colIndex === 13
                                                    ? '3px solid green' // Bottom border for column 13
                                                    : colIndex === 15
                                                    ? '3px solid yellow' // Bottom border for column 15
                                                    : ''
                                                : '', // No bottom border for other rows
                                        }}
                                    >
                                        {colIndex > 3 
                                            ? (cell && typeof cell === 'string' ? cell.replace(/MAGAZYN/g, 'X') : cell) || '' 
                                            : cell}
                                    </td>
                                );
                            })}
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        </>
    );
};

export default SeachEngineTable;