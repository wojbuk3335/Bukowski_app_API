import React, { useState, useEffect } from 'react';
import styles from './Cennik.module.css';
import { FormGroup, Label, Input, Button, Table, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import defaultPicture from '../../../assets/images/default_image_2.png';

const Cennik = () => {
    // Format price function - remove unnecessary decimal zeros
    const formatPrice = (price) => {
        if (!price && price !== 0) return '';
        const num = parseFloat(price);
        return num % 1 === 0 ? num.toString() : num.toFixed(2);
    };

    // Format discount price - show empty if 0
    const formatDiscountPrice = (price) => {
        if (!price || price === 0) return '';
        const num = parseFloat(price);
        return num % 1 === 0 ? num.toString() : num.toFixed(2);
    };

    const [users, setUsers] = useState([]);
    const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
    const [loading, setLoading] = useState(true);
    const [priceList, setPriceList] = useState([]);
    const [loadingPriceList, setLoadingPriceList] = useState(false);
    const [modal, setModal] = useState(false);
    const [cloneModal, setCloneModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [editDiscountPrice, setEditDiscountPrice] = useState('');
    const [sourcePointForClone, setSourcePointForClone] = useState('');
    const [globalUpdateModal, setGlobalUpdateModal] = useState(false);
    const [syncModal, setSyncModal] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [showOutdatedWarning, setShowOutdatedWarning] = useState(false);
    const [sizes, setSizes] = useState([]);
    const [editPriceExceptions, setEditPriceExceptions] = useState([]);
    const [selectedPicture, setSelectedPicture] = useState(null);

    // Fetch users/selling points from API
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/user');
                const data = await response.json();
                
                // Filtruj użytkowników - usuń admin i magazyn, pozostaw dom i zwykłych użytkowników
                const filteredUsers = (data.users || []).filter(user => {
                    const role = user.role?.toLowerCase();
                    return role !== 'admin' && role !== 'magazyn';
                });
                
                setUsers(filteredUsers);
                
                // Ustaw pierwszy punkt sprzedaży jako domyślny
                if (filteredUsers.length > 0) {
                    setSelectedSellingPoint(filteredUsers[0]._id);
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error fetching users:', error);
                setLoading(false);
            }
        };

        const fetchSizes = async () => {
            try {
                const response = await fetch('/api/excel/size/get-all-sizes');
                if (response.ok) {
                    const data = await response.json();
                    setSizes(data.sizes || []);
                } else {
                    console.error('Error fetching sizes:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching sizes:', error);
            }
        };

        fetchUsers();
        fetchSizes();
    }, []);

    // Fetch price list when selling point changes
    useEffect(() => {
        if (selectedSellingPoint) {
            fetchPriceList(selectedSellingPoint);
        }
    }, [selectedSellingPoint]);

    const handleSellingPointChange = (e) => {
        setSelectedSellingPoint(e.target.value);
    };

    // Fetch price list for selected selling point
    const fetchPriceList = async (sellingPointId) => {
        if (!sellingPointId) return;
        
        setLoadingPriceList(true);
        try {
            const response = await fetch(`/api/pricelists/${sellingPointId}`, {
                // Add headers to suppress console errors for expected 404s
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setPriceList(data.priceList || []);
            } else if (response.status === 404) {
                // Price list doesn't exist for this selling point - this is expected
                setPriceList([]);
                // Don't log 404 errors as they are expected behavior
            } else {
                console.error('Error fetching price list:', response.statusText);
                setPriceList([]);
            }
        } catch (error) {
            // Log only real network/connection errors
            console.error('Network error fetching price list:', error);
            setPriceList([]);
        }
        setLoadingPriceList(false);
        
        // Check for outdated data after loading price list
        if (sellingPointId) {
            checkSynchronization(sellingPointId);
        }
    };
    
    // Check if price list is synchronized with goods
    const checkSynchronization = async (sellingPointId) => {
        try {
            const response = await fetch(`/api/pricelists/${sellingPointId}/compare`);
            if (response.ok) {
                const data = await response.json();
                setComparisonData(data);
                

                
                // Show warning if there are changes
                if (data.summary.totalChanges > 0) {
                    setShowOutdatedWarning(true);
                } else {
                    setShowOutdatedWarning(false);
                }
            }
        } catch (error) {
            console.error('Error checking synchronization:', error);
        }
    };

    // Create initial price list from goods
    const createInitialPriceList = async () => {
        if (!selectedSellingPoint) return;
        
        setLoadingPriceList(true);
        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (response.ok) {
                // Refresh price list with full populated data
                await fetchPriceList(selectedSellingPoint);
                alert('Cennik został utworzony na podstawie aktualnych produktów!');
            } else {
                alert('Błąd podczas tworzenia cennika');
            }
        } catch (error) {
            console.error('Error creating price list:', error);
            alert('Błąd podczas tworzenia cennika');
        }
        setLoadingPriceList(false);
    };

    // Clone price list from another selling point
    const clonePriceList = async () => {
        if (!selectedSellingPoint || !sourcePointForClone) return;
        
        setLoadingPriceList(true);
        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}/clone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sourceSellingPointId: sourcePointForClone }),
            });
            
            if (response.ok) {
                // Refresh price list with full populated data
                await fetchPriceList(selectedSellingPoint);
                setCloneModal(false);
                setSourcePointForClone('');
                alert('Cennik został sklonowany!');
            } else {
                alert('Błąd podczas klonowania cennika');
            }
        } catch (error) {
            console.error('Error cloning price list:', error);
            alert('Błąd podczas klonowania cennika');
        }
        setLoadingPriceList(false);
    };

    // Update price for item
    const updatePrice = async () => {
        if (!editingItem || !selectedSellingPoint) return;
        
        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: editingItem._id,
                    price: parseFloat(editPrice) || 0,
                    discountPrice: parseFloat(editDiscountPrice) || 0,
                    priceExceptions: editPriceExceptions,
                }),
            });
            
            if (response.ok) {
                // Refresh the price list to get updated data with populated fields
                await fetchPriceList(selectedSellingPoint);
                
                setModal(false);
                setEditingItem(null);
                setEditPrice('');
                setEditDiscountPrice('');
                setEditPriceExceptions([]);
                alert('Cena została zaktualizowana!');
            } else {
                alert('Błąd podczas aktualizacji ceny');
            }
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Błąd podczas aktualizacji ceny');
        }
    };

    // Handle edit button click
    const handleEdit = (item) => {
        setEditingItem(item);
        setEditPrice(item.price || '');
        setEditDiscountPrice(item.discountPrice || '');
        
        // Set up price exceptions for editing
        if (item.priceExceptions && item.priceExceptions.length > 0) {
            const validPriceExceptions = item.priceExceptions.map(exception => {
                const size = sizes.find(size => size._id === exception.size?._id);
                if (!size) {
                    console.warn(`Nie znaleziono rozmiaru dla exception: ${exception.size?._id}`);
                    return null;
                }
                return {
                    size: size._id,
                    value: exception.value
                };
            }).filter(exception => exception !== null);
            
            setEditPriceExceptions(validPriceExceptions);
        } else {
            setEditPriceExceptions([]);
        }
        
        setModal(true);
    };

    // Price exception handlers
    const handlePriceExceptionChange = (index, field, value) => {
        const newPriceExceptions = [...editPriceExceptions];
        newPriceExceptions[index][field] = value;
        setEditPriceExceptions(newPriceExceptions);
    };

    const handleAddPriceException = () => {
        setEditPriceExceptions([...editPriceExceptions, { size: '', value: 0 }]);
    };

    const handleRemovePriceException = (index) => {
        const newPriceExceptions = editPriceExceptions.filter((_, i) => i !== index);
        setEditPriceExceptions(newPriceExceptions);
    };

    // Handle picture click for enlargement
    const handlePictureClick = (picture) => {
        setSelectedPicture(picture);
    };

    const handleClosePictureModal = () => {
        setSelectedPicture(null);
    };

    // Delete price list
    const deletePriceList = async () => {
        if (!window.confirm('Czy na pewno chcesz usunąć cały cennik? Ta akcja jest nieodwracalna!')) {
            return;
        }

        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setPriceList([]);
                alert('Cennik został usunięty pomyślnie');
            } else {
                const error = await response.json();
                alert(`Błąd podczas usuwania cennika: ${error.message}`);
            }
        } catch (error) {
            console.error('Error deleting price list:', error);
            alert('Wystąpił błąd podczas usuwania cennika');
        }
    };



    // Add new products to ALL existing price lists
    const addNewProductsToAll = async () => {
        try {
            const response = await fetch('/api/pricelists/add-new-to-all', {
                method: 'POST',
            });

            if (response.ok) {
                const result = await response.json();
                setGlobalUpdateModal(false);
                
                // Refresh current price list if it was updated
                if (selectedSellingPoint) {
                    await fetchPriceList(selectedSellingPoint);
                }
                
                // Show detailed results
                let message = `✅ Globalna aktualizacja zakończona!\n\n`;
                message += `📊 Zaktualizowano ${result.updatedListsCount} cenników\n`;
                message += `📦 Dodano łącznie ${result.totalAddedProducts} nowych produktów\n\n`;
                
                if (result.updateResults.length > 0) {
                    message += `📋 Szczegóły:\n`;
                    result.updateResults.forEach(update => {
                        message += `• ${update.sellingPointName}: +${update.addedCount} produktów\n`;
                    });
                } else {
                    message += `ℹ️ Wszystkie cenniki są już aktualne - nie dodano nowych produktów.`;
                }
                
                alert(message);
            } else {
                const error = await response.json();
                alert(`Błąd podczas globalnej aktualizacji: ${error.message}`);
            }
        } catch (error) {
            console.error('Error adding new products to all price lists:', error);
            alert('Wystąpił błąd podczas globalnej aktualizacji cenników');
        }
    };

    // Open synchronization modal with comparison data
    const openSyncModal = async () => {
        setLoadingComparison(true);
        setSyncModal(true);
        
        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}/compare`);
            if (response.ok) {
                const data = await response.json();
                setComparisonData(data);
            } else {
                console.error('Error fetching comparison data');
                alert('Błąd podczas pobierania danych porównania');
            }
        } catch (error) {
            console.error('Error fetching comparison data:', error);
            alert('Wystąpił błąd podczas pobierania danych porównania');
        }
        
        setLoadingComparison(false);
    };

    // Synchronize ALL price lists with goods (global)
    const synchronizeAllPriceLists = async (updateOutdated = true, addNew = true, removeDeleted = false) => {
        try {
            const response = await fetch('/api/pricelists/sync-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updateOutdated,
                    addNew,
                    removeDeleted
                })
            });

            if (response.ok) {
                const result = await response.json();
                setSyncModal(false);
                setShowOutdatedWarning(false);
                
                // Refresh current price list
                if (selectedSellingPoint) {
                    await fetchPriceList(selectedSellingPoint);
                }
                
                let message = `✅ Globalna synchronizacja zakończona!\n\n`;
                message += `📊 Zsynchronizowano ${result.updatedListsCount} cenników\n`;
                message += `🔄 Zaktualizowano łącznie ${result.totalUpdatedProducts} produktów\n`;
                message += `➕ Dodano łącznie ${result.totalAddedProducts} nowych produktów\n`;
                if (result.totalRemovedProducts > 0) {
                    message += `➖ Usunięto łącznie ${result.totalRemovedProducts} produktów\n`;
                }
                
                alert(message);
            } else {
                const error = await response.json();
                alert(`Błąd podczas globalnej synchronizacji: ${error.message}`);
            }
        } catch (error) {
            console.error('Error synchronizing all price lists:', error);
            alert('Wystąpił błąd podczas globalnej synchronizacji');
        }
    };

    // Synchronize price list with goods
    const synchronizePriceList = async (updateOutdated = true, addNew = true, removeDeleted = false) => {
        try {
            const response = await fetch(`/api/pricelists/${selectedSellingPoint}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updateOutdated,
                    addNew,
                    removeDeleted
                })
            });

            if (response.ok) {
                const result = await response.json();
                setPriceList(result.priceList);
                setSyncModal(false);
                setShowOutdatedWarning(false);
                
                const { updatedCount, addedCount, removedCount } = result.summary;
                let message = 'Synchronizacja zakończona!\n';
                if (updatedCount > 0) message += `Zaktualizowano: ${updatedCount} produktów\n`;
                if (addedCount > 0) message += `Dodano: ${addedCount} nowych produktów\n`;
                if (removedCount > 0) message += `Usunięto: ${removedCount} produktów\n`;
                
                alert(message);
            } else {
                const error = await response.json();
                alert(`Błąd podczas synchronizacji: ${error.message}`);
            }
        } catch (error) {
            console.error('Error synchronizing price list:', error);
            alert('Wystąpił błąd podczas synchronizacji cennika');
        }
    };

    // Znajdz wybrany punkt sprzedaży
    const selectedUser = users.find(user => user._id === selectedSellingPoint);
    
    // Formatuj nazwę punktu sprzedaży
    const getSellingPointName = (user) => {
        if (!user) return '';
        
        if (user.role === 'magazyn') return 'Magazyn';
        if (user.role === 'dom') return 'Dom';
        return user.sellingPoint || user.symbol || 'Nieznany punkt';
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingSpinner}>
                    Ładowanie...
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with simple text and select - centered */}
            <div className="d-flex align-items-center justify-content-center mb-3">
                <span className="me-2" style={{color: 'white', fontSize: '16px'}}>Cenniki - wybierz dla:</span>
                <Input
                    type="select"
                    value={selectedSellingPoint}
                    onChange={handleSellingPointChange}
                    style={{width: '200px', fontSize: '14px'}}
                >
                    {users.map((user) => (
                        <option key={user._id} value={user._id}>
                            {getSellingPointName(user)}
                        </option>
                    ))}
                </Input>
            </div>

            {/* Warning about outdated data */}
            {showOutdatedWarning && comparisonData && (
                <div className="alert alert-warning text-center mb-3" style={{backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7'}}>
                    <strong>⚠️ Cennik wymaga aktualizacji!</strong>
                    <br />
                    Znaleziono zmiany: {comparisonData.summary.outdatedCount} zaktualizowanych, {comparisonData.summary.newCount} nowych, {comparisonData.summary.removedCount} usuniętych produktów
                    <br />
                    <small>Użyj przycisku "🔄 Synchronizuj z kartami" poniżej aby zsynchronizować dane</small>
                </div>
            )}

            {selectedUser && (
                <div>
                    {loadingPriceList && (
                        <div className={styles.loadingSpinner}>
                            Ładowanie cennika...
                        </div>
                    )}

                    {!loadingPriceList && priceList.length === 0 && (
                        <div className="d-flex justify-content-center mb-3">
                            <div className={`btn-group ${styles.btnGroup}`}>
                                <Button color="primary" className="btn btn-sm" onClick={createInitialPriceList}>
                                    Utwórz cennik z kart produktu
                                </Button>
                            </div>
                        </div>
                    )}

                    {!loadingPriceList && priceList.length > 0 && (
                        <>
                            {/* Action buttons like in Goods */}
                            <div className="d-flex justify-content-center mb-3">
                                <div className={`btn-group ${styles.btnGroup}`}>
                                    <Button color="info" className="btn btn-sm" onClick={() => setCloneModal(true)}>
                                        Sklonuj z innego punktu
                                    </Button>
                                    {showOutdatedWarning && comparisonData && comparisonData.summary.totalChanges > 0 && (
                                        <Button 
                                            color="primary" 
                                            className="btn btn-sm" 
                                            onClick={() => synchronizeAllPriceLists(true, true, false)}
                                            style={{animation: 'pulse 2s infinite'}}
                                        >
                                            🌐 Aktualizuj i dodaj nowe WSZĘDZIE
                                        </Button>
                                    )}
                                    <Button color="danger" className="btn btn-sm" onClick={deletePriceList}>
                                        Usuń cennik
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
                                            <th className={styles.tableHeader}>Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceList.map((item, index) => (
                                            <tr key={item._id}>
                                                <th scope="row" className={styles.tableCell} data-label="Lp">{index + 1}</th>
                                                <td className={styles.tableCell} data-label="Produkt">{item.stock ? item.stock.Tow_Opis : item.bagProduct || '-'}</td>
                                                <td className={styles.tableCell} data-label="Kolor">{item.color ? item.color.Kol_Opis : '-'}</td>
                                                <td className={styles.tableCell} data-label="Nazwa produktu">{item.fullName || '-'}</td>
                                                <td className={styles.tableCell} data-label="Kod produktu">{item.code || '-'}</td>
                                                <td className={styles.tableCell} data-label="Kategoria">{item.category || '-'}</td>
                                                <td className={styles.tableCell} data-label="Podkategoria">
                                                    {item.category === 'Kurtki kożuchy futra' ? 
                                                        (item.subcategory ? item.subcategory.Kat_1_Opis_1 : '') : 
                                                    item.category === 'Torebki' ?
                                                        (item.subcategory ? item.subcategory.Kat_1_Opis_1 : '') :
                                                    item.category === 'Portfele' ?
                                                        (item.subcategory ? item.subcategory.Kat_1_Opis_1 : '') :
                                                    item.category === 'Pozostały asortyment' ?
                                                        (item.subcategory ? item.subcategory.Kat_1_Opis_1 : '') :
                                                        ''
                                                    }
                                                </td>
                                                <td className={styles.tableCell} data-label="Podpodkategoria">
                                                    {item.category === 'Pozostały asortyment' ? 
                                                        (item.remainingsubsubcategory || '') : 
                                                        ''
                                                    }
                                                </td>
                                                <td className={styles.tableCell} data-label="Grupa">{item.manufacturer ? item.manufacturer.Prod_Opis : '-'}</td>
                                                <td className={styles.tableCell} data-label="Zdjęcie">
                                                    <img 
                                                        src={item.picture ? (item.picture.startsWith('http') ? item.picture : `http://localhost:3000/images/${item.picture}`) : defaultPicture} 
                                                        alt={item.fullName}
                                                        className={styles.thumbnail}
                                                        style={{width: '40px', height: '40px', objectFit: 'cover', cursor: 'pointer'}}
                                                        onClick={() => handlePictureClick(item.picture ? (item.picture.startsWith('http') ? item.picture : `http://localhost:3000/images/${item.picture}`) : defaultPicture)}
                                                        onError={(e) => {
                                                            console.log('Image load error:', e.target.src);
                                                            e.target.src = defaultPicture; // Fallback to default image
                                                        }}
                                                    />
                                                </td>
                                                <td className={styles.tableCell} data-label="Cena">{formatPrice(item.price)}</td>
                                                <td className={styles.tableCell} data-label="Cena promocyjna">{formatDiscountPrice(item.discountPrice)}</td>
                                                <td className={styles.tableCell} data-label="Wyjątki">
                                                    {item.priceExceptions && item.priceExceptions.length > 0 ? 
                                                        item.priceExceptions.map((exception, i) => (
                                                            <span key={i}>
                                                                {exception.size?.Roz_Opis || 'BR'}={formatPrice(exception.value)}
                                                                {i < item.priceExceptions.length - 1 && ', '}
                                                            </span>
                                                        )) : ''
                                                    }
                                                </td>
                                                <td className={styles.tableCell} data-label="Akcje">
                                                    <Button 
                                                        color="warning" 
                                                        size="sm" 
                                                        className="edit"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        Edytuj
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Edit Price Modal */}
            <Modal isOpen={modal} toggle={() => {
                setModal(!modal);
                if (modal) setEditPriceExceptions([]);
            }}>
                <ModalHeader toggle={() => {
                    setModal(!modal);
                    if (modal) setEditPriceExceptions([]);
                }}>
                    Edytuj ceny - {editingItem?.fullName}
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="editPrice">Cena:</Label>
                        <Input
                            type="number"
                            step="0.01"
                            id="editPrice"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="Wprowadź cenę"
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="editDiscountPrice">Cena promocyjna:</Label>
                        <Input
                            type="number"
                            step="0.01"
                            id="editDiscountPrice"
                            value={editDiscountPrice}
                            onChange={(e) => setEditDiscountPrice(e.target.value)}
                            placeholder="Wprowadź cenę promocyjną"
                        />
                    </FormGroup>
                    
                    {/* Price Exceptions - only for jacket category products */}
                    {editingItem?.category === 'Kurtki kożuchy futra' && (
                        <>
                            <FormGroup style={{ marginBottom: '10px' }}>
                                <div>
                                    <Label>Wyjątki cenowe:</Label>
                                </div>
                                <div>
                                    {editPriceExceptions.map((exception, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                            <Input
                                                type="select"
                                                value={exception.size}
                                                onChange={(e) => handlePriceExceptionChange(index, 'size', e.target.value)}
                                                style={{ marginRight: '10px', width: '180px' }}
                                            >
                                                <option value="">Wybierz rozmiar</option>
                                                {sizes.map(size => (
                                                    <option key={size._id} value={size._id}>{size.Roz_Opis}</option>
                                                ))}
                                            </Input>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={exception.value}
                                                onChange={(e) => handlePriceExceptionChange(index, 'value', parseFloat(e.target.value) || 0)}
                                                style={{ marginRight: '10px', width: '110px' }}
                                                min="0"
                                                placeholder="Cena"
                                            />
                                            <Button 
                                                color="danger" 
                                                size="sm" 
                                                onClick={() => handleRemovePriceException(index)}
                                            >
                                                Usuń
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </FormGroup>
                            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                <Button color="primary" size="sm" onClick={handleAddPriceException}>
                                    Dodaj wyjątek
                                </Button>
                            </div>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={updatePrice}>
                        Zapisz
                    </Button>
                    <Button color="secondary" onClick={() => {
                        setModal(false);
                        setEditPriceExceptions([]);
                    }}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Clone Price List Modal */}
            <Modal isOpen={cloneModal} toggle={() => setCloneModal(!cloneModal)}>
                <ModalHeader toggle={() => setCloneModal(!cloneModal)}>
                    Sklonuj cennik z innego punktu
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="sourcePoint">Wybierz punkt źródłowy:</Label>
                        <Input
                            type="select"
                            id="sourcePoint"
                            value={sourcePointForClone}
                            onChange={(e) => setSourcePointForClone(e.target.value)}
                        >
                            <option value="">Wybierz punkt...</option>
                            {users
                                .filter(user => user._id !== selectedSellingPoint)
                                .map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {getSellingPointName(user)}
                                    </option>
                                ))
                            }
                        </Input>
                    </FormGroup>
                    <p className={styles.warningText}>
                        ⚠️ To zastąpi aktualny cennik cennikiem z wybranego punktu!
                    </p>
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="primary" 
                        onClick={clonePriceList}
                        disabled={!sourcePointForClone}
                    >
                        Sklonuj
                    </Button>
                    <Button color="secondary" onClick={() => setCloneModal(false)}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Global Update Modal */}
            <Modal isOpen={globalUpdateModal} toggle={() => setGlobalUpdateModal(!globalUpdateModal)}>
                <ModalHeader toggle={() => setGlobalUpdateModal(!globalUpdateModal)}>
                    🌐 Globalna aktualizacja cenników
                </ModalHeader>
                <ModalBody>
                    <div style={{textAlign: 'center', padding: '20px'}}>
                        <h5>Dodaj nowe produkty do wszystkich cenników</h5>
                        <p>Ta operacja:</p>
                        <ul style={{textAlign: 'left', display: 'inline-block'}}>
                            <li>✅ Znajdzie wszystkie istniejące cenniki w systemie</li>
                            <li>✅ Doda nowe produkty z kart produktu do każdego cennika</li>
                            <li>✅ <strong>Zachowa wszystkie ręcznie zmienione ceny</strong></li>
                            <li>✅ Zachowa wszystkie promocje i zniżki</li>
                            <li>📊 Pokaże szczegółowy raport aktualizacji</li>
                        </ul>
                        <div className={styles.warningText} style={{marginTop: '15px'}}>
                            ⚠️ Operacja może potrwać kilka sekund dla dużej liczby cenników
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="warning" onClick={addNewProductsToAll}>
                        🚀 Aktualizuj wszystkie cenniki
                    </Button>
                    <Button color="secondary" onClick={() => setGlobalUpdateModal(false)}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Synchronization Modal */}
            <Modal isOpen={syncModal} toggle={() => setSyncModal(!syncModal)} size="lg">
                <ModalHeader toggle={() => setSyncModal(!syncModal)}>
                    🔄 Synchronizacja cennika z kartami produktu
                </ModalHeader>
                <ModalBody>
                    {loadingComparison ? (
                        <div className="text-center">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Ładowanie...</span>
                            </div>
                            <p className="mt-2">Porównywanie danych...</p>
                        </div>
                    ) : comparisonData ? (
                        <div>
                            <div className="alert alert-info">
                                <h6>📊 Podsumowanie zmian:</h6>
                                <ul className="mb-0">
                                    <li>🔄 Produkty do aktualizacji: <strong>{comparisonData.summary.outdatedCount}</strong></li>
                                    <li>➕ Nowe produkty: <strong>{comparisonData.summary.newCount}</strong></li>
                                    <li>❌ Usunięte produkty: <strong>{comparisonData.summary.removedCount}</strong></li>
                                </ul>
                            </div>

                            {comparisonData.changes.outdatedItems.length > 0 && (
                                <div className="mb-3">
                                    <h6>🔄 Produkty wymagające aktualizacji:</h6>
                                    <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px'}}>
                                        {comparisonData.changes.outdatedItems.map((item, index) => (
                                            <div key={index} className="mb-2 p-2" style={{backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                                                <strong>{item.priceListItem.fullName}</strong>
                                                <br />
                                                {item.changes.map((change, idx) => (
                                                    <small key={idx} className="text-muted">
                                                        {change.field}: "{change.oldValue}" → "{change.newValue}"
                                                        {idx < item.changes.length - 1 && <br />}
                                                    </small>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {comparisonData.changes.newItems.length > 0 && (
                                <div className="mb-3">
                                    <h6>➕ Nowe produkty do dodania:</h6>
                                    <div style={{maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px'}}>
                                        {comparisonData.changes.newItems.slice(0, 10).map((item, index) => (
                                            <div key={index} className="mb-1">
                                                <small>{item.fullName}</small>
                                            </div>
                                        ))}
                                        {comparisonData.changes.newItems.length > 10 && (
                                            <small className="text-muted">...i {comparisonData.changes.newItems.length - 10} więcej</small>
                                        )}
                                    </div>
                                </div>
                            )}

                            {comparisonData.summary.totalChanges === 0 && (
                                <div className="alert alert-success">
                                    ✅ Cennik jest już zsynchronizowany z kartami produktu!
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="alert alert-warning">
                            Nie udało się pobrać danych porównania.
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {comparisonData && comparisonData.summary.totalChanges > 0 && (
                        <>
                            <Button 
                                color="success" 
                                onClick={() => synchronizePriceList(true, true, false)}
                                disabled={loadingComparison}
                            >
                                ✅ Aktualizuj i dodaj nowe (tylko ten cennik)
                            </Button>
                            <Button 
                                color="warning" 
                                onClick={() => synchronizePriceList(true, false, false)}
                                disabled={loadingComparison}
                            >
                                🔄 Tylko aktualizuj istniejące
                            </Button>
                        </>
                    )}
                    <Button color="secondary" onClick={() => setSyncModal(false)}>
                        Zamknij
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Picture enlargement modal */}
            {selectedPicture && (
                <Modal 
                    isOpen={true} 
                    toggle={handleClosePictureModal} 
                    size="lg"
                    className={styles.pictureModal}
                >
                    <ModalHeader toggle={handleClosePictureModal}>Zdjęcie produktu</ModalHeader>
                    <ModalBody className="text-center">
                        <img 
                            src={selectedPicture} 
                            alt="Powiększone zdjęcie produktu" 
                            style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain' }} 
                        />
                    </ModalBody>
                </Modal>
            )}
        </div>
    );
};

export default Cennik;