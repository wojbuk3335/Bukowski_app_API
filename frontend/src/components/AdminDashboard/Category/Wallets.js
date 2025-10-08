import React, { Fragment, useEffect, useState } from "react";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Table,
    Label,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './Category.module.css';

const Wallets = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentWalletCategory, setCurrentWalletCategory] = useState({ 
        _id: '', 
        Kat_1_Kod_1: '',
        Kat_1_Opis_1: '',
        Plec: 'D'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (walletCategory) => {
        setCurrentWalletCategory(walletCategory);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setCurrentWalletCategory({ 
            ...currentWalletCategory, 
            [name]: value 
        });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kat_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`);
            const walletCategories = response.data.walletCategories;
            const duplicate = walletCategories.find(walletCategory => 
                walletCategory.Kat_1_Opis_1 === currentWalletCategory.Kat_1_Opis_1 && 
                walletCategory._id !== currentWalletCategory._id
            );

            if (duplicate && currentWalletCategory.Kat_1_Opis_1 !== "") {
                alert(`Wartość Kat_1_Opis_1 "${currentWalletCategory.Kat_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/wallets-category/update-wallets-category/${currentWalletCategory._id}`, {
                Kat_1_Opis_1: currentWalletCategory.Kat_1_Opis_1,
                Plec: currentWalletCategory.Plec
            });
            fetchData();
            toggleModal();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const addNewRow = async () => {
        try {
            setLoading(true);
            
            // Pobierz istniejące kategorie aby wygenerować kolejny kod
            const response = await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`);
            const walletCategories = response.data.walletCategories || [];
            
            // Znajdź największy kod i dodaj 1
            const maxCode = walletCategories.reduce((max, category) => {
                const code = parseInt(category.Kat_1_Kod_1);
                return !isNaN(code) && code > max ? code : max;
            }, 0);
            
            const newCode = (maxCode + 1).toString();
            
            const newWalletCategory = {
                Kat_1_Kod_1: newCode,
                Kat_1_Opis_1: '',
                Plec: 'D'
            };
            
            await axios.post(`/api/excel/wallets-category/insert-many-wallets-categories`, [newWalletCategory]);
            fetchData();
            alert(`Dodano nowy wiersz z kodem ${newCode}`);
        } catch (error) {
            console.log(error);
            alert('Błąd podczas dodawania nowego wiersza');
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/wallets-category/get-all-wallets-categories`)).data;
            const walletCategories = Array.isArray(result.walletCategories) ? result.walletCategories : [];
            
            // Sortuj malejąco po Kat_1_Kod_1
            const sortedCategories = walletCategories.sort((a, b) => {
                const codeA = parseInt(a.Kat_1_Kod_1) || 0;
                const codeB = parseInt(b.Kat_1_Kod_1) || 0;
                return codeB - codeA; // malejąco
            });
            
            setRows(sortedCategories);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Kat_1_Kod_1</th>
                    <th>Kat_1_Opis_1</th>
                    <th>Rodzaj</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td>{item.Kat_1_Kod_1}</td>
                        <td>{item.Kat_1_Opis_1}</td>
                        <td>{item.Plec}</td>
                        <td>
                            <Button color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
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
                    Podkategorie portfeli
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="12" className={styles.textLeft}>
                            <div className={styles.buttonGroup}>
                                <Button 
                                    disabled={loading} 
                                    color="primary" 
                                    size="sm" 
                                    className={styles.button} 
                                    onClick={addNewRow}
                                >
                                    Dodaj nowy wiersz
                                </Button>
                                <Button 
                                    className={`${styles.button} ${styles.buttonRefresh}`} 
                                    onClick={fetchData}
                                >
                                    Odśwież
                                </Button>
                            </div>
                        </Col>
                    </Row>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj kategorię portfeli</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="kod">Kat_1_Kod_1</Label>
                        <Input
                            type="text"
                            id="kod"
                            name="Kat_1_Kod_1"
                            value={currentWalletCategory.Kat_1_Kod_1}
                            onChange={handleUpdateChange}
                            disabled
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="opis">Kat_1_Opis_1</Label>
                        <Input
                            type="text"
                            id="opis"
                            name="Kat_1_Opis_1"
                            value={currentWalletCategory.Kat_1_Opis_1}
                            onChange={handleUpdateChange}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="plec">Rodzaj</Label>
                        <Input
                            type="select"
                            id="plec"
                            name="Plec"
                            value={currentWalletCategory.Plec}
                            onChange={handleUpdateChange}
                        >
                            <option value="D">D</option>
                            <option value="M">M</option>
                            <option value="Dz">Dz</option>
                        </Input>
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

export default Wallets;