import React, { useState, useRef, useEffect } from 'react';
import styles from './Goods.module.css';
import { Modal, ModalHeader, ModalBody, FormGroup, Label, Input, Button, Table, ModalFooter } from 'reactstrap';
import defaultPicture from '../../../assets/images/default_image_2.png'; // Import the default picture icon

const Goods = () => {
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [stocks, setStocks] = useState([]);
    const [colors, setColors] = useState([]);
    const [goods, setGoods] = useState([]);
    const [selectedStock, setSelectedStock] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedPicture, setSelectedPicture] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('Kurtki kożuchy futra'); // Default to fixed category value
    const [subcategories, setSubcategories] = useState([]); // New state for subcategories
    const [selectedSubcategory, setSelectedSubcategory] = useState(''); // New state for selected subcategory
    const [wallets, setWallets] = useState([]); // State for bags data
    const [selectedWalletCode, setSelectedWalletCode] = useState(''); // Selected bag code for bags
    const [selectedWalletId, setSelectedWalletId] = useState(''); // Selected bag ID for bags
    const [walletFilterText, setWalletFilterText] = useState(''); // Filter text for bag codes
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false); // Dropdown state
    const [selectedWalletIndex, setSelectedWalletIndex] = useState(-1); // Index for keyboard navigation
    const [bagsCategories, setBagsCategories] = useState([]); // State for bags categories
    const [selectedBagsCategoryCode, setSelectedBagsCategoryCode] = useState(''); // Selected bags category code
    const [selectedBagsCategoryId, setSelectedBagsCategoryId] = useState(''); // Selected bags category ID
    const [price, setPrice] = useState(0);
    const [discountPrice, setDiscountPrice] = useState(0);
    const [priceExceptions, setPriceExceptions] = useState([]); // Initialize with an empty array
    const [sizes, setSizes] = useState([]);
    const [editingGood, setEditingGood] = useState(null); // New state for editing
    const [productName, setProductName] = useState(''); // New state for product name
    const modalRef = useRef(null);

    const toggle = () => {
        setModal(!modal);
        if (!modal) {
            resetForm();
        }
    };

    const fetchGoods = () => {
        setLoading(true);
        fetch('/api/excel/goods/get-all-goods')
            .then(response => response.json())
            .then(data => {
                const updatedGoods = (data.goods || []).map(good => ({
                    ...good,
                    category: good.category || 'Brak kategorii' // Ensure category is a string
                }));
                setGoods(updatedGoods);
            })
            .catch(error => console.error('Error fetching goods:', error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchGoods();
        fetch('/api/excel/stock/get-all-stocks')
            .then(response => response.json())
            .then(data => {
                const filteredStocks = (data.stocks || []).filter(stock => stock.Tow_Opis !== '');
                setStocks(filteredStocks);
                if (filteredStocks.length > 0) {
                    setSelectedStock(filteredStocks[0]._id);
                    updateProductName(filteredStocks[0]._id, selectedColor);
                }
            })
            .catch(error => console.error('Error fetching stocks:', error));

        fetch('/api/excel/color/get-all-colors')
            .then(response => response.json())
            .then(data => {
                const filteredColors = (data.colors || []).filter(color => color.Kol_Opis !== '');
                setColors(filteredColors);
                if (filteredColors.length > 0) {
                    setSelectedColor(filteredColors[0]._id);
                    updateProductName(selectedStock, filteredColors[0]._id);
                }
            })
            .catch(error => console.error('Error fetching colors:', error));
    }, []);

    useEffect(() => {
        fetch('/api/excel/size/get-all-sizes')
            .then(response => response.json())
            .then(data => setSizes(data.sizes || []))
            .catch(error => console.error('Error fetching sizes:', error));
    }, []);

    useEffect(() => {
        fetch('/api/category/get-all-categories')
            .then(response => response.json())
            .then(data => {
                const filteredCategories = (data.categories || []).filter(cat => cat.Kat_1_Opis_1 && cat.Kat_1_Opis_1.trim() !== '');
                const updatedCategories = filteredCategories.map(cat => ({
                    ...cat,
                    Płeć: cat.Plec || '' // Ensure Płeć is included and defaults to an empty string if missing
                }));
                setSubcategories(updatedCategories); // Use updated categories
                if (updatedCategories.length > 0) {
                    setSelectedSubcategory(updatedCategories[0]._id); // Set the first category as default
                }
            })
            .catch(error => console.error('Error fetching categories:', error));
    }, []);

    // Fetch bags data for bags category
    useEffect(() => {
        fetch('/api/excel/bags/get-all-bags')
            .then(response => response.json())
            .then(data => {
                const bagsData = data.bags || [];
                setWallets(bagsData);
                
                // Automatycznie wybierz pierwszą pozycję z niepustym kodem
                const firstBag = bagsData.find(bag => bag.Torebki_Kod && bag.Torebki_Kod.trim() !== '');
                if (firstBag) {
                    setSelectedWalletCode(firstBag.Torebki_Kod);
                    setSelectedWalletId(firstBag._id);
                    setWalletFilterText(firstBag.Torebki_Kod);
                }
            })
            .catch(error => console.error('Error fetching bags:', error));
    }, []);

    // Fetch bags categories for bags category
    useEffect(() => {
        fetch('/api/excel/bags-category/get-all-bags-categories')
            .then(response => response.json())
            .then(data => {
                const bagsCategoriesData = data.bagCategories || [];
                // Filtruj tylko kategorie które mają niepusty opis
                const filteredBagsCategories = bagsCategoriesData.filter(category => 
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                setBagsCategories(filteredBagsCategories);
                
                // Automatycznie wybierz pierwszą pozycję z niepustym kodem i opisem
                const firstBagsCategory = filteredBagsCategories.find(category => 
                    category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                if (firstBagsCategory) {
                    setSelectedBagsCategoryCode(firstBagsCategory.Kat_1_Kod_1);
                    setSelectedBagsCategoryId(firstBagsCategory._id);
                }
            })
            .catch(error => console.error('Error fetching bags categories:', error));
    }, []);

    useEffect(() => {
        if (modal) {
            setTimeout(() => {
                makeModalDraggable();
            }, 300);
        }
    }, [modal]);

    useEffect(() => {
        if (selectedStock && selectedColor) {
            updateProductName(selectedStock, selectedColor);
        }
    }, [selectedStock, selectedColor]);

    // Auto-update for bags category
    useEffect(() => {
        if (selectedCategory === 'Torebki' && selectedWalletCode && selectedColor) {
            updateBagProductName(selectedWalletCode, selectedColor);
        }
    }, [selectedCategory, selectedWalletCode, selectedColor]);

    // Close bags dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isWalletDropdownOpen && !event.target.closest('#bagProductCode')) {
                setIsWalletDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isWalletDropdownOpen]);

    const handleStockChange = (e) => {
        setSelectedStock(e.target.value);
        updateProductName(e.target.value, selectedColor);
    };

    const handleColorChange = (e) => {
        setSelectedColor(e.target.value);
        if (selectedCategory === 'Torebki') {
            updateBagProductName(selectedWalletCode, e.target.value);
        } else {
            updateProductName(selectedStock, e.target.value);
        }
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setSelectedCategory(newCategory);
        
        // Jeśli wybrano kategorię "Torebki", wyczyść modal i ustaw domyślne wartości
        if (newCategory === 'Torebki') {
            // Wyczyść wszystkie pola formularza
            setSelectedStock('');
            setSelectedSubcategory('');
            setPrice(0);
            setDiscountPrice(0);
            setPriceExceptions([]);
            setSelectedImage(null);
            setEditingGood(null);
            setIsWalletDropdownOpen(false);
            
            // Ustaw domyślne wartości dla torebek
            // Pierwsza podkategoria torebek
            if (bagsCategories.length > 0) {
                const firstBagsCategory = bagsCategories.find(category => 
                    category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                if (firstBagsCategory) {
                    setSelectedBagsCategoryCode(firstBagsCategory.Kat_1_Kod_1);
                    setSelectedBagsCategoryId(firstBagsCategory._id);
                }
            }
            
            // Pierwszy kolor
            if (colors.length > 0) {
                const firstColor = colors[0];
                setSelectedColor(firstColor._id);
                
                // Pierwszy portfel
                if (wallets.length > 0) {
                    const firstWallet = wallets.find(wallet => wallet.Torebki_Kod && wallet.Torebki_Kod.trim() !== '') || wallets[0];
                    if (firstWallet) {
                        setSelectedWalletCode(firstWallet.Torebki_Kod);
                        setSelectedWalletId(firstWallet._id);
                        setWalletFilterText(firstWallet.Torebki_Kod);
                        
                        // Aktualizuj nazwę produktu od razu
                        updateBagProductName(firstWallet.Torebki_Kod, firstColor._id);
                    }
                }
            } else {
                // Jeśli kolory nie są jeszcze załadowane, ustaw timeout
                setTimeout(() => {
                    if (colors.length > 0) {
                        const firstColor = colors[0];
                        setSelectedColor(firstColor._id);
                        
                        if (wallets.length > 0) {
                            const firstWallet = wallets.find(wallet => wallet.Torebki_Kod && wallet.Torebki_Kod.trim() !== '') || wallets[0];
                            if (firstWallet) {
                                setSelectedWalletCode(firstWallet.Torebki_Kod);
                                setSelectedWalletId(firstWallet._id);
                                setWalletFilterText(firstWallet.Torebki_Kod);
                                updateBagProductName(firstWallet.Torebki_Kod, firstColor._id);
                            }
                        }
                    }
                }, 200);
            }
        }
        
        // Jeśli wracamy z "Torebki" na "Kurtki kożuchy futra", zresetuj modal
        if (newCategory === 'Kurtki kożuchy futra') {
            resetForm();
        }
    };

    const handleImageChange = (e) => {
        setSelectedImage(e.target.files[0]);
    };

    const handleWalletFilterChange = (e) => {
        const value = e.target.value;
        setWalletFilterText(value);
        setSelectedWalletCode(value);
        setIsWalletDropdownOpen(true);
        setSelectedWalletIndex(-1); // Reset keyboard selection
        
        // Find wallet by code to get ID
        const wallet = wallets.find(w => w.Torebki_Kod === value);
        if (wallet) {
            setSelectedWalletId(wallet._id);
        }
        
        // Update product name for bags
        updateBagProductName(value, selectedColor);
    };

    const handleWalletKeyDown = (e) => {
        const filteredWallets = getFilteredWallets();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedWalletIndex(prevIndex => 
                prevIndex < filteredWallets.length - 1 ? prevIndex + 1 : 0
            );
            setIsWalletDropdownOpen(true);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedWalletIndex(prevIndex => 
                prevIndex > 0 ? prevIndex - 1 : filteredWallets.length - 1
            );
            setIsWalletDropdownOpen(true);
        } else if (e.key === 'Enter' && selectedWalletIndex >= 0) {
            e.preventDefault();
            const selectedWallet = filteredWallets[selectedWalletIndex];
            if (selectedWallet) {
                handleWalletSelect(selectedWallet.Torebki_Kod);
            }
        } else if (e.key === 'Escape') {
            setIsWalletDropdownOpen(false);
            setSelectedWalletIndex(-1);
        }
    };

    const handleWalletSelect = (code) => {
        setSelectedWalletCode(code);
        setWalletFilterText(code);
        setIsWalletDropdownOpen(false);
        setSelectedWalletIndex(-1); // Reset keyboard selection
        
        // Find wallet by code to get ID
        const wallet = wallets.find(w => w.Torebki_Kod === code);
        if (wallet) {
            setSelectedWalletId(wallet._id);
        }
        
        // Update product name for bags
        updateBagProductName(code, selectedColor);
    };

    const getFilteredWallets = () => {
        return wallets
            .filter(wallet => wallet.Torebki_Kod && wallet.Torebki_Kod.trim() !== '')
            .filter(wallet => 
                wallet.Torebki_Kod.toLowerCase().includes(walletFilterText.toLowerCase())
            )
            .slice(0, 10); // Maksymalnie 10 wyników
    };

    const handlePriceChange = (e) => {
        setPrice(e.target.value);
    };

    const handleDiscountPriceChange = (e) => {
        setDiscountPrice(e.target.value);
    };

    const handlePriceExceptionChange = (index, field, value) => {
        const newPriceExceptions = [...priceExceptions];
        newPriceExceptions[index][field] = value;
        setPriceExceptions(newPriceExceptions);
    };

    const handleAddPriceException = () => {
        setPriceExceptions([...priceExceptions, { size: '', value: 0 }]);
    };

    const handleRemovePriceException = (index) => {
        const newPriceExceptions = priceExceptions.filter((_, i) => i !== index);
        setPriceExceptions(newPriceExceptions);
    };

    const updateProductName = (stockId, colorId) => {
        const stock = stocks.find(stock => stock._id === stockId);
        const color = colors.find(color => color._id === colorId);
        const newName = `${stock ? stock.Tow_Opis : ''} ${color ? color.Kol_Opis : ''}`.trim();
        setProductName(newName);
    };

    const updateBagProductName = (walletCode, colorId) => {
        const color = colors.find(color => color._id === colorId);
        const newName = `${walletCode ? walletCode : ''} ${color ? color.Kol_Opis : ''}`.trim();
        setProductName(newName);
    };

    const calculateControlSum = (code) => {
        let sum = 0;
        for (let i = 0; i < code.length; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        return (10 - (sum % 10)) % 10;
    };

    const getProductCode = () => {
        const stock = stocks.find(stock => stock._id === selectedStock);
        const color = colors.find(color => color._id === selectedColor);
        const baseCode = `${stock ? stock.Tow_Kod : ''}${color ? color.Kol_Kod : ''}`.trim();
        const extendedCode = `${baseCode}0000000`; // Add the 0000000 digits
        const controlSum = calculateControlSum(extendedCode);
        return `${extendedCode}${controlSum}`;
    };

    const getBagProductCode = () => {
        // Kod produktu dla torebek - bazuje na wybranym kodzie z tabeli wallet
        if (selectedWalletCode) {
            return selectedWalletCode;
        }
        return '';
    };

    const generateBagProductCode = () => {
        // Nowy format kodu dla torebek: 000 + kolor + wiersz + wartość_po_kropce + suma kontrolna
        // Pozycje 1-3: 000 (stałe)
        // Pozycje 4-5: Kod koloru  
        // Pozycje 6-9: Numer wiersza (Torebki_Nr)
        // Pozycje 10-12: Wartość po kropce z Torebki_Kod
        // Pozycja 13: Suma kontrolna
        
        const color = colors.find(color => color._id === selectedColor);
        const wallet = wallets.find(wallet => wallet._id === selectedWalletId);
        
        if (!color || !wallet) {
            return '';
        }

        // Pozycje 1-3: zawsze 000
        let code = '000';
        
        // Pozycje 4-5: Kod koloru (Kol_Kod)
        const colorCode = color.Kol_Kod || '00';
        code += colorCode.padStart(2, '0').substring(0, 2);
        
        // Pozycje 6-9: Numer wiersza (Torebki_Nr) - 4 cyfry
        const rowNumber = wallet.Torebki_Nr || 0;
        code += rowNumber.toString().padStart(4, '0').substring(0, 4);
        
        // Pozycje 10-12: Wartość po kropce z Torebki_Kod
        const bagCode = wallet.Torebki_Kod || '';
        const afterDotMatch = bagCode.match(/\.(\d{3})/); // Znajdź 3 cyfry po kropce
        const afterDotValue = afterDotMatch ? afterDotMatch[1] : '000';
        code += afterDotValue.padStart(3, '0').substring(0, 3);
        
        // Pozycja 13: Suma kontrolna
        const controlSum = calculateControlSum(code);
        code += controlSum;
        
        return code;
    };

    const handleAddProduct = () => {
        // Ensure selectedCategory is correctly set
        if (!selectedCategory) {
            alert('Kategoria nie została ustawiona!');
            return;
        }

        let stock = null;
        let color = null;
        let fullName = '';
        let productCode = '';

        if (selectedCategory === 'Torebki') {
            // Obsługa kategorii Torebki
            if (!selectedWalletCode || !selectedColor) {
                alert('Wybierz produkt i kolor!');
                return;
            }

            color = colors.find(color => color._id === selectedColor);
            fullName = productName;
            productCode = generateBagProductCode();

            if (!productCode) {
                alert('Nie można wygenerować kodu produktu!');
                return;
            }
        } else {
            // Obsługa kategorii Kurtki kożuchy futra
            stock = stocks.find(stock => stock._id === selectedStock);
            if (stock && stock.Tow_Opis === '!NIEOKREŚLONY') {
                alert('Produkt nie może posiadać wartości !NIEOKREŚLONY');
                return;
            }

            color = colors.find(color => color._id === selectedColor);
            fullName = productName;
            productCode = getProductCode();
        }

        // Check if product name already exists
        const existingProductByName = goods.find(good => good.fullName === fullName && (!editingGood || good._id !== editingGood._id));
        if (existingProductByName) {
            alert('Podana nazwa produktu już znajduje się w bazie danych!');
            return;
        }

        // Check if product code already exists
        const existingProductByCode = goods.find(good => good.code === productCode && (!editingGood || good._id !== editingGood._id));
        if (existingProductByCode) {
            alert('Produkt o tym kodzie już znajduje się w bazie danych!');
            return;
        }

        // Check if price is less than or equal to zero
        if (price <= 0) {
            alert('Cena musi być większa od zera');
            return;
        }

        const subcategoryElement = document.querySelector(`#subcategorySelect option[value="${selectedSubcategory}"]`);
        const PlecFromSubcategory = subcategoryElement ? subcategoryElement.getAttribute('plec') : ''; // Extract Plec from the subcategory
        
        // Dla torebek - pobierz płeć z kategorii torebek
        let finalPlec = '';
        if (selectedCategory === 'Torebki') {
            const selectedBagsCategory = bagsCategories.find(cat => cat._id === selectedBagsCategoryId);
            finalPlec = selectedBagsCategory ? selectedBagsCategory.Plec : '';
        } else {
            finalPlec = PlecFromSubcategory;
        }

        const formData = new FormData();
        
        if (selectedCategory === 'Torebki') {
            // Dla torebek - używamy danych z tabeli bags/wallets
            formData.append('stock', ''); // Brak stock dla torebek
            formData.append('bagProduct', selectedWalletCode); // Kod torebki zamiast stock
            formData.append('bagId', selectedWalletId); // ID torebki
            formData.append('bagsCategoryId', selectedBagsCategoryId); // ID kategorii torebki
        } else {
            // Dla kurtek - standardowa obsługa
            formData.append('stock', stock ? stock._id : '');
        }
        
        formData.append('color', color ? color._id : '');
        formData.append('fullName', fullName);
        formData.append('code', productCode);
        formData.append('category', selectedCategory); // Save category with spaces
        formData.append('subcategory', selectedCategory === 'Torebki' ? '' : selectedSubcategory); // Brak podkategorii dla torebek
        formData.append('price', price);
        formData.append('discount_price', discountPrice);
        formData.append('priceExceptions', JSON.stringify(priceExceptions));
        formData.append('sellingPoint', ''); // Default value for sellingPoint
        formData.append('barcode', ''); // Default value for barcode
        formData.append('Plec', finalPlec); // Płeć z kategorii torebek lub podkategorii
        if (selectedImage) {
            formData.append('Picture', selectedImage);
        }

        const url = editingGood ? `/api/excel/goods/${editingGood._id}` : '/api/excel/goods/create-goods';
        const method = editingGood ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                setModal(false);
                fetchGoods();
                resetForm();
            })
            .catch(error => {
                console.error('Error adding/updating product:', error);
            });
    };

    const handleDeleteProduct = async (goodId) => {
        const goodToDelete = goods.find(good => good._id === goodId);
        if (!goodToDelete) {
            alert('Nie znaleziono produktu');
            return;
        }

        try {
            // Fetch state data
            const stateResponse = await fetch('/api/state/');
            const stateData = await stateResponse.json();

            // Check if the good's fullName exists in the state database
            const existsInState = stateData.some(stateItem => stateItem.fullName === goodToDelete.fullName);
            if (existsInState) {
                alert('Nie można usunąć produktu ponieważ na stanie znajdują się fizycznie produkty o takiej samej nazwie... Odpisz najpierw ze statnu produkty i spróbuj ponownie.');
                return;
            }

            if (window.confirm('Czy na pewno chcesz usunąć produkt?')) {
                const response = await fetch(`/api/excel/goods/${goodId}`, {
                    method: 'DELETE'
                });
                const data = await response.json();

                if (data.message === 'Good deleted successfully') {
                    fetchGoods(); // Refresh the goods list
                } else {
                    alert('Nie znaleziono produktu');
                }
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Wystąpił błąd podczas usuwania produktu');
        }
    };

    const handlePictureClick = (picture) => {
        setSelectedPicture(picture);
    };

    const handleClosePictureModal = () => {
        setSelectedPicture(null);
    };

    const handleEditProduct = (good) => {
        setEditingGood(good);

        if (good.category === 'Torebki') {
            // Obsługa edycji torebek
            const color = colors.find(color => color._id === good.color._id);
            
            if (!color) {
                alert('Nie znaleziono powiązanego koloru.');
                return;
            }

            setSelectedColor(color._id);
            setSelectedWalletCode(good.bagProduct || '');
            setSelectedWalletId(good.bagId || '');
            setWalletFilterText(good.bagProduct || '');
            setSelectedCategory(good.category);
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
            
        } else {
            // Obsługa edycji kurtek
            const stock = stocks.find(stock => stock._id === good.stock._id);
            const color = colors.find(color => color._id === good.color._id);

            if (!stock) {
                alert('Nie znaleziono powiązanego produktu (stock).');
                return;
            }

            if (!color) {
                alert('Nie znaleziono powiązanego koloru.');
                return;
            }

            setSelectedStock(stock._id);
            setSelectedColor(color._id);

            // Walidacja dla rozmiarów w priceExceptions
            const validPriceExceptions = good.priceExceptions.map(exception => {
                const size = sizes.find(size => size._id === exception.size?._id);
                if (!size) {
                    console.warn(`Nie znaleziono rozmiaru dla exception: ${exception.size?._id}`);
                    return null; // Ignoruj nieprawidłowe wyjątki
                }
                return {
                    size: size._id,
                    value: exception.value
                };
            }).filter(exception => exception !== null); // Usuń nieprawidłowe wyjątki

            setPriceExceptions(validPriceExceptions);
            setSelectedCategory(good.category);
            setSelectedSubcategory(good.subcategory ? good.subcategory._id : '');
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
        }
        setSelectedImage(null); // Reset image selection for editing
        setModal(true);
    };

    const resetForm = () => {
        setSelectedStock(stocks.length > 0 ? stocks[0]._id : '');
        setSelectedColor(colors.length > 0 ? colors[0]._id : '');
        setSelectedCategory('Kurtki kożuchy futra'); // Reset to fixed category value
        setSelectedSubcategory(subcategories.length > 0 ? subcategories[0]._id : ''); // Reset subcategory
        setSelectedWalletCode(''); // Reset bag code for bags
        setSelectedWalletId(''); // Reset bag ID for bags
        setWalletFilterText(''); // Reset bag filter text
        setIsWalletDropdownOpen(false); // Close bags dropdown
        setSelectedWalletIndex(-1); // Reset keyboard navigation
        
        // Auto-select first bags category if available
        if (bagsCategories.length > 0) {
            const firstBagsCategory = bagsCategories.find(category => 
                category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
            );
            if (firstBagsCategory) {
                setSelectedBagsCategoryCode(firstBagsCategory.Kat_1_Kod_1);
                setSelectedBagsCategoryId(firstBagsCategory._id);
            }
        } else {
            setSelectedBagsCategoryCode(''); // Reset bags category code
            setSelectedBagsCategoryId(''); // Reset bags category ID
        }
        setPrice(0);
        setDiscountPrice(0);
        setPriceExceptions([]); // Reset to an empty array
        setSelectedImage(null);
        setEditingGood(null);
        if (stocks.length > 0 && colors.length > 0) {
            updateProductName(stocks[0]._id, colors[0]._id);
        } else {
            setProductName('');
        }
    };

    const makeModalDraggable = () => {
        const modal = modalRef.current;
        if (!modal) return;
        
        const modalDialog = modal.querySelector('.modal-dialog');
        const header = modal.querySelector('.modal-header');
        
        if (!header || !modalDialog) return;
        
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                modalDialog.style.left = `${initialX + dx}px`;
                modalDialog.style.top = `${initialY + dy}px`;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onMouseDown = (e) => {
            if (e.target.closest('.btn-close') || e.target.closest('button')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = modalDialog.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            modalDialog.style.position = 'fixed';
            modalDialog.style.margin = '0';
            modalDialog.style.left = `${initialX}px`;
            modalDialog.style.top = `${initialY}px`;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        };

        // Remove existing listeners to prevent duplicates
        header.removeEventListener('mousedown', onMouseDown);
        header.addEventListener('mousedown', onMouseDown);
        
        return () => {
            header.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    };

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
        <div>
            <Button color="primary" className={`${styles.addButton} ${styles.button} btn-sm`} onClick={toggle}>Dodaj produkt</Button>
            <Modal isOpen={modal} toggle={toggle} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggle}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    {editingGood ? 'Edytuj produkt' : 'Dodaj produkt'}
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup className={styles.formGroup}>
                        <Label for="categorySelect" className={styles.label}>Kategoria:</Label>
                        <Input
                            type="select"
                            id="categorySelect"
                            className={styles.inputField}
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                        >
                            <option value="Kurtki kożuchy futra">Kurtki kożuchy futra</option>
                            <option value="Torebki">Torebki</option>
                        </Input>
                    </FormGroup>
                    
                    {/* Wyświetl resztę pól tylko dla kategorii "Kurtki kożuchy futra" */}
                    {selectedCategory === 'Kurtki kożuchy futra' && (
                        <>
                            <FormGroup className={styles.formGroup}>
                                <Label for="subcategorySelect" className={styles.label}>Podkategoria:</Label>
                                <Input
                                    type="select"
                                    id="subcategorySelect"
                                    className={styles.inputField}
                                    value={selectedSubcategory}
                                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                                >
                                    {subcategories.map(sub => (
                                        <option
                                            key={sub._id}
                                            value={sub._id}
                                            name={sub.Kat_1_Opis_1} // Add Kat_1_Opis_1 as an attribute
                                            plec={sub.Płeć} // Add Płeć as a hidden attribute
                                        >
                                            {sub.Kat_1_Opis_1} {/* Display only Kat_1_Opis_1 */}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productSelect" className={styles.label}>Produkt:</Label>
                                <Input
                                    type="select"
                                    id="productSelect"
                                    className={styles.inputField}
                                    onChange={handleStockChange}
                                    value={selectedStock}
                                >
                                    {stocks.map(stock => (
                                        <option key={stock._id} value={stock._id} data-source="stock" tow_opis={stock.Tow_Opis} tow_kod={stock.Tow_Kod}>{stock.Tow_Opis}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="colorSelect" className={styles.label}>Kolor:</Label>
                                <Input
                                    type="select"
                                    id="colorSelect"
                                    className={styles.inputField}
                                    onChange={handleColorChange}
                                    value={selectedColor}
                                >
                                    {colors.map(color => (
                                        <option key={color._id} value={color._id} kol_opis={color.Kol_Opis} kol_kod={color.Kol_Kod}>{color.Kol_Opis}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productName" className={styles.label}>Nazwa produktu:</Label>
                                <Input
                                    type="text"
                                    id="productName"
                                    className={styles.inputField}
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productCode" className={styles.label}>Kod produktu:</Label>
                                <Input
                                    type="text"
                                    id="productCode"
                                    className={styles.inputField}
                                    value={getProductCode()}
                                    readOnly
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productImage" className={`${styles.label} ${styles.noWrapLabel}`}>Zdjęcie produktu:</Label>
                                <input
                                    type="file"
                                    id="productImage"
                                    className={styles.inputFile}
                                    onChange={handleImageChange}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productPrice" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="productPrice"
                                    className={`${styles.inputField} digit-color`}
                                    value={price}
                                    onChange={handlePriceChange}
                                />
                            </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="discountPrice" className={styles.label}>Promocyjna (PLN):</Label>
                        <Input
                            type="number"
                            id="discountPrice"
                            className={`${styles.inputField} digit-color`}
                            value={discountPrice === 0 ? '' : discountPrice}
                            onChange={handleDiscountPriceChange}
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup} style={{ marginBottom: '-100px' }}>
                        <div>
                            <Label className={styles.label}>Wyjątki:</Label>
                        </div>
                        <div>
                            {priceExceptions.map((exception, index) => (
                                <div key={index} className={styles.priceExceptionRow}>
                                    <Input
                                        type="select"
                                        value={exception.size}
                                        onChange={(e) => handlePriceExceptionChange(index, 'size', e.target.value)}
                                        className={styles.inputField}
                                        style={{ marginRight: '10px', marginLeft: '10px', width: '180px' }}
                                    >
                                        {sizes.map(size => (
                                            <option key={size._id} value={size._id}>{size.Roz_Opis}</option>
                                        ))}
                                    </Input>
                                    <Input
                                        type="number"
                                        value={exception.value}
                                        onChange={(e) => handlePriceExceptionChange(index, 'value', e.target.value)}
                                        className={styles.inputField}
                                        style={{ marginRight: '10px', marginLeft: '10px', width: '110px' }}
                                        min="0"
                                    />
                                    <Button color="danger" size="sm" onClick={() => handleRemovePriceException(index)} style={{ marginRight: '10px', marginLeft: '10px' }}>Usuń</Button>
                                </div>
                            ))}
                        </div>
                    </FormGroup>
                    <div style={{ textAlign: 'center', marginBottom: '15px', marginTop: '-20px' }}>
                        <Button color="primary" size="sm" onClick={handleAddPriceException}>Dodaj wyjątek</Button>
                    </div>
                        </>
                    )}
                    
                    {/* Pola dla kategorii Torebki */}
                    {selectedCategory === 'Torebki' && (
                        <>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagProductCode" className={styles.label}>Produkt:</Label>
                                <div id="bagProductCode" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={walletFilterText}
                                        onChange={handleWalletFilterChange}
                                        onKeyDown={handleWalletKeyDown}
                                        onFocus={() => setIsWalletDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kod torebki..."
                                        autoComplete="off"
                                        style={{
                                            backgroundColor: '#000000',
                                            color: '#ffffff',
                                            border: '1px solid #333333',
                                            borderRadius: '4px',
                                            padding: '8px 12px',
                                            width: '100%'
                                        }}
                                    />
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                        onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isWalletDropdownOpen && (
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                backgroundColor: '#000000',
                                                color: '#ffffff',
                                                border: '1px solid #333333',
                                                borderTop: 'none',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                zIndex: 1000,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.8)'
                                            }}
                                        >
                                            {getFilteredWallets().length > 0 ? (
                                                getFilteredWallets().map((wallet, index) => (
                                                    <div
                                                        key={wallet._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedWalletIndex === index ? '#007bff' :
                                                                selectedWalletCode === wallet.Torebki_Kod ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleWalletSelect(wallet.Torebki_Kod)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedWalletIndex !== index) {
                                                                e.target.style.backgroundColor = '#111111';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedWalletIndex !== index) {
                                                                e.target.style.backgroundColor = selectedWalletCode === wallet.Torebki_Kod ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {wallet.Torebki_Kod}
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ padding: '8px 12px', color: '#ccc' }}>
                                                    Brak wyników
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagsCategorySelect" className={styles.label}>Podkategoria:</Label>
                                <Input
                                    type="select"
                                    id="bagsCategorySelect"
                                    className={styles.inputField}
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        const selectedCategory = bagsCategories.find(cat => cat._id === selectedId);
                                        if (selectedCategory) {
                                            setSelectedBagsCategoryCode(selectedCategory.Kat_1_Kod_1);
                                            setSelectedBagsCategoryId(selectedCategory._id);
                                        }
                                    }}
                                    value={selectedBagsCategoryId}
                                >
                                    {bagsCategories.map(category => {
                                        // Usuń cyfry, myślniki i spacje z początku
                                        let displayCode = category.Kat_1_Opis_1; // Użyj bezpośrednio opisu
                                        return (
                                            <option key={category._id} value={category._id}>
                                                {displayCode} ({category.Plec})
                                            </option>
                                        );
                                    })}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagColorSelect" className={styles.label}>Kolor:</Label>
                                <Input
                                    type="select"
                                    id="bagColorSelect"
                                    className={styles.inputField}
                                    onChange={handleColorChange}
                                    value={selectedColor}
                                >
                                    {colors.map(color => (
                                        <option key={color._id} value={color._id} kol_opis={color.Kol_Opis} kol_kod={color.Kol_Kod}>{color.Kol_Opis}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagProductName" className={styles.label}>Nazwa produktu:</Label>
                                <Input
                                    type="text"
                                    id="bagProductName"
                                    className={styles.inputField}
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagProductCodeGenerated" className={styles.label}>Kod produktu:</Label>
                                <Input
                                    type="text"
                                    id="bagProductCodeGenerated"
                                    className={styles.inputField}
                                    value={generateBagProductCode()}
                                    readOnly
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagProductImage" className={`${styles.label} ${styles.noWrapLabel}`}>Zdjęcie produktu:</Label>
                                <input
                                    type="file"
                                    id="bagProductImage"
                                    className={styles.inputFile}
                                    onChange={handleImageChange}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagPrice" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="bagPrice"
                                    className={styles.inputField}
                                    value={price}
                                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagDiscountPrice" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="bagDiscountPrice"
                                    className={styles.inputField}
                                    value={discountPrice}
                                    onChange={(e) => setDiscountPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                        </>
                    )}
                    
                    <Button color="primary" onClick={handleAddProduct} className={`${styles.button} btn-sm`}>
                        {editingGood ? 'Zaktualizuj produkt' : 'Dodaj produkt'}
                    </Button>
                </ModalBody>
            </Modal>
            <div className={styles.tableContainer}>
                <Table bordered className={`${styles.table} ${styles.responsiveTable}`}>
                    <thead>
                        <tr>
                            <th className={styles.tableHeader}>Lp</th>
                            <th className={styles.tableHeader}>Produkt</th>
                            <th className={styles.tableHeader}>Kolor</th>
                            <th className={styles.tableHeader}>Nazwa produktu</th>
                            <th className={styles.tableHeader}>Kod kreskowy</th>
                            <th className={styles.tableHeader}>Kategoria</th>
                            <th className={styles.tableHeader}>Podkategoria</th>
                            <th className={styles.tableHeader}>Zdjęcie</th>
                            <th className={styles.tableHeader}>Cena (PLN)</th>
                            <th className={styles.tableHeader}>Cena promocyjna (PLN)</th>
                            <th className={styles.tableHeader}>Wyjątki</th>
                            <th className={styles.tableHeader}>Płeć</th>
                            <th className={styles.tableHeader}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goods.map((good, index) => (
                            <tr key={good._id}>
                                <th scope="row" className={styles.tableCell} data-label="Lp">{index + 1}</th>
                                <td className={styles.tableCell} data-label="Produkt">
                                    {good.category === 'Torebki' ? (good.bagProduct || '-') : (good.stock ? good.stock.Tow_Opis : '-')}
                                </td>
                                <td className={styles.tableCell} data-label="Kolor">{good.color.Kol_Opis}</td>
                                <td className={styles.tableCell} data-label="Nazwa produktu">{good.fullName}</td>
                                <td className={styles.tableCell} data-label="Kod produktu">{good.code}</td>
                                <td className={styles.tableCell} data-label="Kategoria">{good.category}</td>
                                <td className={styles.tableCell} data-label="Podkategoria">
                                    {good.category === 'Torebki' ? 
                                        (good.bagsCategoryId ? 
                                            (() => {
                                                const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                                if (bagsCategory && bagsCategory.Kat_1_Opis_1) {
                                                    return bagsCategory.Kat_1_Opis_1;
                                                }
                                                return '-';
                                            })()
                                            : '-'
                                        ) : 
                                        (good.subcategory ? good.subcategory.Kat_1_Opis_1 : '')
                                    }
                                </td>
                                <td className={styles.tableCell} data-label="Zdjęcie">
                                    <img
                                        src={good.picture || defaultPicture}
                                        alt={good.fullName}
                                        className={styles.thumbnail}
                                        style={{ width: '20px', height: 'auto', cursor: 'pointer' }}
                                        onClick={() => handlePictureClick(good.picture || defaultPicture)}
                                    />
                                </td>
                                <td className={styles.tableCell} data-label="Cena (PLN)">{good.price}</td>
                                <td className={styles.tableCell} data-label="Cena promocyjna (PLN)">
                                    {good.discount_price === 0 || good.discount_price === '' ? '' : good.discount_price}
                                </td>
                                <td className={styles.tableCell} data-label="Wyjątki">
                                    {good.category === 'Torebki' ? '-' : (
                                        good.priceExceptions.map((exception, i) => (
                                            <span key={i}>
                                                {exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'Brak rozmiaru'}={exception.value}
                                                {i < good.priceExceptions.length - 1 && ', '}
                                            </span>
                                        ))
                                    )}
                                </td>
                                <td className={styles.tableCell} data-label="Płeć">
                                    {good.category === 'Torebki' ? 
                                        (good.Plec || 
                                            (good.bagsCategoryId ? 
                                                (() => {
                                                    const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                                    return bagsCategory ? bagsCategory.Plec : '-';
                                                })()
                                                : '-'
                                            )
                                        ) : 
                                        (good.subcategory ? subcategories.find(sub => sub._id === good.subcategory._id)?.Płeć || 'Nieokreślona' : 'Nieokreślona')
                                    }
                                </td>
                                <td className={styles.tableCell} data-label="Akcje">
                                    <Button color="warning" size="sm" className="edit" onClick={() => handleEditProduct(good)}>Edytuj</Button>
                                    <Button color="danger" size="sm" className="ml-2" onClick={() => handleDeleteProduct(good._id)}>Usuń</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            {selectedPicture && (
                <Modal isOpen={true} toggle={handleClosePictureModal}>
                    <ModalHeader toggle={handleClosePictureModal}>Zdjęcie produktu</ModalHeader>
                    <ModalBody>
                        <img src={selectedPicture} alt="Selected" style={{ width: '100%' }} />
                    </ModalBody>
                </Modal>
            )}
        </div>
    );
};

export default Goods;