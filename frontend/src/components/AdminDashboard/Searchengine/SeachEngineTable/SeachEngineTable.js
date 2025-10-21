import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const SeachEngineTable = () => {
    const [products, setProducts] = useState([]);
    const [tableArray, setTableArray] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [symbols, setSymbols] = useState([]); // State for unique symbols
    const [selectedSymbols, setSelectedSymbols] = useState([]); // State for selected symbols
    const [selectedProducts, setSelectedProducts] = useState([]); // State for products selected for printing
    const [persistentSelections, setPersistentSelections] = useState({}); // State for persistent checkbox selections

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

    // Helper function to identify women's leather jackets for limit enforcement
    const isWomenLeatherJacket = (product, productName) => {
        if (!product) return false;
        
        console.log(`🔍 SPRAWDZANIE PRODUKTU: ${productName}`, {
            category: product.category,
            subcategory: product.subcategory,
            plec: product.plec,
            subcategoryType: typeof product.subcategory
        });
        
        // Method 1: Proper category structure check
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory && 
            typeof product.subcategory === 'object' &&
            product.subcategory.Kat_1_Opis_1 === 'Kurtka skórzana damska' &&
            product.plec === 'D') {
            console.log(`✅ METODA 1: Poprawna struktura kategorii`);
            return true;
        }
        
        // Method 2: Direct subcategory ID check (if we know the ID)
        if (product.category === 'Kurtki kożuchy futra' && 
            product.subcategory === '68f7d26c5b8f61302b06f658' && // ID subcategory "Kurtka skórzana damska" 
            product.plec === 'D') {
            console.log(`✅ METODA 2: ID subcategory`);
            return true;
        }
        
        // Method 3: Fallback - name-based identification for products that might have incorrect structure
        if (product.plec === 'D' && 
            product.category === 'Kurtki kożuchy futra' &&
            (productName.toLowerCase().includes('kurtka') || 
             productName.toLowerCase().includes('skórzana') ||
             productName.toLowerCase().includes('skorzana') ||
             productName.toLowerCase().includes('jacket'))) {
            console.log(`✅ METODA 3: Nazwa produktu (fallback)`);
            return true;
        }
        
        console.log(`❌ PRODUKT NIE PASUJE do kurtek skórzanych damskich`);
        return false;
    };

    const fetchProducts = async () => {
        try {
            const goodsResponse = await axios.get('/api/excel/goods/get-all-goods');
            const productData = goodsResponse.data.goods.map((item) => ({
                id: item._id,
                fullName: item.fullName,
                plec: item.Plec,
                category: item.category,
                subcategory: item.subcategory
            }));
            setProducts(productData);

            // Fetch persistent checkbox selections
            const selections = await fetchPrintSelections();

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

            const columns = 16; // Number of table columns: 1 checkbox + 1 product name + 14 sizes
            const rows = productData.length;

            
            const tableArray = Array.from({ length: rows }, (_, rowIndex) =>
                Array.from({ length: columns }, (_, colIndex) => {
                    if (colIndex === 0) {
                        // Checkbox column - use persistent selection state
                        const productId = productData[rowIndex].id;
                        const isSelected = selections[productId] || false;

                        return isSelected;
                    }
                    if (colIndex === 1) return productData[rowIndex].fullName; // Product name
                    if (colIndex === 2) return productData[rowIndex].plec; // Keep Plec in the array
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
                            columnIndex = 3;
                            break;
                        case 'XS':
                        case '34':
                            columnIndex = 4;
                            break;
                        case 'S':
                        case '36':
                            columnIndex = 5;
                            break;
                        case 'M':
                        case '38':
                            columnIndex = 6;
                            break;
                        case 'L':
                        case '40':
                            columnIndex = 7;
                            break;
                        case 'XL':
                        case '42':
                            columnIndex = 8;
                            break;
                        case '2XL':
                        case '44':
                            columnIndex = 9;
                            break;
                        case '3XL':
                        case '46':
                            columnIndex = 10;
                            break;
                        case '4XL':
                        case '48':
                            columnIndex = 11;
                            break;
                        case '5XL':
                        case '50':
                            columnIndex = 12;
                            break;
                        case '6XL':
                        case '52':
                            columnIndex = 13;
                            break;
                        case '7XL':
                        case '54':
                            columnIndex = 14;
                            break;
                        case '8XL':
                        case '56':
                        case '66':
                            columnIndex = 15;
                            break;
                        default:
                            return;
                    }
                    tableArray.forEach((row) => {
                        if (row[1] === matchedProduct.fullName) { // Product name is now at index 1
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
            console.log('🔄 SYNCHRONIZACJA po odświeżeniu:', {
                persistentSelectionsCount: Object.values(selections).filter(Boolean).length,
                selectedProductsCount: selectedProductNames.length,
                selectedProducts: selectedProductNames
            });
            
            // 📊 SZCZEGÓŁOWE STATYSTYKI ZAZNACZONYCH PRODUKTÓW
            const totalSelectedCheckboxes = Object.values(selections).filter(Boolean).length;
            const womenLeatherJacketsSelected = selectedProductNames.filter(productName => {
                const product = productData.find(p => p.fullName === productName);
                return isWomenLeatherJacket(product, productName);
            }).length;
            
            console.log('📊 STATYSTYKI ZAZNACZONYCH CHECKBOXÓW:', {
                totalZaznaczone: totalSelectedCheckboxes,
                kurtekSkorzanychDamskich: womenLeatherJacketsSelected,
                limitKurtek: 140,
                pozostaloDoLimitu: Math.max(0, 140 - womenLeatherJacketsSelected),
                limitPrzekroczony: womenLeatherJacketsSelected > 140
            });
            
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Monitor zmian w selectedProducts i wyświetlaj statystyki
    useEffect(() => {
        if (products.length > 0 && selectedProducts.length >= 0) {
            const womenLeatherJacketsCount = selectedProducts.filter(productName => {
                const product = products.find(p => p.fullName === productName);
                return isWomenLeatherJacket(product, productName);
            }).length;
            
            console.log('📊 AKTUALNE STATYSTYKI ZAZNACZONYCH:', {
                totalZaznaczone: selectedProducts.length,
                kurtekSkorzanychDamskich: womenLeatherJacketsCount,
                limitKurtek: 140,
                pozostaloDoLimitu: Math.max(0, 140 - womenLeatherJacketsCount),
                limitPrzekroczony: womenLeatherJacketsCount > 140,
                zaznaczoneProdukty: selectedProducts
            });
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

        console.log(`🔄 ZAZNACZANIE PRODUKTU:`, {
            produkt: productName,
            plec: product.plec,
            category: product.category,
            subcategory: product.subcategory,
            aktualnieZaznaczony: currentlySelected,
            nowanStan: newSelection,
            czyKurtkaSkorzanaDamska: isLeatherJacketWomen
        });

        // Jeśli próbujemy zaznaczyć kurtkę skórzaną damską, sprawdź limit
        if (newSelection && isLeatherJacketWomen) {
            // Policz aktualnie zaznaczone kurtki skórzane damskie
            const currentWomenLeatherJackets = selectedProducts.filter(selectedProductName => {
                const selectedProduct = products.find(p => p.fullName === selectedProductName);
                return isWomenLeatherJacket(selectedProduct, selectedProductName);
            }).length;

            console.log(`🔢 SPRAWDZENIE LIMITU:`, {
                aktualnieZaznaczone: currentWomenLeatherJackets,
                limit: 140,
                przekroczony: currentWomenLeatherJackets >= 140
            });

            if (currentWomenLeatherJackets >= 140) {
                console.log(`🛑 BLOKADA AKTYWNA! ${currentWomenLeatherJackets}/140`);
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WIĘCEJ PRODUKTÓW!\n\n` +
                     `Osiągnięto maksymalny limit 140 damskich kurtek skórzanych do druku.\n\n` +
                     `Aktualnie zaznaczone: ${currentWomenLeatherJackets}/140\n\n` +
                     `Aby dodać nowy produkt, najpierw odznacz inne damskie kurtki skórzane.`);
                return; // BLOKUJ - nie kontynuuj zaznaczania
            } else {
                console.log(`✅ LIMIT OK! ${currentWomenLeatherJackets + 1}/140 - można zaznaczyć`);
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

        // 📊 STATYSTYKI PO ZMIANIE CHECKBOXA
        setTimeout(() => {
            const totalSelected = selectedProducts.length + (newSelection ? 1 : -1);
            const womenLeatherSelected = selectedProducts.filter(prodName => {
                const prod = products.find(p => p.fullName === prodName);
                return isWomenLeatherJacket(prod, prodName);
            }).length + (newSelection && isLeatherJacketWomen ? 1 : (isLeatherJacketWomen ? -1 : 0));
            
            console.log('📊 STATYSTYKI PO ZMIANIE:', {
                produktZmieniony: productName,
                nowyStanCheckboxa: newSelection,
                totalZaznaczonych: totalSelected,
                kurtekSkorzanychDamskich: womenLeatherSelected,
                limitKurtek: 140,
                pozostaloDoLimitu: Math.max(0, 140 - womenLeatherSelected)
            });
        }, 100);

        // Update table array checkbox state
        setTableArray(prev => prev.map((row, rowIndex) => {
            if (row[1] === productName) {
                const newRow = [...row];
                newRow[0] = newSelection; // Update checkbox state
                return newRow;
            }
            return row;
        }));
    };

    // Handle select all products for printing - now persistent in database
    const handleSelectAllProducts = async () => {
        const currentFilteredProducts = filteredTableArray.map(row => row[1]); // Product name is now at index 1
        
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

            console.log(`🔢 SPRAWDZENIE LIMITU "ZAZNACZ WSZYSTKIE":`, {
                wFiltrowanych: womenLeatherJacketsInFiltered,
                aktualnieZaznaczone: currentWomenLeatherJackets,
                suma: totalWomenLeatherJackets,
                limit: 140,
                przekroczony: totalWomenLeatherJackets > 140
            });

            if (totalWomenLeatherJackets > 140) {
                console.log(`🛑 BLOKADA "ZAZNACZ WSZYSTKIE" - przekroczenie limitu: ${totalWomenLeatherJackets}/140`);
                alert(`🚫 NIE MOŻNA ZAZNACZYĆ WSZYSTKICH PRODUKTÓW!\n\n` +
                     `Przekroczenie limitu damskich kurtek skórzanych:\n` +
                     `• W aktualnej liście: ${womenLeatherJacketsInFiltered}\n` +
                     `• Już zaznaczone: ${currentWomenLeatherJackets}\n` +
                     `• Łącznie po zaznaczeniu: ${totalWomenLeatherJackets}/140\n\n` +
                     `Maksymalny limit: 140 damskich kurtek skórzanych\n\n` +
                     `Rozwiązania:\n` +
                     `• Odznacz inne damskie kurtki skórzane\n` +
                     `• Użyj filtrów, aby ograniczyć listę\n` +
                     `• Zaznaczaj produkty pojedynczo`);
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
                
                console.log('📊 STATYSTYKI PO "ZAZNACZ WSZYSTKIE":', {
                    akcja: allSelected ? 'ODZNACZ WSZYSTKIE' : 'ZAZNACZ WSZYSTKIE',
                    produktyWFiltrze: currentFilteredProducts.length,
                    totalZaznaczonych: totalSelected,
                    kurtekSkorzanychDamskich: womenLeatherSelected,
                    limitKurtek: 140,
                    pozostaloDoLimitu: Math.max(0, 140 - womenLeatherSelected),
                    limitPrzekroczony: womenLeatherSelected > 140
                });
            }, 100);

            // Update table array
            setTableArray(prev => prev.map(row => {
                const product = products.find(p => p.fullName === row[1]);
                if (product && currentFilteredProducts.includes(row[1])) {
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
        
        console.log(`Drukowanie strony 1 - Damskie: ${womenCount}, Męskie: ${menCount}, Łącznie: ${leatherJackets.length}`);
        
        // Utwórz dane do wydruku - damskie po lewej, męskie po prawej
        const printData = {
            title: 'Kurtki Skórzane - Damskie i Męskie',
            products: leatherJackets,
            layout: 'split-view' // Dwie sekcje na jednej kartce
        };
        
        // Zapisz dane do sessionStorage dla funkcji drukowania
        sessionStorage.setItem('printPage1Data', JSON.stringify(printData));
        
        // Wyświetl przypomnienie o ustawieniu liczby kopii
        console.log('PRZYPOMNIENIE: Ustaw liczbę kopii na 6 w oknie drukowania');
        
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
                console.log('Nie można automatycznie ustawić liczby kopii');
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
            leatherJackets.includes(row[1]) // row[1] to nazwa produktu
        );
        


        // Rozdziel na kurtki damskie i męskie - męskie mają undefined w row[2], więc używamy nazw
        const womenJackets = printTableData.filter(row => {
            // Damskie: mają row[2] === 'D'
            return row[2] === 'D';
        });
        
        const menJackets = printTableData.filter(row => {
            const name = row[1] || '';
            // Męskie: sprawdź czy nazwa zaczyna się od męskich imion
            const menNames = [
                '32', 'Adam', 'Alan', 'Amadeusz', 'Ambroży', 'Albert', 'Amir', 'Antek', 
                'Arkadiusz', 'Arnold', 'Artur', 'Bartłomiej', 'Dawid', 'Dominik', 'Filip',
                'Grzegorz', 'Ireneusz', 'Jakub', 'Kajetan', 'Kordian', 'Leon', 'Maciej',
                'Marcel', 'Marcin', 'Marian', 'Mariusz', 'Patryk', 'Robert',
                'Roland', 'Samuel', 'Ignacy', 'Stanisław', 'Szczepan', 'Wojciech', 'Zbigniew'
            ];
            
            return menNames.some(menName => name.startsWith(menName + ' '));
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
                }
                /* Kolorowe ramki dla rozmiarów */
                .size-xs { border-left: 1px solid yellow; border-right: 1px solid yellow; }
                .size-m { border-left: 1px solid blue; border-right: 1px solid blue; }
                .size-xl { border-left: 2px solid black; border-right: 2px solid black; }
                .size-3xl { border-left: 1px solid red; border-right: 1px solid red; }
                .size-5xl { border-left: 1px solid green; border-right: 1px solid green; }
                .size-7xl { border-left: 1px solid yellow; border-right: 1px solid yellow; }
            </style>
        </head>
        <body>
            <!-- Sekcja lewa: Kurtki damskie -->
            <div class="section section-left">
                <table>
                    <thead>
                        <tr>
                            <th class="product-name">Nazwa</th>
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
                        ${womenJackets.map((row, rowIndex) => `
                            <tr>
                                <td class="product-name">${row[1]}</td>
                                <td class="size-cell">${formatCellContent(row[3])}</td>
                                <td class="size-cell size-xs">${formatCellContent(row[4])}</td>
                                <td class="size-cell">${formatCellContent(row[5])}</td>
                                <td class="size-cell size-m">${formatCellContent(row[6])}</td>
                                <td class="size-cell">${formatCellContent(row[7])}</td>
                                <td class="size-cell size-xl">${formatCellContent(row[8])}</td>
                                <td class="size-cell">${formatCellContent(row[9])}</td>
                                <td class="size-cell size-3xl">${formatCellContent(row[10])}</td>
                                <td class="size-cell">${formatCellContent(row[11])}</td>
                                <td class="size-cell size-5xl">${formatCellContent(row[12])}</td>
                                <td class="size-cell">${formatCellContent(row[13])}</td>
                                <td class="size-cell size-7xl">${formatCellContent(row[14])}</td>
                                <td class="size-cell">${formatCellContent(row[15])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Sekcja prawa: Kurtki męskie -->
            <div class="section section-right">
                <table>
                    <thead>
                        <tr>
                            <th class="product-name">Nazwa</th>
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
                        ${menJackets.map((row, rowIndex) => `
                            <tr>
                                <td class="product-name">${row[1]}</td>
                                <td class="size-cell">${formatCellContent(row[3])}</td>
                                <td class="size-cell size-xs">${formatCellContent(row[4])}</td>
                                <td class="size-cell">${formatCellContent(row[5])}</td>
                                <td class="size-cell size-m">${formatCellContent(row[6])}</td>
                                <td class="size-cell">${formatCellContent(row[7])}</td>
                                <td class="size-cell size-xl">${formatCellContent(row[8])}</td>
                                <td class="size-cell">${formatCellContent(row[9])}</td>
                                <td class="size-cell size-3xl">${formatCellContent(row[10])}</td>
                                <td class="size-cell">${formatCellContent(row[11])}</td>
                                <td class="size-cell size-5xl">${formatCellContent(row[12])}</td>
                                <td class="size-cell">${formatCellContent(row[13])}</td>
                                <td class="size-cell size-7xl">${formatCellContent(row[14])}</td>
                                <td class="size-cell">${formatCellContent(row[15])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
        
        // Dla strony 2 możemy dodać inne produkty lub inne kategorie
        console.log('Drukowanie strony 2 dla produktów:', selectedProducts);
        alert(`Strona 2 - funkcjonalność w przygotowaniu\n\nZaznaczone produkty (${selectedProducts.length}):\n${selectedProducts.join('\n')}`);
    };

    const filteredTableArray = tableArray.map((row) => {
        const matchesSearchQuery = row[1]?.toLowerCase().includes(searchQuery); // Product name is now at index 1

        // Filter each cell to show only selected symbols, excluding checkbox and product name columns
        const filteredRow = row.map((cell, colIndex) => {
            // Checkbox state based on persistent database selection
            if (colIndex === 0) {
                const product = products.find(p => p.fullName === row[1]);
                return product ? (persistentSelections[product.id] || false) : false;
            }
            if (colIndex === 1) return cell; // Always include product name column
            if (colIndex === 2 || !cell) return cell; // Skip Plec or empty cells
            if (selectedSymbols.length === 0) return cell; // Show all symbols if no checkboxes are selected

            const cellSymbols = cell.split('/'); // Split cell content by '/'
            const matchingSymbols = cellSymbols.filter((symbol) => selectedSymbols.includes(symbol));
            return matchingSymbols.join('/') || null; // Join matching symbols or return null if none match
        });

        // Check if the row has any visible symbols after filtering (excluding checkbox, product name, and plec columns)
        const hasVisibleSymbols = selectedSymbols.length === 0 || filteredRow.some((cell, colIndex) => colIndex > 2 && cell);

        return matchesSearchQuery && hasVisibleSymbols ? filteredRow : null; // Keep the row if it matches the search query and has visible symbols
    }).filter(Boolean); // Remove rows that are null

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
                                    const product = products.find(p => p.fullName === row[1]);
                                    return product && persistentSelections[product.id];
                                })}
                                onChange={handleSelectAllProducts}
                                title="Zaznacz/Odznacz wszystkie do wydruku"
                            />
                        </th>
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
                    {filteredTableArray.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => {
                                if (colIndex === 2) return null; // Skip the Plec column (index 2)
                                
                                if (colIndex === 0) {
                                    // Checkbox column
                                    return (
                                        <td key={colIndex}>
                                            <input
                                                type="checkbox"
                                                checked={(() => {
                                                    const product = products.find(p => p.fullName === row[1]);
                                                    return product ? (persistentSelections[product.id] || false) : false;
                                                })()}
                                                onChange={() => handleProductCheckboxChange(row[1])}
                                                title="Zaznacz do wydruku"
                                            />
                                        </td>
                                    );
                                }
                                
                                return (
                                    <td
                                        key={colIndex}
                                        style={{
                                            backgroundColor: colIndex === 15 ? 'black' : '', // Set background color for column 15 (8XL)
                                            borderLeft: colIndex === 4 ? '3px solid orange' :
                                                        colIndex === 6 ? '3px solid blue' :
                                                        colIndex === 8 ? '3px solid white' :
                                                        colIndex === 10 ? '3px solid red' :
                                                        colIndex === 12 ? '3px solid green' :
                                                        colIndex === 14 ? '3px solid yellow' : '',
                                            borderRight: colIndex === 4 ? '3px solid orange' :
                                                         colIndex === 6 ? '3px solid blue' :
                                                         colIndex === 8 ? '3px solid white' :
                                                         colIndex === 10 ? '3px solid red' :
                                                         colIndex === 12 ? '3px solid green' :
                                                         colIndex === 14 ? '3px solid yellow' : '',
                                            borderBottom: rowIndex === filteredTableArray.length - 1
                                                ? colIndex === 4
                                                    ? '3px solid orange' // Bottom border for column 4
                                                    : colIndex === 6
                                                    ? '3px solid blue' // Bottom border for column 6
                                                    : colIndex === 8
                                                    ? '3px solid white' // Bottom border for column 8
                                                    : colIndex === 10
                                                    ? '3px solid red' // Bottom border for column 10
                                                    : colIndex === 12
                                                    ? '3px solid green' // Bottom border for column 12
                                                    : colIndex === 14
                                                    ? '3px solid yellow' // Bottom border for column 14
                                                    : ''
                                                : '', // No bottom border for other rows
                                        }}
                                    >
                                        {colIndex > 2 
                                            ? (cell && typeof cell === 'string' ? cell.replace(/MAGAZYN/g, 'X') : cell) || '' 
                                            : cell}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SeachEngineTable;