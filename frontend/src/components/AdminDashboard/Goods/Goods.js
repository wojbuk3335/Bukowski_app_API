import React, { useState, useRef, useEffect } from 'react';
import styles from './Goods.module.css';
import { Modal, ModalHeader, ModalBody, FormGroup, Label, Input, Button, Table, ModalFooter } from 'reactstrap';
import defaultPicture from '../../../assets/images/default_image_2.png'; // Import the default picture icon

const Goods = () => {
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
        fetch('/api/excel/goods/get-all-goods')
            .then(response => response.json())
            .then(data => {
                const updatedGoods = (data.goods || []).map(good => ({
                    ...good,
                    category: good.category || 'Brak kategorii' // Ensure category is a string
                }));
                setGoods(updatedGoods);
            })
            .catch(error => console.error('Error fetching goods:', error));
    };

    useEffect(() => {
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

        fetchGoods();
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
                setSubcategories(filteredCategories); // Use filtered categories
                if (filteredCategories.length > 0) {
                    setSelectedSubcategory(filteredCategories[0]._id); // Set the first category as default
                }
            })
            .catch(error => console.error('Error fetching categories:', error));
    }, []);

    useEffect(() => {
        if (modal) {
            setTimeout(() => {
                makeModalDraggable();
            }, 100);
        }
    }, [modal]);

    useEffect(() => {
        if (selectedStock && selectedColor) {
            updateProductName(selectedStock, selectedColor);
        }
    }, [selectedStock, selectedColor]);

    const handleStockChange = (e) => {
        setSelectedStock(e.target.value);
        updateProductName(e.target.value, selectedColor);
    };

    const handleColorChange = (e) => {
        setSelectedColor(e.target.value);
        updateProductName(selectedStock, e.target.value);
    };

    const handleImageChange = (e) => {
        setSelectedImage(e.target.files[0]);
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

    const handleAddProduct = () => {
        // Ensure selectedCategory is correctly set
        if (!selectedCategory) {
            alert('Kategoria nie została ustawiona!');
            return;
        }

        const stock = stocks.find(stock => stock._id === selectedStock);
        if (stock && stock.Tow_Opis === '!NIEOKREŚLONY') {
            alert('Produkt nie może posiadać wartości !NIEOKREŚLONY');
            return;
        }

        const color = colors.find(color => color._id === selectedColor);
        const fullName = productName;
        const productCode = getProductCode();

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
        const sex = subcategoryElement ? subcategoryElement.getAttribute('sex') : '';

        const formData = new FormData();
        formData.append('stock', stock ? stock._id : '');
        formData.append('color', color ? color._id : '');
        formData.append('fullName', fullName);
        formData.append('code', productCode);
        formData.append('category', selectedCategory); // Save category with spaces
        formData.append('subcategory', selectedSubcategory); // Append subcategory to form data
        formData.append('price', price);
        formData.append('discount_price', discountPrice);
        formData.append('priceExceptions', JSON.stringify(priceExceptions));
        formData.append('sellingPoint', ''); // Default value for sellingPoint
        formData.append('barcode', ''); // Default value for barcode
        formData.append('sex', sex); // Append the sex value
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
        setSelectedStock(good.stock._id);
        setSelectedColor(good.color._id);
        setSelectedCategory(good.category); // Set category directly as a string
        setSelectedSubcategory(good.subcategory ? good.subcategory._id : ''); // Set subcategory for editing
        setPrice(good.price);
        setDiscountPrice(good.discount_price);
        setPriceExceptions(good.priceExceptions.map(exception => ({
            size: exception.size._id,
            value: exception.value
        })));
        setProductName(good.fullName); // Set product name for editing
        setSelectedImage(null); // Reset image selection for editing
        setModal(true);
    };

    const resetForm = () => {
        setSelectedStock(stocks.length > 0 ? stocks[0]._id : '');
        setSelectedColor(colors.length > 0 ? colors[0]._id : '');
        setSelectedCategory('Kurtki kożuchy futra'); // Reset to fixed category value
        setSelectedSubcategory(subcategories.length > 0 ? subcategories[0]._id : ''); // Reset subcategory
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
        const header = modal.querySelector('.modal-header');
        if (!header) return;
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = modal.offsetLeft;
            initialY = modal.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                modal.style.left = `${initialX + dx}px`;
                modal.style.top = `${initialY + dy}px`;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        header.addEventListener('mousedown', onMouseDown);
    };

    return (
        <div>
            <Button color="primary" className={`${styles.addButton} ${styles.button} btn-sm`} onClick={toggle}>Dodaj produkt</Button>
            <Modal isOpen={modal} toggle={toggle} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggle}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    {editingGood ? 'Edytuj produkt' : 'Dodaj produkt'}
                    <button className={styles.customCloseButton} onClick={toggle}></button>
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup className={styles.formGroup}>
                        <Label for="categorySelect" className={styles.label}>Kategoria:</Label>
                        <Input
                            type="select"
                            id="categorySelect"
                            className={styles.inputField}
                            value={selectedCategory}
                            disabled // Disable the select input as it will have only one option
                        >
                            <option value="Kurtki kożuchy futra">Kurtki kożuchy futra</option> 
                        </Input>
                    </FormGroup>
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
                                <option key={sub._id} value={sub._id}>
                                    {sub.Kat_1_Opis_1} 
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
                        <Label for="discountPrice" className={styles.label}>Cena promocyjna (PLN):</Label>
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
                    <Button color="primary" onClick={handleAddProduct} className={`${styles.button} btn-sm`}>{editingGood ? 'Zaktualizuj produkt' : 'Dodaj produkt'}</Button>
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
                                <td className={styles.tableCell} data-label="Produkt">{good.stock.Tow_Opis}</td>
                                <td className={styles.tableCell} data-label="Kolor">{good.color.Kol_Opis}</td>
                                <td className={styles.tableCell} data-label="Nazwa produktu">{good.fullName}</td>
                                <td className={styles.tableCell} data-label="Kod produktu">{good.code}</td>
                                <td className={styles.tableCell} data-label="Kategoria">{good.category}</td> 
                                <td className={styles.tableCell} data-label="Podkategoria">{good.subcategory ? good.subcategory.Kat_1_Opis_1 : ''}</td>
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
                                    {good.priceExceptions.map((exception, i) => (
                                        <span key={i}>
                                            {exception.size.Roz_Opis}={exception.value}
                                            {i < good.priceExceptions.length - 1 && ', '}
                                        </span>
                                    ))}
                                </td>
                                <td className={styles.tableCell} data-label="Płeć">{good.sex}</td> 
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