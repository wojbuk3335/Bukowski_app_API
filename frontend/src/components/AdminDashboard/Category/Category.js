import React, { Fragment, useEffect, useState } from "react";
import { read, utils } from "xlsx";
import {
    Col,
    Row,
    Button,
    FormGroup,
    Input,
    Table,
    FormText,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "reactstrap";
import axios from "axios";
import styles from './Category.module.css';

const requiredFields = ["Kat_Kod", "Kat_Opis"];


const Category = () => {
    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [modal, setModal] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ _id: '', Kat_Opis: '' });

    useEffect(() => {
        const initialize = async () => {
            fetchData();
        };
        initialize();
    }, []);

    const toggleModal = () => setModal(!modal);

    const handleUpdateClick = (category) => {
        setCurrentCategory(category);
        toggleModal();
    };

    const handleUpdateChange = (e) => {
        setCurrentCategory({ ...currentCategory, Kat_Opis: e.target.value });
    };

    const handleUpdateSubmit = async () => {
        try {
            setLoading(true);

            // Check if the Kat_Opis value is unique
            const response = await axios.get(`/api/excel/category/get-all-categories`);
            const categories = response.data.categories;
            const duplicate = categories.find(category => category.Kat_Opis === currentCategory.Kat_Opis && category._id !== currentCategory._id);

            if (duplicate && currentCategory.Kat_Opis !== "") {
                alert(`Wartość Kat_Opis "${currentCategory.Kat_Opis}" już istnieje w bazie danych. Proszę wybrać inną wartość.`);
                setLoading(false);
                return;
            }

            await axios.patch(`/api/excel/category/update-category/${currentCategory._id}`, { Kat_Opis: currentCategory.Kat_Opis });
            fetchData();
            toggleModal();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const removeFile = async () => {
        try {
            setLoading(true);

            // Check if there are any records in the goods database
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            if (goodsResponse.data.goods.length > 0) {
                alert("Nie można usunąć kategorii ponieważ na ich podstawie zostały już stworzone gotowe produkty. Usuń najpierw wszystkie produkty i spróbuj ponownie");
                setLoading(false);
                return;
            }

            await axios.delete(`/api/excel/category/delete-all-categories`);
            resetState();
            alert("Dane zostały usunięte poprawnie.");
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get(`/api/excel/category/get-all-categories`)).data;
            setRows(Array.isArray(result.categories) ? result.categories : []);
            console.log(result);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const uploadData = async () => {
        try {
            if (!selectedFile) {
                alert("Proszę wybrać plik do załadowania danych.");
                return;
            }

            setLoading(true);

            // Check if there are any records in the goods database
            const goodsResponse = await axios.get(`/api/excel/goods/get-all-goods`);
            if (goodsResponse.data.goods.length > 0) {
                alert("Na bazie istaniejego asortymentu zostały już stworzone produkty... Proszę usunąć wszystkie produkty i spróbować ponownie");
                setLoading(false);
                return;
            }

            if (!validateRequiredFields()) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields) + ". Proszę również umieścić dane w czwartym arkuszu excela.");
                return;
            }

            const categoryList = await getCategoryList();
            if (categoryList.length > 0) {
                alert("Tabela kategorii nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                return;
            }

            await insertOrUpdateCategories(categoryList);

            fetchData();
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const readUploadFile = (e) => {
        e.preventDefault();
        if (e.target.files) {
            const file = e.target.files[0];
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = read(data, { type: "array" });
                    const sheetName = workbook.SheetNames[3]; // Fourth sheet
                    const worksheet = workbook.Sheets[sheetName];
                    const json = utils.sheet_to_json(worksheet);
                    console.log("Read data from fourth sheet:", json); // Add this line
                    setExcelRows(json);
                } catch (error) {
                    handleFileReadError(error);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const validateRequiredFields = () => {
        const firstItemKeys = excelRows[0] && Object.keys(excelRows[0]);
        if (firstItemKeys.length) {
            return requiredFields.every((field) => firstItemKeys.includes(field));
        }
        return false;
    };

    const getCategoryList = async () => {
        try {
            const url = `/api/excel/category/get-all-categories`;
            console.log(`Requesting URL: ${url}`);
            const categoryResponse = (await axios.get(url)).data;
            return Array.isArray(categoryResponse.categories) ? categoryResponse.categories : [];
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const insertOrUpdateCategories = async (categoryList) => {
        const categories = excelRows.map((obj) => ({
            _id: categoryList.find((x) => x.Kat_Kod === obj["Kat_Kod"])?._id,
            Kat_Kod: obj["Kat_Kod"] || "",
            Kat_Opis: obj["Kat_Opis"] || "",
            number_id: Number(obj["Kat_Kod"]) || 0
        }));

        const updatedCategories = categories.filter((x) => x._id);
        const newCategories = categories.filter((x) => !x._id);

        if (updatedCategories.length) {
            const result = (await axios.post(`/api/excel/category/update-many-categories`, updatedCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + updatedCategories.length + " rekordów.");
            }
        }

        if (newCategories.length) {
            const result = (await axios.post(`/api/excel/category/insert-many-categories`, newCategories)).data;
            if (result) {
                alert("Dodano pomyślnie " + newCategories.length + " rekordów.");
            }
        }
    };

    const handleFileReadError = (error) => {
        if (error.message.includes("File is password-protected")) {
            alert("Plik jest chroniony hasłem. Proszę wybrać inny plik.");
        } else {
            alert("Wystąpił błąd podczas przetwarzania pliku. Proszę spróbować ponownie.");
            console.log(error);
        }
    };

    const resetState = () => {
        setSelectedFile(null);
        setExcelRows([]);
        fetchData();
    };

    const renderDataTable = () => (
        <Table className={styles.table}>
            <thead>
                <tr>
                    <th>Kat_Kod</th>
                    <th>Kat_Opis</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((item, idx) => (
                    <tr key={idx}>
                        <td id_from_excel_column={item.Kat_Kod} id={item._id} >{item.Kat_Kod}</td>
                        <td id_from_excel_column={item.Kat_Kod} id={item._id}>{item.Kat_Opis}</td>
                        <td id_from_excel_column={item.Kat_Kod} id={item._id}>
                            <Button id_from_excel_column={item.Kat_Kod} id={item._id} color="primary" size="sm" className={styles.button} onClick={() => handleUpdateClick(item)}>Aktualizuj</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div>
            <Fragment>
                <h3 className={`${styles.textCenter} ${styles.mt4} ${styles.mb4} ${styles.textWhite}`}>
                    Kategorie
                </h3>
                <div className={styles.container}>
                    <Row className={styles.xxx}>
                        <Col md="6" className={styles.textLeft}>
                            <FormGroup>
                                <div>
                                <input className={styles.inputFile}
                                        id="inputEmpGroupFile"
                                        name="file"
                                        type="file"
                                        onChange={readUploadFile}
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    />
                                </div>

                                <FormText className={styles.textWhite}>
                                    {"UWAGA: Nagłówki w Excelu powinny być następujące!. => "}
                                    {requiredFields.join(", ")}
                                </FormText>
                            </FormGroup>
                        </Col>
                        <Col md="6" className={styles.textRight}>
                            <Button disabled={loading} color="success" size="sm" className={`${styles.button} ${styles.UploadButton}`} onClick={uploadData}>
                                {"Wczytaj dane z pliku"}
                            </Button>
                            <Button disabled={loading} color="danger" size="sm" className={`${styles.button} ${styles.RemoveFiles}`} onClick={removeFile}>
                                {"Usuń dane z bazy danych"}
                            </Button>
                        </Col>
                    </Row>
                    {loading && <progress className={styles.progress}></progress>}
                    <Button className={`${styles.button} ${styles.buttonRefresh}`} onClick={fetchData}>Odśwież</Button>
                    {renderDataTable()}
                </div>
            </Fragment>

            <Modal isOpen={modal} toggle={toggleModal}>
                <ModalHeader toggle={toggleModal} className={styles.modalHeader}>Aktualizuj Kat_Opis</ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup>
                        <Input
                            type="text"
                            value={currentCategory.Kat_Opis}
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

export default Category;
