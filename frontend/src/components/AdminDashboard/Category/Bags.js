import React, { Fragment, useEffect, useState } from "react";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Label,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './Category.module.css';

const Bags = () => {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentBagCategory, setCurrentBagCategory] = useState({ _id: '', Kat_1_Opis_1: '', Plec: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (bagCategory) => {
        setCurrentBagCategory(bagCategory);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        const { name, value } = e.target;
        setCurrentBagCategory({ ...currentBagCategory, [name]: value });
    };

    const addNewRow = async () => {
        try {
            setLoading(true);

            // Get current categories to find next Kat_1_Kod_1
            const categoryList = await getBagCategoryList();
            
            let nextCode;
            if (categoryList.length === 0) {
                // First row - start from 1
                nextCode = 1;
            } else {
                // Subsequent rows - increment from max
                const maxCode = Math.max(...categoryList.map(cat => Number(cat.Kat_1_Kod_1) || 0));
                nextCode = maxCode + 1;
            }

            // Create new category
            const newCategory = {
                Kat_1_Kod_1: nextCode.toString(),
                Kat_1_Opis_1: "",
                Plec: "D" // Default value
            };

            await axios.post('/api/excel/subcategoryBags/insert-many-bags-categories', [newCategory]);
            
            fetchData();
            alert('Nowy wiersz został dodany pomyślnie!');
        } catch (error) {
            console.error('Error adding new row:', error);
            alert('Błąd podczas dodawania nowego wiersza: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kat_1_Opis_1 value is unique
            const response = await axios.get(`/api/excel/subcategoryBags/get-all-bags-categories`);
            const bagCategories = response.data.bagCategories;
            const duplicate = bagCategories.find(bagCategory => bagCategory.Kat_1_Opis_1 === currentBagCategory.Kat_1_Opis_1 && bagCategory._id !== currentBagCategory._id);

            if (duplicate && currentBagCategory.Kat_1_Opis_1 !== "") {
                alert(`Wartość Kat_1_Opis_1 "${currentBagCategory.Kat_1_Opis_1}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/subcategoryBags/update-bags-category/${currentBagCategory._id}`, { 
                Kat_1_Opis_1: currentBagCategory.Kat_1_Opis_1,
                Plec: currentBagCategory.Plec 
            });
            fetchData();
            toggleModal();
        } catch (error) {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/subcategoryBags/get-all-bags-categories`)).data;
            const categories = Array.isArray(result.bagCategories) ? result.bagCategories : [];
            
            // Sort by Kat_1_Kod_1 in descending order (newest/highest codes first)
            const sortedCategories = categories.sort((a, b) => {
                const codeA = parseInt(a.Kat_1_Kod_1) || 0;
                const codeB = parseInt(b.Kat_1_Kod_1) || 0;
                return codeB - codeA; // Descending order
            });
            
            setRows(sortedCategories);
        } catch (error) {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

    const getBagCategoryList = async () => {
        const categoryResponse = (await axios.get(`/api/excel/subcategoryBags/get-all-bags-categories`)).data;
        return Array.isArray(categoryResponse.bagCategories) ? categoryResponse.bagCategories : [];
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
                    Podkategorie torebek
                </h3>
                <div className={styles.container}>
                    <div className={styles.buttonGroup}>
                        <Button 
                            disabled={loading} 
                            color="primary" 
                            size="sm" 
                            className={`${styles.button} ${styles.mb3}`} 
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
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Edytuj kategorię torebek</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Label for="kat1Opis1">Kat_1_Opis_1</Label>
                        <Input
                            id="kat1Opis1"
                            name="Kat_1_Opis_1"
                            type="text"
                            value={currentBagCategory.Kat_1_Opis_1}
                            onChange={handleUpdateChange}
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label for="plec">Rodzaj</Label>
                        <Input
                            id="plec"
                            name="Plec"
                            type="select"
                            value={currentBagCategory.Plec}
                            onChange={handleUpdateChange}
                        >
                            <option value="">Wybierz rodzaj</option>
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

export default Bags;