import React, { Fragment, useEffect, useState } from "react";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './RemainingProducts.module.css';

const RemainingProducts = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentProduct, setCurrentProduct] = useState({ _id: '', Poz_Kod: '' });
    const [startingNumber, setStartingNumber] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (product) => {
        setCurrentProduct(product);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentProduct({ ...currentProduct, Poz_Kod: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Poz_Kod value is unique
            const response = await axios.get(`/api/excel/remaining-products/get-all-remaining-products`);
            const products = response.data.remainingProducts;
            const duplicate = products.find(product => product.Poz_Kod === currentProduct.Poz_Kod && product._id !== currentProduct._id);

            if (duplicate && currentProduct.Poz_Kod !== "") {
                alert(`Wartość Poz_Kod "${currentProduct.Poz_Kod}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/remaining-products/update-remaining-products/${currentProduct._id}`, { Poz_Kod: currentProduct.Poz_Kod });
            fetchData();
            toggleModal();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/remaining-products/get-all-remaining-products`)).data;
            // Sort in descending order - newest (highest number) on top
            const sortedProducts = Array.isArray(result.remainingProducts) ? result.remainingProducts.sort((a, b) => Number(b.Poz_Nr) - Number(a.Poz_Nr)) : [];
            setRows(sortedProducts);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartingNumberChange = (e) => {
        const value = parseInt(e.target.value) || 10;
        setStartingNumber(value);
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current products to find next Poz_Nr
            const productList = await getProductList();
            
            let nextPozNr;
            if (productList.length === 0) {
                // First row - use starting number, ale sprawdź czy jest w zakresie
                if (startingNumber < 10 || startingNumber > 99) {
                    alert("Numer początkowy musi być w zakresie 10-99.");
                    setLoading(false);
                    return;
                }
                nextPozNr = startingNumber;
            } else {
                // Subsequent rows - increment from max
                const maxPozNr = Math.max(...productList.map(product => Number(product.Poz_Nr) || 0));
                nextPozNr = maxPozNr + 1;
            }

            // Check if we reached the limit (max 99 positions)
            if (nextPozNr > 99) {
                alert("Osiągnięto maksymalną liczbę produktów (99). Nie można dodać więcej wierszy.");
                setLoading(false);
                return;
            }

            // Create new product
            const newProduct = {
                Poz_Nr: nextPozNr,
                Poz_Kod: ""
            };

            await axios.post('/api/excel/remaining-products/insert-remaining-products', [newProduct]);
            
            fetchData();
        } catch (error) {
            console.log(error);
            alert("Błąd podczas dodawania nowego wiersza");
        } finally {
            setLoading(false);
        }
    };

    const getProductList = async () => {
        try {
            const url = `/api/excel/remaining-products/get-all-remaining-products`;
            const productResponse = (await axios.get(url)).data;
            return Array.isArray(productResponse.remainingProducts) ? productResponse.remainingProducts : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Poz_Nr</th>
                    <th>Poz_Kod</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Poz_Nr} id={item._id}>{item.Poz_Nr}</td>
                        <td id_from_excel_column={item.Poz_Nr} id={item._id}>{item.Poz_Kod}</td>
                        <td id_from_excel_column={item.Poz_Nr} id={item._id}>
                            <Button id_from_excel_column={item.Poz_Nr} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

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
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Pozostały asortyment
                </h3>
                <div className={styles.container}>
                    {rows.length === 0 && (
                        <Row className={styles.xxx}>
                            <Col md="12" className={styles.textCenter}>
                                <FormGroup>
                                    <label className={styles.textWhite} style={{ marginBottom: '10px', display: 'block' }}>
                                        Numer początkowy (od którego zacząć liczenie):
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={startingNumber}
                                        onChange={handleStartingNumberChange}
                                        style={{ 
                                            width: '100px', 
                                            margin: '0 auto 20px auto',
                                            backgroundColor: 'black',
                                            color: 'white',
                                            border: '1px solid white'
                                        }}
                                    />
                                    <div className={styles.textWhite} style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
                                        Liczenie będzie od {startingNumber} do 99 (max {99 - startingNumber + 1} pozycji)
                                    </div>
                                </FormGroup>
                            </Col>
                        </Row>
                    )}
                    <Row className={styles.xxx}>
                        <Col md="12" className={styles.textCenter}>
                            <div className={styles.buttonGroup}>
                                <Button disabled={loading} color="primary" size="sm" className={`${styles.button} ${styles.buttonAdd}`} onClick={addNewRow}>
                                    {"Dodaj nowy wiersz"}
                                </Button>
                                <Button color="secondary" size="sm" className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                            </div>
                        </Col>
                    </Row>
                    {renderDataTable()}
                </div>
            </Fragment>

            {/* Modal dla edycji */}
            <Modal 
                isOpen={modal} 
                toggle={toggleModal}
                contentClassName="bg-dark text-white border-white"
                style={{ 
                    '--bs-modal-bg': 'black',
                    '--bs-modal-header-bg': 'black',
                    '--bs-modal-body-bg': 'black',
                    '--bs-modal-footer-bg': 'black'
                }}
            >
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>
                    Aktualizuj Poz_Kod
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentProduct.Poz_Kod}
                            onChange={handleUpdateChange}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className={styles.modalFooter}>
                    <Button color="primary" size="sm" className={styles.button} onClick={handleUpdateSubmit}>Aktualizuj</Button>{' '}
                    <Button color="secondary" size="sm" className={styles.button} onClick={toggleModal}>Anuluj</Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default RemainingProducts;