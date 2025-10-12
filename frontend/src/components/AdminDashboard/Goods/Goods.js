import React, { useState, useRef, useEffect } from 'react';
import styles from './Goods.module.css';
import { Modal, ModalHeader, ModalBody, FormGroup, Label, Input, Button, Table, ModalFooter } from 'reactstrap';
import defaultPicture from '../../../assets/images/default_image_2.png'; // Import the default picture icon
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import { saveAs } from 'file-saver'; // For exporting files
import jsPDF from 'jspdf'; // Import jsPDF for PDF printing
import autoTable from 'jspdf-autotable'; // Import autoTable for jsPDF

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
    const [walletsData, setWalletsData] = useState([]); // State for actual wallets data
    const [selectedWalletCode, setSelectedWalletCode] = useState(''); // Selected bag code for bags
    const [selectedWalletCodePortfele, setSelectedWalletCodePortfele] = useState(''); // Selected wallet code for wallets
    const [selectedWalletId, setSelectedWalletId] = useState(''); // Selected bag ID for bags
    const [walletFilterText, setWalletFilterText] = useState(''); // Filter text for bag codes
    const [walletFilterTextPortfele, setWalletFilterTextPortfele] = useState(''); // Filter text for wallet codes
    const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false); // Dropdown state
    const [showWalletDropdownPortfele, setShowWalletDropdownPortfele] = useState(false); // Dropdown state for wallets
    const [selectedWalletIndex, setSelectedWalletIndex] = useState(-1); // Index for keyboard navigation
    const [selectedWalletIndexPortfele, setSelectedWalletIndexPortfele] = useState(-1); // Index for keyboard navigation wallets
    const [bagsCategories, setBagsCategories] = useState([]); // State for bags categories
    const [walletsCategories, setWalletsCategories] = useState([]); // State for wallets categories
    const [selectedBagsCategoryCode, setSelectedBagsCategoryCode] = useState(''); // Selected bags category code
    const [selectedBagsCategoryId, setSelectedBagsCategoryId] = useState(''); // Selected bags category ID
    const [selectedWalletsCategoryCode, setSelectedWalletsCategoryCode] = useState(''); // Selected wallets category code
    const [selectedWalletsCategoryId, setSelectedWalletsCategoryId] = useState(''); // Selected wallets category ID
    const [remainingCategories, setRemainingCategories] = useState([]); // State for remaining categories
    const [selectedRemainingCategory, setSelectedRemainingCategory] = useState(''); // Selected remaining category
    const [remainingProducts, setRemainingProducts] = useState([]); // State for remaining products
    const [selectedRemainingProductCode, setSelectedRemainingProductCode] = useState(''); // Selected remaining product code
    const [remainingProductFilterText, setRemainingProductFilterText] = useState(''); // Filter text for remaining products
    const [isRemainingProductDropdownOpen, setIsRemainingProductDropdownOpen] = useState(false); // Dropdown state for remaining products
    const [selectedRemainingProductIndex, setSelectedRemainingProductIndex] = useState(-1); // Index for keyboard navigation
    // States for remaining subcategories (podpodkategorie)
    const [remainingSubcategories, setRemainingSubcategories] = useState([]); // State for remaining subcategories
    const [selectedRemainingSubcategory, setSelectedRemainingSubcategory] = useState(''); // Selected remaining subcategory
    // States for manufacturers
    const [manufacturers, setManufacturers] = useState([]); // State for manufacturers
    const [selectedManufacturer, setSelectedManufacturer] = useState(''); // Selected manufacturer
    // States for belts and gloves
    const [belts, setBelts] = useState([]); // State for belts
    const [selectedBelt, setSelectedBelt] = useState(''); // Selected belt
    const [gloves, setGloves] = useState([]); // State for gloves
    const [selectedGlove, setSelectedGlove] = useState(''); // Selected glove
    // States for color filtering
    const [colorFilterText, setColorFilterText] = useState(''); // Filter text for colors
    const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false); // Dropdown state for colors
    const [selectedColorIndex, setSelectedColorIndex] = useState(-1); // Index for keyboard navigation in colors
    // States for product filtering (Kurtki kożuchy futra)
    const [productFilterText, setProductFilterText] = useState(''); // Filter text for products
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false); // Dropdown state for products
    const [selectedProductIndex, setSelectedProductIndex] = useState(-1); // Index for keyboard navigation in products
    const [price, setPrice] = useState(0);
    const [discountPrice, setDiscountPrice] = useState(0);
    const [priceExceptions, setPriceExceptions] = useState([]); // Initialize with an empty array
    // Karpacz pricing states
    const [priceKarpacz, setPriceKarpacz] = useState(0);
    const [discountPriceKarpacz, setDiscountPriceKarpacz] = useState(0);
    const [priceExceptionsKarpacz, setPriceExceptionsKarpacz] = useState([]);
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
                // Sort by ToW_Kod ascending (rosnąco)
                const sortedGoods = updatedGoods.sort((a, b) => {
                    const kodA = (a.ToW_Kod || '').toString().toLowerCase();
                    const kodB = (b.ToW_Kod || '').toString().toLowerCase();
                    return kodA.localeCompare(kodB);
                });
                setGoods(sortedGoods);
            })
            .catch(error => console.error('Error fetching goods:', error))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchGoods();
        fetch('/api/excel/stock/get-all-stocks')
            .then(response => response.json())
            .then(data => {
                const stocks = (data.stocks || []).filter(stock => 
                    stock.Tow_Opis && stock.Tow_Opis.trim() !== ''
                );
                setStocks(stocks);
                if (stocks.length > 0) {
                    setSelectedStock(stocks[0]._id);
                    updateProductName(stocks[0]._id, selectedColor);
                }
            })
            .catch(error => console.error('Error fetching stocks:', error));

        fetch('/api/excel/color/get-all-colors')
            .then(response => response.json())
            .then(data => {
                const colors = (data.colors || []).filter(color => 
                    color.Kol_Opis && color.Kol_Opis.trim() !== ''
                );
                setColors(colors);
                if (colors.length > 0) {
                    setSelectedColor(colors[0]._id);
                    updateProductName(selectedStock, colors[0]._id);
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
        // Ładuj podkategorie dla kurtek z nowego endpointu
        fetch('/api/excel/subcategoryCoats/get-all-subcategoryCoats')
            .then(response => response.json())
            .then(data => {
                const filteredCategories = (data.subcategoryCoats || []).filter(cat => cat.Kat_1_Opis_1 && cat.Kat_1_Opis_1.trim() !== '');
                const updatedCategories = filteredCategories.map(cat => ({
                    ...cat,
                    Płeć: cat.Plec || '' // Ensure Płeć is included and defaults to an empty string if missing
                }));
                setSubcategories(updatedCategories); // Use updated categories
                if (updatedCategories.length > 0) {
                    setSelectedSubcategory(updatedCategories[0]._id); // Set the first category as default
                }
            })
            .catch(error => console.error('Error fetching subcategory coats:', error));
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

    // Fetch wallets data for wallets category
    useEffect(() => {
        fetch('/api/excel/wallets/get-all-wallets')
            .then(response => response.json())
            .then(data => {
                const walletsDataFetched = data.wallets || [];
                setWalletsData(walletsDataFetched);
                
                // Automatycznie wybierz pierwszą pozycję z niepustym kodem
                const firstWallet = walletsDataFetched.find(wallet => wallet.Portfele_Kod && wallet.Portfele_Kod.trim() !== '');
                if (firstWallet) {
                    setSelectedWalletCodePortfele(firstWallet.Portfele_Kod);
                }
            })
            .catch(error => console.error('Error fetching wallets:', error));
    }, []);

    // Fetch bags categories for bags category
    useEffect(() => {
        fetch('/api/excel/subcategoryBags/get-all-bags-categories')
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

    // Fetch wallets categories for wallets category
    useEffect(() => {
        fetch('/api/excel/wallets-category/get-all-wallets-categories')
            .then(response => response.json())
            .then(data => {
                const walletsCategoriesData = data.walletCategories || [];
                // Filtruj tylko kategorie które mają niepusty opis
                const filteredWalletsCategories = walletsCategoriesData.filter(category => 
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                setWalletsCategories(filteredWalletsCategories);
                
                // Automatycznie wybierz pierwszą pozycję z niepustym kodem i opisem
                const firstWalletsCategory = filteredWalletsCategories.find(category => 
                    category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                if (firstWalletsCategory) {
                    setSelectedWalletsCategoryCode(firstWalletsCategory.Kat_1_Kod_1);
                    setSelectedWalletsCategoryId(firstWalletsCategory._id);
                }
            })
            .catch(error => console.error('Error fetching wallets categories:', error));
    }, []);

    // Fetch remaining categories
    useEffect(() => {
        // Używaj tylko statycznych kategorii "Paski" i "Rękawiczki" 
        const staticCategories = [
            { _id: 'belts', Rem_Kat_1_Opis_1: 'Paski', type: 'static' },
            { _id: 'gloves', Rem_Kat_1_Opis_1: 'Rękawiczki', type: 'static' }
        ];
        
        setRemainingCategories(staticCategories);
        if (staticCategories.length > 0) {
            setSelectedRemainingCategory(staticCategories[0]._id);
        }
        
        // Opcjonalnie: nadal pobieraj standardowe kategorie jeśli potrzebne
        /*
        fetch('/api/excel/remaining-category/get-all-remaining-categories')
            .then(response => response.json())
            .then(data => {
                const filteredCategories = (data.remainingCategories || []).filter(cat => 
                    cat.Rem_Kat_1_Opis_1 && cat.Rem_Kat_1_Opis_1.trim() !== ''
                );
                
                // Połącz standardowe kategorie ze statycznymi
                const allCategories = [...filteredCategories, ...staticCategories];
                
                setRemainingCategories(allCategories);
                if (allCategories.length > 0) {
                    setSelectedRemainingCategory(allCategories[0]._id);
                }
            })
            .catch(error => console.error('Error fetching remaining categories:', error));
        */
    }, []);

    // Fetch manufacturers
    useEffect(() => {
        fetch('/api/excel/manufacturers')
            .then(response => response.json())
            .then(data => {
                const manufacturersList = data.manufacturers || [];
                setManufacturers(manufacturersList);
                if (manufacturersList.length > 0) {
                    setSelectedManufacturer(manufacturersList[0]._id);
                }
            })
            .catch(error => console.error('Error fetching manufacturers:', error));
    }, []);

    // Fetch belts
    useEffect(() => {
        fetch('/api/excel/belts')
            .then(response => response.json())
            .then(data => {
                const beltsList = data.belts || [];
                setBelts(beltsList);
                if (beltsList.length > 0) {
                    setSelectedBelt(beltsList[0]._id);
                }
            })
            .catch(error => console.error('Error fetching belts:', error));
    }, []);

    // Fetch gloves
    useEffect(() => {
        fetch('/api/excel/gloves')
            .then(response => response.json())
            .then(data => {
                const glovesList = data.gloves || [];
                setGloves(glovesList);
                if (glovesList.length > 0) {
                    setSelectedGlove(glovesList[0]._id);
                }
            })
            .catch(error => console.error('Error fetching gloves:', error));
    }, []);

    // Load subcategories for remaining products when belts, gloves are loaded and remaining category is selected
    useEffect(() => {
        if (selectedRemainingCategory && (belts.length > 0 || gloves.length > 0)) {
            handleRemainingCategoryChange(selectedRemainingCategory);
        }
    }, [selectedRemainingCategory, belts, gloves]);

    // Fetch remaining products
    useEffect(() => {
        fetch('/api/excel/remaining-products/get-all-remaining-products')
            .then(response => response.json())
            .then(data => {
                const filteredProducts = (data.remainingProducts || []).filter(product => 
                    product.Poz_Kod && product.Poz_Kod.trim() !== ''
                );
                setRemainingProducts(filteredProducts);
                if (filteredProducts.length > 0) {
                    setSelectedRemainingProductCode(filteredProducts[0].Poz_Kod);
                    setRemainingProductFilterText(filteredProducts[0].Poz_Kod);
                }
            })
            .catch(error => console.error('Error fetching remaining products:', error));
    }, []);

    useEffect(() => {
        if (modal) {
            setTimeout(() => {
                // Wycentruj modal od razu po otwarciu
                const modalElement = modalRef.current;
                if (modalElement) {
                    const modalDialog = modalElement.querySelector('.modal-dialog');
                    if (modalDialog) {
                        const modalWidth = 1140;
                        const modalHeight = modalDialog.offsetHeight;
                        const centerX = (window.innerWidth - modalWidth) / 2 + 160; // Przesunięcie o 160px w prawo
                        const centerY = (window.innerHeight - modalHeight) / 2;
                        
                        modalDialog.style.position = 'fixed';
                        modalDialog.style.margin = '0';
                        modalDialog.style.left = `${centerX}px`;
                        modalDialog.style.top = `${centerY}px`;
                        modalDialog.style.width = '1140px';
                        modalDialog.style.maxWidth = '1140px';
                    }
                }
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

    // Auto-update for wallets category
    useEffect(() => {
        if (selectedCategory === 'Portfele' && selectedWalletCodePortfele && selectedColor) {
            updateWalletProductName(selectedWalletCodePortfele, selectedColor);
        }
    }, [selectedCategory, selectedWalletCodePortfele, selectedColor]);

    // Auto-update for remaining products category
    useEffect(() => {
        if (selectedCategory === 'Pozostały asortyment' && selectedRemainingProductCode && selectedColor) {
            updateRemainingProductName(selectedRemainingProductCode, selectedColor);
        }
    }, [selectedCategory, selectedRemainingProductCode, selectedColor]);

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

    // Close wallets dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showWalletDropdownPortfele && !event.target.closest('#walletProductCode')) {
                setShowWalletDropdownPortfele(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showWalletDropdownPortfele]);

    // Close remaining products dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isRemainingProductDropdownOpen && !event.target.closest('#remainingProductCode')) {
                setIsRemainingProductDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isRemainingProductDropdownOpen]);

    // Close color dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const colorSelects = ['#bagColorSelect', '#walletColorSelect', '#remainingColorSelect', '#colorFilterContainer'];
            if (isColorDropdownOpen && !colorSelects.some(selector => event.target.closest(selector))) {
                setIsColorDropdownOpen(false);
                setSelectedColorIndex(-1);
            }
            
            // Handle product dropdown
            if (isProductDropdownOpen && !event.target.closest('#productFilterContainer')) {
                setIsProductDropdownOpen(false);
                setSelectedProductIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isColorDropdownOpen, isProductDropdownOpen]);

    const handleStockChange = (e) => {
        setSelectedStock(e.target.value);
        updateProductName(e.target.value, selectedColor);
    };

    const handleColorChange = (e) => {
        const colorId = e.target.value;
        setSelectedColor(colorId);
        
        // Find color description for filter text
        const selectedColorObj = colors.find(color => color._id === colorId);
        if (selectedColorObj) {
            setColorFilterText(selectedColorObj.Kol_Opis);
        }
        
        if (selectedCategory === 'Torebki') {
            updateBagProductName(selectedWalletCode, colorId);
        } else if (selectedCategory === 'Portfele') {
            updateWalletProductName(selectedWalletCodePortfele, colorId);
        } else if (selectedCategory === 'Pozostały asortyment') {
            updateRemainingProductName(selectedRemainingProductCode, colorId);
        } else {
            updateProductName(selectedStock, colorId);
        }
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setSelectedCategory(newCategory);
        
        // Ładuj odpowiednie podkategorie w zależności od wybranej kategorii
        if (newCategory === 'Kurtki kożuchy futra') {
            // Ładuj podkategorie kurtek z nowego endpointu
            fetch('/api/excel/subcategoryCoats/get-all-subcategoryCoats')
                .then(response => response.json())
                .then(data => {
                    const filteredCategories = (data.subcategoryCoats || []).filter(cat => cat.Kat_1_Opis_1 && cat.Kat_1_Opis_1.trim() !== '');
                    const updatedCategories = filteredCategories.map(cat => ({
                        ...cat,
                        Płeć: cat.Plec || ''
                    }));
                    setSubcategories(updatedCategories);
                    if (updatedCategories.length > 0) {
                        setSelectedSubcategory(updatedCategories[0]._id);
                    }
                })
                .catch(error => console.error('Error fetching subcategory coats:', error));
        } else if (newCategory === 'Torebki') {
            // Ładuj podkategorie torebek z dedykowanego endpointu
            fetch('/api/excel/subcategoryBags/get-all-bags-categories')
                .then(response => response.json())
                .then(data => {
                    const filteredCategories = (data.bagCategories || []).filter(cat => cat.Kat_1_Opis_1 && cat.Kat_1_Opis_1.trim() !== '');
                    setBagsCategories(filteredCategories);
                    if (filteredCategories.length > 0) {
                        setSelectedBagsCategoryId(filteredCategories[0]._id);
                        setSelectedBagsCategoryCode(filteredCategories[0].Kat_1_Kod_1);
                    }
                })
                .catch(error => console.error('Error fetching bags categories:', error));
        }
        
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
        } else if (newCategory === 'Portfele') {
            // Jeśli wybrano kategorię "Portfele", wyczyść modal i ustaw domyślne wartości
            // Wyczyść wszystkie pola formularza
            setSelectedStock('');
            setSelectedSubcategory('');
            setPrice(0);
            setDiscountPrice(0);
            setPriceExceptions([]);
            setSelectedImage(null);
            setEditingGood(null);
            setShowWalletDropdownPortfele(false);
            
            // Ustaw domyślne wartości dla portfeli
            // Pierwsza podkategoria portfeli
            if (walletsCategories.length > 0) {
                const firstWalletsCategory = walletsCategories.find(category => 
                    category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                    category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
                );
                if (firstWalletsCategory) {
                    setSelectedWalletsCategoryCode(firstWalletsCategory.Kat_1_Kod_1);
                    setSelectedWalletsCategoryId(firstWalletsCategory._id);
                }
            }
            
            // Pierwszy kolor
            if (colors.length > 0) {
                const firstColor = colors[0];
                setSelectedColor(firstColor._id);
                
                // Pierwszy portfel
                if (walletsData.length > 0) {
                    const firstWallet = walletsData.find(wallet => wallet.Portfele_Kod && wallet.Portfele_Kod.trim() !== '') || walletsData[0];
                    if (firstWallet) {
                        setSelectedWalletCodePortfele(firstWallet.Portfele_Kod);
                        setWalletFilterTextPortfele(firstWallet.Portfele_Kod);
                        
                        // Aktualizuj nazwę produktu od razu
                        updateWalletProductName(firstWallet.Portfele_Kod, firstColor._id);
                    }
                }
            } else {
                // Jeśli kolory nie są jeszcze załadowane, ustaw timeout
                setTimeout(() => {
                    if (colors.length > 0) {
                        const firstColor = colors[0];
                        setSelectedColor(firstColor._id);
                        
                        if (walletsData.length > 0) {
                            const firstWallet = walletsData.find(wallet => wallet.Portfele_Kod && wallet.Portfele_Kod.trim() !== '') || walletsData[0];
                            if (firstWallet) {
                                setSelectedWalletCodePortfele(firstWallet.Portfele_Kod);
                                setWalletFilterTextPortfele(firstWallet.Portfele_Kod);
                                updateWalletProductName(firstWallet.Portfele_Kod, firstColor._id);
                            }
                        }
                    }
                }, 200);
            }
        }
        
        // Jeśli wracamy z kategorii na "Kurtki kożuchy futra", zresetuj modal
        if (newCategory === 'Kurtki kożuchy futra') {
            resetForm();
        }
    };

    // Funkcja do ładowania podpodkategorii dla wybranej kategorii pozostałego asortymentu
    const handleRemainingCategoryChange = (categoryId) => {
        if (categoryId) {
            // Sprawdź czy wybrano "Paski" lub "Rękawiczki"
            if (categoryId === 'belts') {
                // Załaduj dane z tabeli Belts
                const beltsOptions = belts.map(belt => ({
                    _id: belt._id,
                    Sub_Opis: belt.Belt_Opis,
                    type: 'belt'
                }));
                
                setRemainingSubcategories(beltsOptions);
                if (beltsOptions.length > 0) {
                    setSelectedRemainingSubcategory(beltsOptions[0]._id);
                } else {
                    setSelectedRemainingSubcategory('');
                }
            } else if (categoryId === 'gloves') {
                // Załaduj dane z tabeli Gloves
                const glovesOptions = gloves.map(glove => ({
                    _id: glove._id,
                    Sub_Opis: glove.Glove_Opis,
                    type: 'glove'
                }));
                
                setRemainingSubcategories(glovesOptions);
                if (glovesOptions.length > 0) {
                    setSelectedRemainingSubcategory(glovesOptions[0]._id);
                } else {
                    setSelectedRemainingSubcategory('');
                }
            } else {
                // Standardowe ładowanie dla pozostałych kategorii
                fetch(`/api/excel/remaining-subcategory/get-by-category/${categoryId}`)
                    .then(response => response.json())
                    .then(data => {
                        const filteredSubcategories = (data.remainingSubcategories || []).filter(sub => 
                            sub.Sub_Opis && sub.Sub_Opis.trim() !== ''
                        );
                        
                        setRemainingSubcategories(filteredSubcategories);
                        if (filteredSubcategories.length > 0) {
                            setSelectedRemainingSubcategory(filteredSubcategories[0]._id);
                        } else {
                            setSelectedRemainingSubcategory('');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching remaining subcategories:', error);
                        setRemainingSubcategories([]);
                        setSelectedRemainingSubcategory('');
                    });
            }
        } else {
            setRemainingSubcategories([]);
            setSelectedRemainingSubcategory('');
        }
    };

    const handleImageChange = (e) => {
        setSelectedImage(e.target.files[0]);
    };

    const handleWalletFilterChange = (e) => {
        const value = e.target.value;
        
        // Check if the new value could be the start of any wallet code
        const wouldMatchAnyWallet = wallets.some(wallet => 
            wallet.Torebki_Kod && 
            wallet.Torebki_Kod.toLowerCase().startsWith(value.toLowerCase())
        );
        
        // Only allow the change if it could be the start of some wallet or if it's a deletion (shorter than current)
        if (wouldMatchAnyWallet || value.length < walletFilterText.length || value === '') {
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
        }
    };

    const handleWalletFilterChangePortfele = (e) => {
        const value = e.target.value;
        
        // Check if the new value could be the start of any wallet code
        const wouldMatchAnyWallet = walletsData.some(wallet => 
            wallet.Portfele_Kod && 
            wallet.Portfele_Kod.toLowerCase().startsWith(value.toLowerCase())
        );
        
        // Only allow the change if it could be the start of some wallet or if it's a deletion (shorter than current)
        if (wouldMatchAnyWallet || value.length < walletFilterTextPortfele.length || value === '') {
            setWalletFilterTextPortfele(value);
            setSelectedWalletCodePortfele(value);
            setShowWalletDropdownPortfele(true);
            setSelectedWalletIndexPortfele(-1); // Reset keyboard selection
            
            // Update product name for wallets
            updateWalletProductName(value, selectedColor);
        }
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

    const handleWalletKeyDownPortfele = (e) => {
        const filteredWallets = getFilteredWalletsPortfele();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedWalletIndexPortfele(prevIndex => 
                prevIndex < filteredWallets.length - 1 ? prevIndex + 1 : 0
            );
            setShowWalletDropdownPortfele(true);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedWalletIndexPortfele(prevIndex => 
                prevIndex > 0 ? prevIndex - 1 : filteredWallets.length - 1
            );
            setShowWalletDropdownPortfele(true);
        } else if (e.key === 'Enter' && selectedWalletIndexPortfele >= 0) {
            e.preventDefault();
            const selectedWallet = filteredWallets[selectedWalletIndexPortfele];
            if (selectedWallet) {
                handleWalletSelectPortfele(selectedWallet.Portfele_Kod);
            }
        } else if (e.key === 'Escape') {
            setShowWalletDropdownPortfele(false);
            setSelectedWalletIndexPortfele(-1);
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
                wallet.Torebki_Kod.toLowerCase().startsWith(walletFilterText.toLowerCase())
            )
            .slice(0, 100); // Zwiększone do 100 wyników
    };

    // Functions for actual wallets (Portfele)
    const handleWalletSelectPortfele = (code) => {
        setSelectedWalletCodePortfele(code);
        setWalletFilterTextPortfele(code);
        setShowWalletDropdownPortfele(false);
        
        // Update product name for wallets
        updateWalletProductName(code, selectedColor);
    };

    const getFilteredWalletsPortfele = () => {
        return walletsData
            .filter(wallet => wallet.Portfele_Kod && wallet.Portfele_Kod.trim() !== '')
            .filter(wallet => 
                wallet.Portfele_Kod.toLowerCase().startsWith(walletFilterTextPortfele.toLowerCase())
            )
            .slice(0, 100); // Zwiększone do 100 wyników
    };

    // Functions for remaining products
    const handleRemainingProductFilterChange = (e) => {
        const value = e.target.value;
        
        // Check if the new value could be the start of any remaining product code
        const wouldMatchAnyProduct = remainingProducts.some(product => 
            product.Poz_Kod.toLowerCase().startsWith(value.toLowerCase())
        );
        
        // Only allow the change if it could be the start of some product or if it's a deletion (shorter than current)
        if (wouldMatchAnyProduct || value.length < remainingProductFilterText.length || value === '') {
            setRemainingProductFilterText(value);
            setSelectedRemainingProductCode(value);
            setIsRemainingProductDropdownOpen(true);
            setSelectedRemainingProductIndex(-1); // Reset keyboard selection
            
            // Update product name for remaining products
            updateRemainingProductName(value, selectedColor);
        }
    };

    const handleRemainingProductKeyDown = (e) => {
        const filteredProducts = getFilteredRemainingProducts();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedRemainingProductIndex(prev => 
                prev < filteredProducts.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedRemainingProductIndex(prev => prev > 0 ? prev - 1 : prev);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedRemainingProductIndex >= 0 && filteredProducts[selectedRemainingProductIndex]) {
                handleRemainingProductSelect(filteredProducts[selectedRemainingProductIndex].Poz_Kod);
            }
        } else if (e.key === 'Escape') {
            setIsRemainingProductDropdownOpen(false);
            setSelectedRemainingProductIndex(-1);
        }
    };

    const handleRemainingProductSelect = (code) => {
        setSelectedRemainingProductCode(code);
        setRemainingProductFilterText(code);
        setIsRemainingProductDropdownOpen(false);
        setSelectedRemainingProductIndex(-1); // Reset keyboard selection
        
        // Update product name for remaining products
        updateRemainingProductName(code, selectedColor);
    };

    const getFilteredRemainingProducts = () => {
        return remainingProducts
            .filter(product => product.Poz_Kod && product.Poz_Kod.trim() !== '')
            .filter(product => 
                product.Poz_Kod.toLowerCase().startsWith(remainingProductFilterText.toLowerCase())
            )
            .slice(0, 100); // Zwiększone do 100 wyników
    };

    // Functions for color filtering
    const handleColorFilterChange = (e) => {
        const value = e.target.value;
        
        // Check if the new value would match any color
        const wouldMatchAnyColor = colors.some(color => 
            color.Kol_Opis.toLowerCase().includes(value.toLowerCase()) ||
            color.Kol_Kod.toLowerCase().includes(value.toLowerCase())
        );
        
        // Only allow the change if it matches some color or if it's a deletion (shorter than current)
        if (wouldMatchAnyColor || value.length < colorFilterText.length || value === '') {
            setColorFilterText(value);
            setIsColorDropdownOpen(true);
            setSelectedColorIndex(-1); // Reset keyboard selection
        }
    };

    const handleColorSelect = (colorId, colorDescription) => {
        setSelectedColor(colorId);
        setColorFilterText(colorDescription);
        setIsColorDropdownOpen(false);
        
        // Update product name based on current category
        if (selectedCategory === 'Torby/torebki') {
            updateBagProductName(selectedWalletCode, colorId);
        } else if (selectedCategory === 'Portfele') {
            updateWalletProductName(selectedWalletCodePortfele, colorId);
        } else if (selectedCategory === 'Pozostały asortyment') {
            updateRemainingProductName(selectedRemainingProductCode, colorId);
        } else if (selectedCategory === 'Kurtki kożuchy futra') {
            updateProductName(selectedStock, colorId);
        }
    };

    const handleColorKeyDown = (e) => {
        const filteredColors = getFilteredColors();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedColorIndex(prev => 
                prev < filteredColors.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedColorIndex(prev => prev > 0 ? prev - 1 : prev);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedColorIndex >= 0 && selectedColorIndex < filteredColors.length) {
                const color = filteredColors[selectedColorIndex];
                handleColorSelect(color._id, color.Kol_Opis);
            }
        } else if (e.key === 'Escape') {
            setIsColorDropdownOpen(false);
            setSelectedColorIndex(-1);
        }
    };

    const getFilteredColors = () => {
        return colors
            .filter(color => color.Kol_Opis && color.Kol_Opis.trim() !== '')
            .filter(color => 
                color.Kol_Opis.toLowerCase().includes(colorFilterText.toLowerCase()) ||
                color.Kol_Kod.toLowerCase().includes(colorFilterText.toLowerCase())
            )
            .sort((a, b) => {
                // Sortuj według kodu koloru numerycznie
                const kodA = parseInt(a.Kol_Kod) || 999;
                const kodB = parseInt(b.Kol_Kod) || 999;
                return kodA - kodB;
            })
            .slice(0, 100); // Zwiększone do 100 wyników
    };

    // Functions for product filtering (Kurtki kożuchy futra)
    const handleProductFilterChange = (e) => {
        const value = e.target.value;
        
        // Check if the new value could be the start of any product description
        const wouldMatchAnyProduct = stocks.some(stock => 
            stock.Tow_Opis.toLowerCase().startsWith(value.toLowerCase())
        );
        
        // Only allow the change if it could be the start of some product or if it's a deletion (shorter than current)
        if (wouldMatchAnyProduct || value.length < productFilterText.length || value === '') {
            setProductFilterText(value);
            setIsProductDropdownOpen(true);
            setSelectedProductIndex(-1); // Reset keyboard selection
        }
    };

    const handleProductSelect = (productId, productDescription) => {
        setSelectedStock(productId);
        setProductFilterText(productDescription);
        setIsProductDropdownOpen(false);
        
        // Update product name
        updateProductName(productId, selectedColor);
    };

    const handleProductKeyDown = (e) => {
        const filteredProducts = getFilteredProducts();
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedProductIndex(prev => 
                prev < filteredProducts.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedProductIndex(prev => prev > 0 ? prev - 1 : prev);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedProductIndex >= 0 && selectedProductIndex < filteredProducts.length) {
                const product = filteredProducts[selectedProductIndex];
                handleProductSelect(product._id, product.Tow_Opis);
            }
        } else if (e.key === 'Escape') {
            setIsProductDropdownOpen(false);
            setSelectedProductIndex(-1);
        }
    };

    const getFilteredProducts = () => {
        return stocks
            .filter(product => 
                product.Tow_Opis.toLowerCase().startsWith(productFilterText.toLowerCase()) ||
                product.Tow_Kod.toLowerCase().startsWith(productFilterText.toLowerCase())
            )
            .slice(0, 100); // Zwiększone do 100 wyników
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

    // Karpacz price exception handlers
    const handlePriceExceptionKarpaczChange = (index, field, value) => {
        const newPriceExceptions = [...priceExceptionsKarpacz];
        newPriceExceptions[index][field] = value;
        setPriceExceptionsKarpacz(newPriceExceptions);
    };

    const handleAddPriceExceptionKarpacz = () => {
        setPriceExceptionsKarpacz([...priceExceptionsKarpacz, { size: '', value: 0 }]);
    };

    const handleRemovePriceExceptionKarpacz = (index) => {
        const newPriceExceptions = priceExceptionsKarpacz.filter((_, i) => i !== index);
        setPriceExceptionsKarpacz(newPriceExceptions);
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

    const updateWalletProductName = (walletCode, colorId) => {
        const color = colors.find(color => color._id === colorId);
        const newName = `${walletCode ? walletCode : ''} ${color ? color.Kol_Opis : ''}`.trim();
        setProductName(newName);
    };

    const updateRemainingProductName = (productCode, colorId) => {
        const color = colors.find(color => color._id === colorId);
        const newName = `${productCode ? productCode : ''} ${color ? color.Kol_Opis : ''}`.trim();
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

    const generateWalletProductCode = () => {
        // Format kodu dla portfeli: 000 + kolor(2) + 0 + Portfele_Nr(3) + po_kropce(3) + suma(1)
        // Pozycje 1-3: 000 (zawsze zera)
        // Pozycje 4-5: Kod koloru (2 cyfry)
        // Pozycja 6: 0 (zawsze zero)
        // Pozycje 7-9: Portfele_Nr (3 cyfry)
        // Pozycje 10-12: Wartość po kropce z Portfele_Kod (3 cyfry)
        // Pozycja 13: Suma kontrolna
        
        const color = colors.find(color => color._id === selectedColor);
        const wallet = walletsData.find(wallet => wallet.Portfele_Kod === selectedWalletCodePortfele);
        
        if (!color || !wallet) {
            return '';
        }

        // Pozycje 1-3: zawsze 000
        let code = '000';
        
        // Pozycje 4-5: Kod koloru (Kol_Kod) - 2 cyfry
        const colorCode = color.Kol_Kod || '00';
        code += colorCode.padStart(2, '0').substring(0, 2);
        
        // Pozycja 6: zawsze 0
        code += '0';
        
        // Pozycje 7-9: Portfele_Nr - 3 cyfry
        const rowNumber = wallet.Portfele_Nr || 0;
        code += rowNumber.toString().padStart(3, '0').substring(0, 3);
        
        // Pozycje 10-12: Wartość po kropce z Portfele_Kod - 3 cyfry
        const walletCode = wallet.Portfele_Kod || '';
        const afterDotMatch = walletCode.match(/\.(\d+)/); // Znajdź cyfry po kropce
        let afterDotValue = '000';
        if (afterDotMatch) {
            const digits = afterDotMatch[1];
            afterDotValue = digits.padStart(3, '0').substring(0, 3); // Weź pierwsze 3 cyfry, uzupełnij zerami jeśli trzeba
        }
        code += afterDotValue;
        
        // Pozycja 13: Suma kontrolna
        const controlSum = calculateControlSum(code);
        code += controlSum;
        
        return code;
    };

    const generateRemainingProductCode = () => {
        // Format kodu dla pozostałego asortymentu: 000 + kolor(2) + 00 + Poz_Nr(2) + po_kropce(3) + suma(1)
        // Pozycje 1-3: 000 (zawsze zera)
        // Pozycje 4-5: Kod koloru (2 cyfry)
        // Pozycje 6-7: 00 (zawsze zera)
        // Pozycje 8-9: Poz_Nr z wybranego produktu (2 cyfry)
        // Pozycje 10-12: Wartość po kropce z Poz_Kod (3 cyfry)
        // Pozycja 13: Suma kontrolna
        
        const color = colors.find(color => color._id === selectedColor);
        const remainingProduct = remainingProducts.find(product => product.Poz_Kod === selectedRemainingProductCode);
        
        if (!color || !remainingProduct) {
            return '';
        }

        // Pozycje 1-3: zawsze 000
        let code = '000';
        
        // Pozycje 4-5: Kod koloru (Kol_Kod) - 2 cyfry
        const colorCode = color.Kol_Kod || '00';
        code += colorCode.padStart(2, '0').substring(0, 2);
        
        // Pozycje 6-7: zawsze 00
        code += '00';
        
        // Pozycje 8-9: Poz_Nr z wybranego produktu - 2 cyfry
        const productNumber = remainingProduct.Poz_Nr || 0;
        code += productNumber.toString().padStart(2, '0').substring(0, 2);
        
        // Pozycje 10-12: Wartość po kropce z Poz_Kod - 3 cyfry
        let afterDotValue = '000';
        if (selectedRemainingProductCode) {
            const afterDotMatch = selectedRemainingProductCode.match(/\.(\d+)/); // Znajdź cyfry po kropce
            if (afterDotMatch) {
                const digits = afterDotMatch[1];
                afterDotValue = digits.padStart(3, '0').substring(0, 3);
            }
        }
        code += afterDotValue;
        
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
        } else if (selectedCategory === 'Portfele') {
            // Obsługa kategorii Portfele
            if (!selectedWalletCodePortfele || !selectedColor) {
                alert('Wybierz produkt i kolor!');
                return;
            }

            color = colors.find(color => color._id === selectedColor);
            fullName = productName;
            productCode = generateWalletProductCode(); // używamy nowej funkcji dla portfeli

            if (!productCode) {
                alert('Nie można wygenerować kodu produktu!');
                return;
            }
        } else if (selectedCategory === 'Pozostały asortyment') {
            // Obsługa kategorii Pozostały asortyment
            if (!selectedRemainingProductCode || !selectedColor || !selectedRemainingCategory) {
                alert('Wybierz podkategorię, produkt i kolor!');
                return;
            }
            
            if (!selectedRemainingSubcategory) {
                alert('Wybierz podpodkategorię!');
                return;
            }

            color = colors.find(color => color._id === selectedColor);
            fullName = productName;
            productCode = generateRemainingProductCode();

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
        } else if (selectedCategory === 'Portfele') {
            const selectedWalletsCategory = walletsCategories.find(cat => cat._id === selectedWalletsCategoryId);
            finalPlec = selectedWalletsCategory ? selectedWalletsCategory.Plec : '';
        } else if (selectedCategory === 'Pozostały asortyment') {
            const selectedRemainingCat = remainingCategories.find(cat => cat._id === selectedRemainingCategory);
            finalPlec = selectedRemainingCat ? selectedRemainingCat.Plec : '';
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
        } else if (selectedCategory === 'Portfele') {
            // Dla portfeli - używamy danych z tabeli wallets i kategorii portfeli
            formData.append('stock', ''); // Brak stock dla portfeli
            formData.append('bagProduct', selectedWalletCodePortfele); // Kod portfela zamiast stock
            formData.append('bagId', ''); // Brak ID dla portfeli (może być dodane później)
            formData.append('bagsCategoryId', selectedWalletsCategoryId); // ID kategorii portfeli
        } else if (selectedCategory === 'Pozostały asortyment') {
            // Dla pozostałego asortymentu - używamy danych z tabeli remaining products i kategorii
            formData.append('stock', ''); // Brak stock dla pozostałego asortymentu
            formData.append('bagProduct', selectedRemainingProductCode); // Kod produktu pozostałego asortymentu
            formData.append('bagId', ''); // Brak ID dla pozostałego asortymentu
            formData.append('bagsCategoryId', selectedRemainingCategory); // ID kategorii pozostałego asortymentu
        } else {
            // Dla kurtek - standardowa obsługa
            formData.append('stock', stock ? stock._id : '');
        }
        
        formData.append('color', color ? color._id : '');
        formData.append('fullName', fullName);
        formData.append('code', productCode);
        formData.append('category', selectedCategory); // Save category with spaces
        
        // Obsługa podkategorii w zależności od typu kategorii
        if (selectedCategory === 'Torebki') {
            formData.append('subcategory', ''); // Brak podkategorii dla torebek
            formData.append('remainingSubcategory', ''); // Brak podpodkategorii dla torebek
        } else if (selectedCategory === 'Portfele') {
            formData.append('subcategory', ''); // Brak podkategorii dla portfeli
            formData.append('remainingSubcategory', ''); // Brak podpodkategorii dla portfeli
        } else if (selectedCategory === 'Pozostały asortyment') {
            formData.append('subcategory', selectedRemainingCategory); // Podkategoria dla pozostałego asortymentu
            formData.append('remainingsubsubcategory', selectedRemainingSubcategory); // Podpodkategoria dla pozostałego asortymentu
        } else {
            formData.append('subcategory', selectedSubcategory); // Standardowa podkategoria dla kurtek
            formData.append('remainingSubcategory', ''); // Brak podpodkategorii dla kurtek
        }
        formData.append('price', price);
        formData.append('discount_price', discountPrice);
        formData.append('priceExceptions', JSON.stringify(priceExceptions));
        // Karpacz pricing fields
        formData.append('priceKarpacz', priceKarpacz);
        formData.append('discount_priceKarpacz', discountPriceKarpacz);
        formData.append('priceExceptionsKarpacz', JSON.stringify(priceExceptionsKarpacz));
        formData.append('manufacturer', selectedManufacturer); // Dodaj grupę
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
            setColorFilterText(color.Kol_Opis || '');
            setSelectedCategory(good.category);
            setSelectedManufacturer(good.manufacturer ? good.manufacturer._id : '');
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
            // Set Karpacz prices for bags
            setPriceKarpacz(good.priceKarpacz || 0);
            setDiscountPriceKarpacz(good.discount_priceKarpacz || 0);
            setPriceExceptionsKarpacz(good.priceExceptionsKarpacz || []);
            
        } else if (good.category === 'Portfele') {
            // Obsługa edycji portfeli
            const color = colors.find(color => color._id === good.color._id);
            
            if (!color) {
                alert('Nie znaleziono powiązanego koloru.');
                return;
            }

            setSelectedColor(color._id);
            setSelectedWalletCodePortfele(good.bagProduct || '');
            setWalletFilterTextPortfele(good.bagProduct || '');
            setColorFilterText(color.Kol_Opis || '');
            setSelectedCategory(good.category);
            setSelectedManufacturer(good.manufacturer ? good.manufacturer._id : '');
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
            // Set Karpacz prices for wallets
            setPriceKarpacz(good.priceKarpacz || 0);
            setDiscountPriceKarpacz(good.discount_priceKarpacz || 0);
            setPriceExceptionsKarpacz(good.priceExceptionsKarpacz || []);
            
        } else if (good.category === 'Pozostały asortyment') {
            // Obsługa edycji pozostałego asortymentu
            const color = colors.find(color => color._id === good.color._id);
            
            if (!color) {
                alert('Nie znaleziono powiązanego koloru.');
                return;
            }

            setSelectedColor(color._id);
            setSelectedRemainingProductCode(good.bagProduct || '');
            setRemainingProductFilterText(good.bagProduct || '');
            setColorFilterText(color.Kol_Opis || '');
            setSelectedRemainingCategory(good.bagsCategoryId || '');
            setSelectedCategory(good.category);
            setSelectedManufacturer(good.manufacturer ? good.manufacturer._id : '');
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
            // Set Karpacz prices for remaining products
            setPriceKarpacz(good.priceKarpacz || 0);
            setDiscountPriceKarpacz(good.discount_priceKarpacz || 0);
            setPriceExceptionsKarpacz(good.priceExceptionsKarpacz || []);
            
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
            setProductFilterText(stock.Tow_Opis || '');
            setColorFilterText(color.Kol_Opis || '');

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
            setSelectedManufacturer(good.manufacturer ? good.manufacturer._id : '');
            setPrice(good.price);
            setDiscountPrice(good.discount_price);
            setProductName(good.fullName);
            
            // Set Karpacz prices for jackets - validate priceExceptionsKarpacz
            const validPriceExceptionsKarpacz = (good.priceExceptionsKarpacz || []).map(exception => {
                const size = sizes.find(size => size._id === exception.size?._id);
                if (!size) {
                    console.warn(`Nie znaleziono rozmiaru dla Karpacz exception: ${exception.size?._id}`);
                    return null;
                }
                return {
                    size: size._id,
                    value: exception.value
                };
            }).filter(exception => exception !== null);
            
            setPriceKarpacz(good.priceKarpacz || 0);
            setDiscountPriceKarpacz(good.discount_priceKarpacz || 0);
            setPriceExceptionsKarpacz(validPriceExceptionsKarpacz);
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
        setSelectedWalletCodePortfele(''); // Reset wallet code for wallets
        setSelectedWalletId(''); // Reset bag ID for bags
        setWalletFilterText(''); // Reset bag filter text
        setWalletFilterTextPortfele(''); // Reset wallet filter text
        setIsWalletDropdownOpen(false); // Close bags dropdown
        setShowWalletDropdownPortfele(false); // Close wallets dropdown
        setSelectedWalletIndex(-1); // Reset keyboard navigation
        setSelectedWalletIndexPortfele(-1); // Reset keyboard navigation for wallets
        
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
        }
        
        // Auto-select first wallets category if available
        if (walletsCategories.length > 0) {
            const firstWalletsCategory = walletsCategories.find(category => 
                category.Kat_1_Kod_1 && category.Kat_1_Kod_1.trim() !== '' &&
                category.Kat_1_Opis_1 && category.Kat_1_Opis_1.trim() !== ''
            );
            if (firstWalletsCategory) {
                setSelectedWalletsCategoryCode(firstWalletsCategory.Kat_1_Kod_1);
                setSelectedWalletsCategoryId(firstWalletsCategory._id);
            }
        } else {
            setSelectedBagsCategoryCode(''); // Reset bags category code
            setSelectedBagsCategoryId(''); // Reset bags category ID
        }
        setPrice(0);
        setDiscountPrice(0);
        setPriceExceptions([]); // Reset to an empty array
        // Reset Karpacz prices
        setPriceKarpacz(0);
        setDiscountPriceKarpacz(0);
        setPriceExceptionsKarpacz([]);
        setSelectedImage(null);
        setEditingGood(null);
        setSelectedRemainingCategory(remainingCategories.length > 0 ? remainingCategories[0]._id : ''); // Reset remaining category
        setSelectedRemainingSubcategory(''); // Reset remaining subcategory
        setSelectedManufacturer(manufacturers.length > 0 ? manufacturers[0]._id : ''); // Reset manufacturer
        setSelectedBelt(belts.length > 0 ? belts[0]._id : ''); // Reset belt
        setSelectedGlove(gloves.length > 0 ? gloves[0]._id : ''); // Reset glove
        setSelectedRemainingProductCode(remainingProducts.length > 0 ? remainingProducts[0].Poz_Kod : ''); // Reset remaining product
        setRemainingProductFilterText(remainingProducts.length > 0 ? remainingProducts[0].Poz_Kod : ''); // Reset remaining product filter
        setIsRemainingProductDropdownOpen(false); // Close remaining products dropdown
        setSelectedRemainingProductIndex(-1); // Reset keyboard navigation
        
        // Reset color filtering states
        setColorFilterText(colors.length > 0 ? colors[0].Kol_Opis : ''); // Reset color filter text
        setIsColorDropdownOpen(false); // Close color dropdown
        setSelectedColorIndex(-1); // Reset color keyboard navigation
        
        // Reset product filtering states (Kurtki kożuchy futra)
        setProductFilterText(stocks.length > 0 ? stocks[0].Tow_Opis : ''); // Reset product filter text
        setIsProductDropdownOpen(false); // Close product dropdown
        setSelectedProductIndex(-1); // Reset product keyboard navigation
        
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
            
            // Wycentruj modal przed rozpoczęciem przeciągania
            const modalWidth = 1140;
            const modalHeight = modalDialog.offsetHeight;
            const centerX = (window.innerWidth - modalWidth) / 2 + 160; // Ta sama logika co w useEffect
            const centerY = (window.innerHeight - modalHeight) / 2;
            
            initialX = centerX;
            initialY = centerY;
            
            modalDialog.style.position = 'fixed';
            modalDialog.style.margin = '0';
            modalDialog.style.left = `${centerX}px`;
            modalDialog.style.top = `${centerY}px`;
            // Zachowaj szerokość XL modala podczas przeciągania
            modalDialog.style.width = '1140px';
            modalDialog.style.maxWidth = '1140px';
            
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

    // Export function for Excel
    const handleExport = (format) => {
        switch (format) {
            case 'excel':
                const exportData = goods.map((good, index) => ({
                    'Lp': index + 1,
                    'Produkt': (good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') ? 
                        (good.bagProduct || '-') : 
                        (good.stock ? good.stock.Tow_Opis : '-'),
                    'Kolor': good.color ? good.color.Kol_Opis : '-',
                    'Nazwa produktu': good.fullName || '-',
                    'Kod kreskowy': good.code || '-',
                    'Kategoria': good.category || '-',
                    'Podkategoria': (() => {
                        if (good.category === 'Torebki') {
                            if (good.bagsCategoryId) {
                                const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                return bagsCategory && bagsCategory.Kat_1_Opis_1 ? bagsCategory.Kat_1_Opis_1 : '-';
                            }
                            return '-';
                        } else if (good.category === 'Portfele') {
                            if (good.bagsCategoryId) {
                                const walletsCategory = walletsCategories.find(cat => cat._id === good.bagsCategoryId);
                                return walletsCategory && walletsCategory.Kat_1_Opis_1 ? walletsCategory.Kat_1_Opis_1 : '-';
                            }
                            return '-';
                        } else if (good.category === 'Pozostały asortyment') {
                            if (good.subcategory) {
                                if (good.subcategory === 'belts' || (good.subcategory && good.subcategory._id === 'belts')) {
                                    return 'Paski';
                                } else if (good.subcategory === 'gloves' || (good.subcategory && good.subcategory._id === 'gloves')) {
                                    return 'Rękawiczki';
                                } else {
                                    const subcategoryId = typeof good.subcategory === 'object' ? good.subcategory._id : good.subcategory;
                                    const remainingCategory = remainingCategories.find(cat => cat._id === subcategoryId);
                                    return remainingCategory && remainingCategory.Rem_Kat_1_Opis_1 ? remainingCategory.Rem_Kat_1_Opis_1 : '-';
                                }
                            }
                            return '-';
                        } else {
                            return good.subcategory ? good.subcategory.Kat_1_Opis_1 : '-';
                        }
                    })(),
                    'Podpodkategoria': (() => {
                        if (good.category === 'Kurtki kożuchy futra' || good.category === 'Torebki' || good.category === 'Portfele') {
                            return '';
                        } else if (good.category === 'Pozostały asortyment') {
                            const remainingSubcategoryValue = good.remainingsubsubcategory || good.remainingSubcategory;
                            if (remainingSubcategoryValue) {
                                if (typeof remainingSubcategoryValue === 'object' && remainingSubcategoryValue.Sub_Opis) {
                                    return remainingSubcategoryValue.Sub_Opis;
                                }
                                if (typeof remainingSubcategoryValue === 'string' && !remainingSubcategoryValue.match(/^[0-9a-fA-F]{24}$/)) {
                                    return remainingSubcategoryValue;
                                }
                                const belt = belts.find(b => b._id === remainingSubcategoryValue);
                                if (belt) return belt.Belt_Opis;
                                const glove = gloves.find(g => g._id === remainingSubcategoryValue);
                                if (glove) return glove.Glove_Opis;
                                const subcategory = remainingSubcategories.find(sub => sub._id === remainingSubcategoryValue);
                                return subcategory ? subcategory.Sub_Opis : '';
                            }
                            return '';
                        }
                        return '';
                    })(),
                    'Grupa': good.manufacturer ? good.manufacturer.Prod_Opis : '-',
                    'Zdjęcie': good.fullName || '-', // Nome do zdjęcia używamy nazwy produktu
                    'Cena': good.price || 0,
                    'Cena promocyjna': (good.discount_price === 0 || good.discount_price === '') ? '' : good.discount_price,
                    'Wyjątki': (() => {
                        if (good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') {
                            return '-';
                        } else {
                            return good.priceExceptions.map(exception => 
                                (exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'Brak rozmiaru') + '=' + exception.value
                            ).join(', ') || '-';
                        }
                    })(),
                    'Cena Karpacz': good.priceKarpacz || '',
                    'Promocja Karpacz': (good.discount_priceKarpacz === 0 || good.discount_priceKarpacz === '') ? '' : good.discount_priceKarpacz,
                    'Wyjątki Karpacz': (() => {
                        if (good.category === 'Kurtki kożuchy futra') {
                            return good.priceExceptionsKarpacz && good.priceExceptionsKarpacz.length > 0 ? 
                                good.priceExceptionsKarpacz.map(exception => 
                                    (exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'Brak rozmiaru') + '=' + exception.value
                                ).join(', ') : '';
                        }
                        return '';
                    })(),
                    'Rodzaj': (() => {
                        if (good.category === 'Torebki') {
                            return good.Plec || (good.bagsCategoryId ? 
                                (() => {
                                    const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                    return bagsCategory ? bagsCategory.Plec : '-';
                                })() : '-');
                        } else if (good.category === 'Portfele') {
                            return good.Plec || (good.bagsCategoryId ? 
                                (() => {
                                    const walletsCategory = subcategories.find(cat => cat._id === good.bagsCategoryId);
                                    return walletsCategory ? walletsCategory.Plec : '-';
                                })() : '-');
                        } else if (good.category === 'Pozostały asortyment') {
                            return good.Plec || (good.bagsCategoryId ? 
                                (() => {
                                    const remainingCategory = remainingCategories.find(cat => cat._id === good.bagsCategoryId);
                                    return remainingCategory ? remainingCategory.Plec : '-';
                                })() : '-');
                        } else {
                            return good.subcategory ? subcategories.find(sub => sub._id === good.subcategory._id)?.Płeć || 'Nieokreślona' : 'Nieokreślona';
                        }
                    })()
                }));
                
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Goods');
                XLSX.writeFile(workbook, 'goods_cennik.xlsx');
                break;
            default:
                console.error('Unsupported export format:', format);
        }
    };

    // Print function for full price list - optimized for A4 landscape
    const handlePrint = async () => {
        if (goods.length === 0) {
            alert("Brak produktów do wydrukowania.");
            return;
        }

        try {
            // Create PDF in landscape orientation with Polish characters support
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
                compress: true,
                putOnlyUsedFonts: true
            });
            
            // Try to set encoding for Polish characters
            try {
                doc.setFont('helvetica', 'normal');
                doc.setCharSpace(0.1);
            } catch (e) {
                console.log('Font setting error:', e);
            }

            // A4 landscape dimensions: 297mm x 210mm
            const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
            const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
            
            // Function to convert Polish characters for PDF (same as in Warehouse)
            const convertPolishChars = (text) => {
                if (!text) return text;
                return text.toString()
                    .replace(/ą/g, 'a')
                    .replace(/ć/g, 'c')
                    .replace(/ę/g, 'e')
                    .replace(/ł/g, 'l')
                    .replace(/ń/g, 'n')
                    .replace(/ó/g, 'o')
                    .replace(/ś/g, 's')
                    .replace(/ź/g, 'z')
                    .replace(/ż/g, 'z')
                    .replace(/Ą/g, 'A')
                    .replace(/Ć/g, 'C')
                    .replace(/Ę/g, 'E')
                    .replace(/Ł/g, 'L')
                    .replace(/Ń/g, 'N')
                    .replace(/Ó/g, 'O')
                    .replace(/Ś/g, 'S')
                    .replace(/Ź/g, 'Z')
                    .replace(/Ż/g, 'Z');
            };
            
            // Prepare full table data with all columns
            const tableData = goods.map((good, index) => [
                index + 1, // Lp
                // Produkt
                convertPolishChars((good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') ? 
                    (good.bagProduct || '-') : 
                    (good.stock ? good.stock.Tow_Opis : '-')),
                // Kolor
                convertPolishChars(good.color ? good.color.Kol_Opis : '-'),
                // Nazwa produktu
                convertPolishChars(good.fullName || '-'),
                // Kod kreskowy
                good.code || '-',
                // Kategoria
                convertPolishChars((() => {
                    const category = good.category || '-';
                    if (category === 'Kurtki kożuchy futra') return 'Kurtki';
                    if (category === 'Pozostały asortyment') return 'Pozost.';
                    return category;
                })()),
                // Podkategoria
                convertPolishChars((() => {
                    if (good.category === 'Torebki') {
                        if (good.bagsCategoryId) {
                            const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                            return bagsCategory && bagsCategory.Kat_1_Opis_1 ? bagsCategory.Kat_1_Opis_1 : '-';
                        }
                        return '-';
                    } else if (good.category === 'Portfele') {
                        if (good.bagsCategoryId) {
                            const walletsCategory = walletsCategories.find(cat => cat._id === good.bagsCategoryId);
                            return walletsCategory && walletsCategory.Kat_1_Opis_1 ? walletsCategory.Kat_1_Opis_1 : '-';
                        }
                        return '-';
                    } else if (good.category === 'Pozostały asortyment') {
                        if (good.subcategory) {
                            if (good.subcategory === 'belts' || (good.subcategory && good.subcategory._id === 'belts')) {
                                return 'Paski';
                            } else if (good.subcategory === 'gloves' || (good.subcategory && good.subcategory._id === 'gloves')) {
                                return 'Rekawiczki';
                            } else {
                                const subcategoryId = typeof good.subcategory === 'object' ? good.subcategory._id : good.subcategory;
                                const remainingCategory = remainingCategories.find(cat => cat._id === subcategoryId);
                                return remainingCategory && remainingCategory.Rem_Kat_1_Opis_1 ? remainingCategory.Rem_Kat_1_Opis_1 : '-';
                            }
                        }
                        return '-';
                    } else {
                        return good.subcategory ? good.subcategory.Kat_1_Opis_1 : '-';
                    }
                })()),
                // Podpodkategoria
                (() => {
                    if (good.category === 'Kurtki kożuchy futra' || good.category === 'Torebki' || good.category === 'Portfele') {
                        return '';
                    } else if (good.category === 'Pozostały asortyment') {
                        const remainingSubcategoryValue = good.remainingsubsubcategory || good.remainingSubcategory;
                        if (remainingSubcategoryValue) {
                            if (typeof remainingSubcategoryValue === 'object' && remainingSubcategoryValue.Sub_Opis) {
                                return remainingSubcategoryValue.Sub_Opis;
                            }
                            if (typeof remainingSubcategoryValue === 'string' && !remainingSubcategoryValue.match(/^[0-9a-fA-F]{24}$/)) {
                                return remainingSubcategoryValue;
                            }
                            const belt = belts.find(b => b._id === remainingSubcategoryValue);
                            if (belt) return belt.Belt_Opis;
                            const glove = gloves.find(g => g._id === remainingSubcategoryValue);
                            if (glove) return glove.Glove_Opis;
                            const subcategory = remainingSubcategories.find(sub => sub._id === remainingSubcategoryValue);
                            return subcategory ? subcategory.Sub_Opis : '';
                        }
                        return '';
                    }
                    return '';
                })(),
                // Grupa
                good.manufacturer ? good.manufacturer.Prod_Opis : '-',
                // Zdjęcie (nazwa pliku)
                good.fullName || '-',
                // Cena
                good.price || 0,
                // Cena promocyjna
                (good.discount_price === 0 || good.discount_price === '') ? '' : good.discount_price,
                // Cena Karpacz
                good.priceKarpacz || '',
                // Promocja Karpacz
                (good.discount_priceKarpacz === 0 || good.discount_priceKarpacz === '') ? '' : good.discount_priceKarpacz,
                // Wyjątki
                convertPolishChars((() => {
                    if (good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') {
                        return '-';
                    } else {
                        return good.priceExceptions.map(exception => 
                            (exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'BR') + '=' + exception.value
                        ).join(', ') || '-';
                    }
                })()),
                // Wyjątki Karpacz
                convertPolishChars((() => {
                    if (good.category === 'Kurtki kożuchy futra') {
                        return good.priceExceptionsKarpacz && good.priceExceptionsKarpacz.length > 0 ? 
                            good.priceExceptionsKarpacz.map(exception => 
                                (exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'BR') + '=' + exception.value
                            ).join(', ') : '';
                    }
                    return '';
                })()),
                // Rodzaj
                convertPolishChars((() => {
                    if (good.category === 'Torebki') {
                        const plec = good.Plec || (good.bagsCategoryId ? 
                            (() => {
                                const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                return bagsCategory ? bagsCategory.Plec : '-';
                            })() : '-');
                        return plec === 'Damska' ? 'D' : plec === 'Meska' ? 'M' : plec === 'Dzieci' ? 'Dz' : plec;
                    } else if (good.category === 'Portfele') {
                        const plec = good.Plec || (good.bagsCategoryId ? 
                            (() => {
                                const walletsCategory = subcategories.find(cat => cat._id === good.bagsCategoryId);
                                return walletsCategory ? walletsCategory.Plec : '-';
                            })() : '-');
                        return plec === 'Damska' ? 'D' : plec === 'Meska' ? 'M' : plec === 'Dzieci' ? 'Dz' : plec;
                    } else if (good.category === 'Pozostaly asortyment') {
                        const plec = good.Plec || (good.bagsCategoryId ? 
                            (() => {
                                const remainingCategory = remainingCategories.find(cat => cat._id === good.bagsCategoryId);
                                return remainingCategory ? remainingCategory.Plec : '-';
                            })() : '-');
                        return plec === 'Damska' ? 'D' : plec === 'Meska' ? 'M' : plec === 'Dzieci' ? 'Dz' : plec;
                    } else {
                        const plec = good.subcategory ? subcategories.find(sub => sub._id === good.subcategory._id)?.Płeć || 'Nieokreslona' : 'Nieokreslona';
                        return plec === 'Damska' ? 'D' : plec === 'Meska' ? 'M' : plec === 'Dzieci' ? 'Dz' : plec === 'Nieokreslona' ? 'N' : plec;
                    }
                })())
            ]);

            // Full table headers (17 columns - without Akcje)
            const headers = [
                'Lp', 'Produkt', 'Kolor', 'Nazwa produktu', 'Kod kreskowy', 'Kategoria', 
                'Podkategoria', 'Podpodkategoria', 'Grupa', 'Zdjecie', 'Cena', 'Cena promocyjna', 'Wyjatki', 'Cena Karpacz', 'Promocja Karpacz', 'Wyjatki Karpacz', 'Rodzaj'
            ];

            // Title
            doc.setFontSize(14);
            doc.text('CENNIK PRODUKTÓW - BUKOWSKI', pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(8);
            doc.text(`Data wydruku: ${new Date().toLocaleDateString('pl-PL')}`, pageWidth / 2, 22, { align: 'center' });

            // Create table optimized for A4 landscape (297mm width)
            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: 28,
                margin: { left: 1, right: 1 }, // Very minimal margins - available width: 295mm
                styles: {
                    fontSize: 4, // Very small font to fit everything
                    cellPadding: 0.3,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontSize: 5,
                    fontStyle: 'bold',
                    halign: 'center',
                    cellPadding: 0.3
                },
                // Optimized column widths for 17 columns in 295mm total width (1mm margins)
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },   // Lp - 8mm
                    1: { halign: 'center', cellWidth: 18 },    // Produkt - 18mm
                    2: { halign: 'center', cellWidth: 12 },    // Kolor - 12mm
                    3: { halign: 'center', cellWidth: 25 },    // Nazwa produktu - 25mm
                    4: { halign: 'center', cellWidth: 18 },  // Kod kreskowy - 18mm
                    5: { halign: 'center', cellWidth: 15 },    // Kategoria - 15mm
                    6: { halign: 'center', cellWidth: 18 },    // Podkategoria - 18mm
                    7: { halign: 'center', cellWidth: 18 },    // Podpodkategoria - 18mm
                    8: { halign: 'center', cellWidth: 18 },    // Grupa - 18mm
                    9: { halign: 'center', cellWidth: 18 },    // Zdjęcie - 18mm
                    10: { halign: 'center', cellWidth: 12 },  // Cena - 12mm
                    11: { halign: 'center', cellWidth: 15 },  // Cena promocyjna - 15mm
                    12: { halign: 'center', cellWidth: 18 },   // Wyjątki - 18mm
                    13: { halign: 'center', cellWidth: 15 },  // Cena Karpacz - 15mm
                    14: { halign: 'center', cellWidth: 15 },  // Promocja Karpacz - 15mm
                    15: { halign: 'center', cellWidth: 18 },   // Wyjątki Karpacz - 18mm
                    16: { halign: 'center', cellWidth: 8 }   // Rodzaj - 8mm
                }, // Total: 269mm (safe fit in 295mm with buffer)
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                showHead: 'everyPage',
                pageBreak: 'auto'
            });

            // Page numbers
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(6);
                doc.text(`Strona ${i} z ${pageCount}`, pageWidth - 10, pageHeight - 5, { align: 'right' });
            }

            // Print directly
            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');

        } catch (error) {
            console.error('Błąd podczas drukowania:', error);
            alert('Wystąpił błąd podczas generowania cennika do druku.');
        }
    };

    return (
        <div>
            <Modal 
                isOpen={modal} 
                toggle={toggle} 
                innerRef={modalRef}
                size="xl"
            >
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
                            <option value="Portfele">Portfele</option>
                            <option value="Pozostały asortyment">Pozostały asortyment</option>
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
                                <Label for="jacketManufacturerSelect" className={styles.label}>Grupa:</Label>
                                <Input
                                    type="select"
                                    id="jacketManufacturerSelect"
                                    className={styles.inputField}
                                    value={selectedManufacturer}
                                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                                >
                                    {manufacturers.map(manufacturer => (
                                        <option key={manufacturer._id} value={manufacturer._id}>
                                            {manufacturer.Prod_Opis}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="productSelect" className={styles.label}>Produkt:</Label>
                                <div id="productFilterContainer" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={productFilterText}
                                        onChange={handleProductFilterChange}
                                        onKeyDown={handleProductKeyDown}
                                        onFocus={() => setIsProductDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz produkt..."
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
                                        onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isProductDropdownOpen && (
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
                                            {getFilteredProducts().length > 0 ? (
                                                getFilteredProducts().map((product, index) => (
                                                    <div
                                                        key={product._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedProductIndex === index ? '#007bff' :
                                                                selectedStock === product._id ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleProductSelect(product._id, product.Tow_Opis)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedProductIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedProductIndex !== index) {
                                                                e.target.style.backgroundColor = selectedStock === product._id ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {product.Tow_Opis}
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
                                <Label for="colorSelect" className={styles.label}>Kolor:</Label>
                                <div id="colorFilterContainer" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={colorFilterText}
                                        onChange={handleColorFilterChange}
                                        onKeyDown={handleColorKeyDown}
                                        onFocus={() => setIsColorDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kolor..."
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
                                        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isColorDropdownOpen && (
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
                                            {getFilteredColors().length > 0 ? (
                                                getFilteredColors().map((color, index) => (
                                                    <div
                                                        key={color._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedColorIndex === index ? '#007bff' :
                                                                selectedColor === color._id ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleColorSelect(color._id, color.Kol_Opis)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = selectedColor === color._id ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {color.Kol_Opis} ({color.Kol_Kod})
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

                    {/* Cennik dla Karpacza */}
                    <div style={{ marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
                        <h5 style={{ color: '#ffffff', borderBottom: '2px solid #ffffff', paddingBottom: '10px' }}>
                            Cennik dla Karpacza
                        </h5>
                    </div>
                    
                    <FormGroup className={styles.formGroup}>
                        <Label for="priceKarpacz" className={styles.label}>Cena (PLN):</Label>
                        <Input
                            type="number"
                            id="priceKarpacz"
                            className={`${styles.inputField} digit-color`}
                            value={priceKarpacz}
                            onChange={(e) => setPriceKarpacz(parseFloat(e.target.value) || 0)}
                        />
                    </FormGroup>
                    
                    <FormGroup className={styles.formGroup}>
                        <Label for="discountPriceKarpacz" className={styles.label}>Promocyjna (PLN):</Label>
                        <Input
                            type="number"
                            id="discountPriceKarpacz"
                            className={`${styles.inputField} digit-color`}
                            value={discountPriceKarpacz === 0 ? '' : discountPriceKarpacz}
                            onChange={(e) => setDiscountPriceKarpacz(parseFloat(e.target.value) || 0)}
                        />
                    </FormGroup>
                    
                    <FormGroup className={styles.formGroup} style={{ marginBottom: '-100px' }}>
                        <div>
                            <Label className={styles.label}>Wyjątki:</Label>
                        </div>
                        <div>
                            {priceExceptionsKarpacz.map((exception, index) => (
                                <div key={index} className={styles.priceExceptionRow}>
                                    <Input
                                        type="select"
                                        value={exception.size}
                                        onChange={(e) => handlePriceExceptionKarpaczChange(index, 'size', e.target.value)}
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
                                        onChange={(e) => handlePriceExceptionKarpaczChange(index, 'value', e.target.value)}
                                        className={styles.inputField}
                                        style={{ marginRight: '10px', marginLeft: '10px', width: '110px' }}
                                        min="0"
                                    />
                                    <Button color="danger" size="sm" onClick={() => handleRemovePriceExceptionKarpacz(index)} style={{ marginRight: '10px', marginLeft: '10px' }}>Usuń</Button>
                                </div>
                            ))}
                        </div>
                    </FormGroup>
                    
                    <div style={{ textAlign: 'center', marginBottom: '15px', marginTop: '-20px' }}>
                        <Button color="primary" size="sm" onClick={handleAddPriceExceptionKarpacz}>Dodaj wyjątek</Button>
                    </div>
                        </>
                    )}
                    
                    {/* Pola dla kategorii Torebki */}
                    {selectedCategory === 'Torebki' && (
                        <>
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
                                <Label for="bagManufacturerSelect" className={styles.label}>Grupa:</Label>
                                <Input
                                    type="select"
                                    id="bagManufacturerSelect"
                                    className={styles.inputField}
                                    value={selectedManufacturer}
                                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                                >
                                    {manufacturers.map(manufacturer => (
                                        <option key={manufacturer._id} value={manufacturer._id}>
                                            {manufacturer.Prod_Opis}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
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
                                <Label for="bagColorSelect" className={styles.label}>Kolor:</Label>
                                <div id="bagColorSelect" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={colorFilterText}
                                        onChange={handleColorFilterChange}
                                        onKeyDown={handleColorKeyDown}
                                        onFocus={() => setIsColorDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kolor..."
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
                                        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isColorDropdownOpen && (
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
                                            {getFilteredColors().length > 0 ? (
                                                getFilteredColors().map((color, index) => (
                                                    <div
                                                        key={color._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedColorIndex === index ? '#007bff' :
                                                                selectedColor === color._id ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleColorSelect(color._id, color.Kol_Opis)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = selectedColor === color._id ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {color.Kol_Opis} ({color.Kol_Kod})
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
                            
                            {/* Cennik dla Karpacza - Torebki */}
                            <div style={{ marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
                                <h5 style={{ color: '#ffffff', borderBottom: '2px solid #ffffff', paddingBottom: '10px' }}>
                                    Cennik dla Karpacza
                                </h5>
                            </div>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagPriceKarpacz" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="bagPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={priceKarpacz}
                                    onChange={(e) => setPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="bagDiscountPriceKarpacz" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="bagDiscountPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={discountPriceKarpacz === 0 ? '' : discountPriceKarpacz}
                                    onChange={(e) => setDiscountPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                        </>
                    )}

                    {selectedCategory === 'Portfele' && (
                        <>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletCategorySelect" className={styles.label}>Podkategoria:</Label>
                                <Input
                                    type="select"
                                    id="walletCategorySelect"
                                    className={styles.inputField}
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        const selectedCategory = walletsCategories.find(cat => cat._id === selectedId);
                                        if (selectedCategory) {
                                            setSelectedWalletsCategoryCode(selectedCategory.Kat_1_Kod_1);
                                            setSelectedWalletsCategoryId(selectedCategory._id);
                                        }
                                    }}
                                    value={selectedWalletsCategoryId}
                                >
                                    {walletsCategories.map(category => {
                                        let displayCode = category.Kat_1_Opis_1;
                                        return (
                                            <option key={category._id} value={category._id}>
                                                {displayCode} ({category.Plec})
                                            </option>
                                        );
                                    })}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletManufacturerSelect" className={styles.label}>Grupa:</Label>
                                <Input
                                    type="select"
                                    id="walletManufacturerSelect"
                                    className={styles.inputField}
                                    value={selectedManufacturer}
                                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                                >
                                    {manufacturers.map(manufacturer => (
                                        <option key={manufacturer._id} value={manufacturer._id}>
                                            {manufacturer.Prod_Opis}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletProductCode" className={styles.label}>Produkt:</Label>
                                <div id="walletProductCode" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={walletFilterTextPortfele}
                                        onChange={handleWalletFilterChangePortfele}
                                        onKeyDown={handleWalletKeyDownPortfele}
                                        onFocus={() => setShowWalletDropdownPortfele(true)}
                                        placeholder="Wpisz lub wybierz kod portfela..."
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
                                        onClick={() => setShowWalletDropdownPortfele(!showWalletDropdownPortfele)}
                                    >
                                        ▼
                                    </div>
                                    {showWalletDropdownPortfele && (
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
                                            {getFilteredWalletsPortfele().length > 0 ? (
                                                getFilteredWalletsPortfele().map((wallet, index) => (
                                                    <div
                                                        key={wallet._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedWalletIndexPortfele === index ? '#007bff' :
                                                                selectedWalletCodePortfele === wallet.Portfele_Kod ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleWalletSelectPortfele(wallet.Portfele_Kod)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedWalletIndexPortfele !== index) {
                                                                e.target.style.backgroundColor = '#111111';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedWalletIndexPortfele !== index) {
                                                                e.target.style.backgroundColor = selectedWalletCodePortfele === wallet.Portfele_Kod ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {wallet.Portfele_Kod}
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
                                <Label for="walletColorSelect" className={styles.label}>Kolor:</Label>
                                <div id="walletColorSelect" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={colorFilterText}
                                        onChange={handleColorFilterChange}
                                        onKeyDown={handleColorKeyDown}
                                        onFocus={() => setIsColorDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kolor..."
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
                                        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isColorDropdownOpen && (
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
                                            {getFilteredColors().length > 0 ? (
                                                getFilteredColors().map((color, index) => (
                                                    <div
                                                        key={color._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedColorIndex === index ? '#007bff' :
                                                                selectedColor === color._id ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleColorSelect(color._id, color.Kol_Opis)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = selectedColor === color._id ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {color.Kol_Opis} ({color.Kol_Kod})
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
                                <Label for="walletProductName" className={styles.label}>Nazwa produktu:</Label>
                                <Input
                                    type="text"
                                    id="walletProductName"
                                    className={styles.inputField}
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletProductCodeGenerated" className={styles.label}>Kod produktu:</Label>
                                <Input
                                    type="text"
                                    id="walletProductCodeGenerated"
                                    className={styles.inputField}
                                    value={generateWalletProductCode()}
                                    readOnly
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletProductImage" className={`${styles.label} ${styles.noWrapLabel}`}>Zdjęcie produktu:</Label>
                                <input
                                    type="file"
                                    id="walletProductImage"
                                    className={styles.inputFile}
                                    onChange={handleImageChange}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletPrice" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="walletPrice"
                                    className={styles.inputField}
                                    value={price}
                                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletDiscountPrice" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="walletDiscountPrice"
                                    className={styles.inputField}
                                    value={discountPrice}
                                    onChange={(e) => setDiscountPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                            
                            {/* Cennik dla Karpacza - Portfele */}
                            <div style={{ marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
                                <h5 style={{ color: '#ffffff', borderBottom: '2px solid #ffffff', paddingBottom: '10px' }}>
                                    Cennik dla Karpacza
                                </h5>
                            </div>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletPriceKarpacz" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="walletPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={priceKarpacz}
                                    onChange={(e) => setPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="walletDiscountPriceKarpacz" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="walletDiscountPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={discountPriceKarpacz === 0 ? '' : discountPriceKarpacz}
                                    onChange={(e) => setDiscountPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                        </>
                    )}

                    {selectedCategory === 'Pozostały asortyment' && (
                        <>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingSubcategorySelect" className={styles.label}>Podkategoria:</Label>
                                <Input
                                    type="select"
                                    id="remainingSubcategorySelect"
                                    className={styles.inputField}
                                    value={selectedRemainingCategory}
                                    onChange={(e) => {
                                        const categoryId = e.target.value;
                                        setSelectedRemainingCategory(categoryId);
                                        handleRemainingCategoryChange(categoryId);
                                    }}
                                >
                                    {remainingCategories.length === 0 ? (
                                        <option value="">Brak dostępnych kategorii</option>
                                    ) : (
                                        remainingCategories.map(category => (
                                            <option key={category._id} value={category._id}>
                                                {category.Rem_Kat_1_Opis_1}
                                            </option>
                                        ))
                                    )}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingSubcategoryDetailSelect" className={styles.label}>Podpodkategoria:</Label>
                                <Input
                                    type="select"
                                    id="remainingSubcategoryDetailSelect"
                                    className={styles.inputField}
                                    value={selectedRemainingSubcategory}
                                    onChange={(e) => setSelectedRemainingSubcategory(e.target.value)}
                                    disabled={!selectedRemainingCategory || remainingSubcategories.length === 0}
                                >
                                    {remainingSubcategories.map(subcategory => (
                                        <option key={subcategory._id} value={subcategory._id}>
                                            {subcategory.Sub_Opis}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="manufacturerSelect" className={styles.label}>Grupa:</Label>
                                <Input
                                    type="select"
                                    id="manufacturerSelect"
                                    className={styles.inputField}
                                    value={selectedManufacturer}
                                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                                >
                                    {manufacturers.map(manufacturer => (
                                        <option key={manufacturer._id} value={manufacturer._id}>
                                            {manufacturer.Prod_Opis}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingProductCode" className={styles.label}>Produkt:</Label>
                                <div id="remainingProductCode" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={remainingProductFilterText}
                                        onChange={handleRemainingProductFilterChange}
                                        onKeyDown={handleRemainingProductKeyDown}
                                        onFocus={() => setIsRemainingProductDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kod produktu..."
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
                                        onClick={() => setIsRemainingProductDropdownOpen(!isRemainingProductDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isRemainingProductDropdownOpen && (
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
                                            {getFilteredRemainingProducts().length > 0 ? (
                                                getFilteredRemainingProducts().map((product, index) => (
                                                    <div
                                                        key={product._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedRemainingProductIndex === index ? '#007bff' :
                                                                selectedRemainingProductCode === product.Poz_Kod ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleRemainingProductSelect(product.Poz_Kod)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedRemainingProductIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedRemainingProductIndex !== index) {
                                                                e.target.style.backgroundColor = selectedRemainingProductCode === product.Poz_Kod ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {product.Poz_Kod}
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
                                <Label for="remainingColorSelect" className={styles.label}>Kolor:</Label>
                                <div id="remainingColorSelect" style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        value={colorFilterText}
                                        onChange={handleColorFilterChange}
                                        onKeyDown={handleColorKeyDown}
                                        onFocus={() => setIsColorDropdownOpen(true)}
                                        placeholder="Wpisz lub wybierz kolor..."
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
                                        onClick={() => setIsColorDropdownOpen(!isColorDropdownOpen)}
                                    >
                                        ▼
                                    </div>
                                    {isColorDropdownOpen && (
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
                                            {getFilteredColors().length > 0 ? (
                                                getFilteredColors().map((color, index) => (
                                                    <div
                                                        key={color._id}
                                                        style={{
                                                            padding: '8px 12px',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid #333333',
                                                            backgroundColor: 
                                                                selectedColorIndex === index ? '#007bff' :
                                                                selectedColor === color._id ? '#111111' : '#000000',
                                                            color: '#ffffff'
                                                        }}
                                                        onClick={() => handleColorSelect(color._id, color.Kol_Opis)}
                                                        onMouseEnter={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = '#444444';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (selectedColorIndex !== index) {
                                                                e.target.style.backgroundColor = selectedColor === color._id ? '#111111' : '#000000';
                                                            }
                                                        }}
                                                    >
                                                        {color.Kol_Opis} ({color.Kol_Kod})
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
                                <Label for="remainingProductName" className={styles.label}>Nazwa produktu:</Label>
                                <Input
                                    type="text"
                                    id="remainingProductName"
                                    className={styles.inputField}
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingProductCodeGenerated" className={styles.label}>Kod produktu:</Label>
                                <Input
                                    type="text"
                                    id="remainingProductCodeGenerated"
                                    className={styles.inputField}
                                    value={generateRemainingProductCode()}
                                    readOnly
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingProductImage" className={`${styles.label} ${styles.noWrapLabel}`}>Zdjęcie produktu:</Label>
                                <input
                                    type="file"
                                    id="remainingProductImage"
                                    className={styles.inputFile}
                                    onChange={handleImageChange}
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingPrice" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="remainingPrice"
                                    className={styles.inputField}
                                    value={price}
                                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingDiscountPrice" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="remainingDiscountPrice"
                                    className={styles.inputField}
                                    value={discountPrice}
                                    onChange={(e) => setDiscountPrice(parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    min="0"
                                />
                            </FormGroup>
                            
                            {/* Cennik dla Karpacza - Pozostały asortyment */}
                            <div style={{ marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
                                <h5 style={{ color: '#ffffff', borderBottom: '2px solid #ffffff', paddingBottom: '10px' }}>
                                    Cennik dla Karpacza
                                </h5>
                            </div>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingPriceKarpacz" className={styles.label}>Cena (PLN):</Label>
                                <Input
                                    type="number"
                                    id="remainingPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={priceKarpacz}
                                    onChange={(e) => setPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                            
                            <FormGroup className={styles.formGroup}>
                                <Label for="remainingDiscountPriceKarpacz" className={styles.label}>Promocyjna (PLN):</Label>
                                <Input
                                    type="number"
                                    id="remainingDiscountPriceKarpacz"
                                    className={`${styles.inputField} digit-color`}
                                    value={discountPriceKarpacz === 0 ? '' : discountPriceKarpacz}
                                    onChange={(e) => setDiscountPriceKarpacz(parseFloat(e.target.value) || 0)}
                                />
                            </FormGroup>
                        </>
                    )}
                    
                    <Button color="primary" onClick={handleAddProduct} className={`${styles.button} btn-sm`}>
                        {editingGood ? 'Zaktualizuj produkt' : 'Dodaj produkt'}
                    </Button>
                </ModalBody>
            </Modal>
            
            {/* Action buttons */}
            <div className="d-flex justify-content-center mb-3">
                <div className="btn-group">
                    <Button color="primary" className="me-2 btn btn-sm" onClick={toggle}>
                        Dodaj produkt
                    </Button>
                    <Button color="success" className="me-2 btn btn-sm" onClick={() => handleExport('excel')}>
                        Export to Excel
                    </Button>
                    <Button color="warning" className="btn btn-sm" onClick={handlePrint}>
                        Drukuj cennik
                    </Button>
                </div>
            </div>
            
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
                            <th className={styles.tableHeader}>Podpodkategoria</th>
                            <th className={styles.tableHeader}>Grupa</th>
                            <th className={styles.tableHeader}>Zdjęcie</th>
                            <th className={styles.tableHeader}>Cena</th>
                            <th className={styles.tableHeader}>Cena promocyjna</th>
                            <th className={styles.tableHeader}>Wyjątki</th>
                            <th className={styles.tableHeader}>Cena Karpacz</th>
                            <th className={styles.tableHeader}>Promocja Karpacz</th>
                            <th className={styles.tableHeader}>Wyjątki Karpacz</th>
                            <th className={styles.tableHeader}>Rodzaj</th>
                            <th className={styles.tableHeader}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goods.map((good, index) => (
                            <tr key={good._id}>
                                <th scope="row" className={styles.tableCell} data-label="Lp">{index + 1}</th>
                                <td className={styles.tableCell} data-label="Produkt">
                                    {(good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') ? (good.bagProduct || '-') : (good.stock ? good.stock.Tow_Opis : '-')}
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
                                        ) : good.category === 'Portfele' ?
                                        (good.bagsCategoryId ? 
                                            (() => {
                                                const walletsCategory = walletsCategories.find(cat => cat._id === good.bagsCategoryId);
                                                if (walletsCategory && walletsCategory.Kat_1_Opis_1) {
                                                    return walletsCategory.Kat_1_Opis_1;
                                                }
                                                return '-';
                                            })()
                                            : '-'
                                        ) : good.category === 'Pozostały asortyment' ?
                                        (good.subcategory ? 
                                            (() => {
                                                // For remaining assortment, show the subcategory type (belts/gloves)
                                                if (good.subcategory === 'belts' || (good.subcategory && good.subcategory._id === 'belts')) {
                                                    return 'Paski';
                                                } else if (good.subcategory === 'gloves' || (good.subcategory && good.subcategory._id === 'gloves')) {
                                                    return 'Rękawiczki';
                                                } else {
                                                    // For other subcategories, find in remainingCategories
                                                    const subcategoryId = typeof good.subcategory === 'object' ? good.subcategory._id : good.subcategory;
                                                    const remainingCategory = remainingCategories.find(cat => cat._id === subcategoryId);
                                                    if (remainingCategory && remainingCategory.Rem_Kat_1_Opis_1) {
                                                        return remainingCategory.Rem_Kat_1_Opis_1;
                                                    }
                                                }
                                                return '-';
                                            })()
                                            : '-'
                                        ) : 
                                        (good.subcategory ? good.subcategory.Kat_1_Opis_1 : '')
                                    }
                                </td>
                                <td className={styles.tableCell} data-label="Podpodkategoria">
                                    {good.category === 'Kurtki kożuchy futra' ? '' : 
                                     good.category === 'Torebki' ? '' :
                                     good.category === 'Portfele' ? '' :
                                     good.category === 'Pozostały asortyment' ? 
                                        (() => {
                                            // Check both new and old field names
                                            const remainingSubcategoryValue = good.remainingsubsubcategory || good.remainingSubcategory;
                                            
                                            if (remainingSubcategoryValue) {
                                                // Backend już zwraca spopulowane dane
                                                if (typeof remainingSubcategoryValue === 'object' && remainingSubcategoryValue.Sub_Opis) {
                                                    return remainingSubcategoryValue.Sub_Opis;
                                                }
                                                
                                                // If it's already text, return it directly
                                                if (typeof remainingSubcategoryValue === 'string' && !remainingSubcategoryValue.match(/^[0-9a-fA-F]{24}$/)) {
                                                    return remainingSubcategoryValue;
                                                }
                                                
                                                // Fallback dla starych danych - sprawdź czy to ID pasków lub rękawiczek
                                                const belt = belts.find(b => b._id === remainingSubcategoryValue);
                                                if (belt) return belt.Belt_Opis;
                                                
                                                const glove = gloves.find(g => g._id === remainingSubcategoryValue);
                                                if (glove) return glove.Glove_Opis;
                                                
                                                // Standardowe podpodkategorie
                                                const subcategory = remainingSubcategories.find(sub => sub._id === remainingSubcategoryValue);
                                                return subcategory ? subcategory.Sub_Opis : '';
                                            }
                                            return '';
                                        })() : ''
                                    }
                                </td>
                                <td className={styles.tableCell} data-label="Grupa">
                                    {good.manufacturer ? good.manufacturer.Prod_Opis : '-'}
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
                                <td className={styles.tableCell} data-label="Cena">{good.price}</td>
                                <td className={styles.tableCell} data-label="Cena promocyjna">
                                    {good.discount_price === 0 || good.discount_price === '' ? '' : good.discount_price}
                                </td>
                                <td className={styles.tableCell} data-label="Wyjątki">
                                    {(good.category === 'Torebki' || good.category === 'Portfele' || good.category === 'Pozostały asortyment') ? '-' : (
                                        good.priceExceptions.map((exception, i) => (
                                            <span key={i}>
                                                {exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'Brak rozmiaru'}={exception.value}
                                                {i < good.priceExceptions.length - 1 && ', '}
                                            </span>
                                        ))
                                    )}
                                </td>
                                <td className={styles.tableCell} data-label="Cena Karpacz">{good.priceKarpacz || ''}</td>
                                <td className={styles.tableCell} data-label="Promocja Karpacz">
                                    {good.discount_priceKarpacz === 0 || good.discount_priceKarpacz === '' ? '' : good.discount_priceKarpacz}
                                </td>
                                <td className={styles.tableCell} data-label="Wyjątki Karpacz">
                                    {good.category === 'Kurtki kożuchy futra' ? (
                                        good.priceExceptionsKarpacz && good.priceExceptionsKarpacz.length > 0 ? 
                                        good.priceExceptionsKarpacz.map((exception, i) => (
                                            <span key={i}>
                                                {exception.size && exception.size.Roz_Opis ? exception.size.Roz_Opis : 'Brak rozmiaru'}={exception.value}
                                                {i < good.priceExceptionsKarpacz.length - 1 && ', '}
                                            </span>
                                        )) : ''
                                    ) : ''}
                                </td>
                                <td className={styles.tableCell} data-label="Rodzaj">
                                    {good.category === 'Torebki' ? 
                                        (good.Plec || 
                                            (good.bagsCategoryId ? 
                                                (() => {
                                                    const bagsCategory = bagsCategories.find(cat => cat._id === good.bagsCategoryId);
                                                    return bagsCategory ? bagsCategory.Plec : '-';
                                                })()
                                                : '-'
                                            )
                                        ) : good.category === 'Portfele' ?
                                        (good.Plec || 
                                            (good.bagsCategoryId ? 
                                                (() => {
                                                    const walletsCategory = subcategories.find(cat => cat._id === good.bagsCategoryId);
                                                    return walletsCategory ? walletsCategory.Plec : '-';
                                                })()
                                                : '-'
                                            )
                                        ) : good.category === 'Pozostały asortyment' ?
                                        (good.Plec || 
                                            (good.bagsCategoryId ? 
                                                (() => {
                                                    const remainingCategory = remainingCategories.find(cat => cat._id === good.bagsCategoryId);
                                                    return remainingCategory ? remainingCategory.Plec : '-';
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