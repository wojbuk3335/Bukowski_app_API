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
} from "reactstrap";
import axios from "axios";

const requiredFields = ["Tow_Kod", "Tow_Opis"];

const Stock = () => {

    const [loading, setLoading] = useState(false);
    const [excelRows, setExcelRows] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rows, setRows] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const removeFile = async () => {
        try {
            setLoading(true);
            await axios.delete("http://localhost:3000/api/excel/stock/delete-all-stocks");
            setSelectedFile(null);
            setExcelRows([]);
            fetchData(); // Fetch the updated data to refresh the table
            alert("Dane zostały usunięte poprawnie.");
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.log(error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const result = (await axios.get("http://localhost:3000/api/excel/stock/get-all-stocks")).data;
            setRows(Array.isArray(result.stocks) ? result.stocks : []);
            setLoading(false);
            console.log(result);
        } catch (error) {
            setLoading(false);
        }
    };

    const uploadData = async () => {
        try {
            // Check if a file has been selected
            if (!selectedFile) {
                alert("Proszę wybrać plik do załadowania danych.");
                return;
            }
    
            setLoading(true);
    
            // Check if the required fields are present in the uploaded file
            const firstItemKeys = excelRows[0] && Object.keys(excelRows[0]);
            let requiredValidation = false;
    
            if (firstItemKeys.length) {
                requiredFields.forEach((element) => {
                    if (!firstItemKeys.find((x) => x === element)) {
                        requiredValidation = true;
                    }
                });
            }
    
            if (requiredValidation) {
                alert("Wymagane dane: " + JSON.stringify(requiredFields)+". Proszę również umieścić dane w pierwszym arkuszu excela.");
                setLoading(false);
                return;
            }
    
            // Check if the stocks collection exists and if it is empty
            const stockResponse = (await axios.get("http://localhost:3000/api/excel/stock/get-all-stocks")).data;
            const stockList = Array.isArray(stockResponse.stocks) ? stockResponse.stocks : [];
    
            if (stockList.length > 0) {
                alert("Tabela asortymentu nie jest pusta. Proszę usunąć wszystkie dane aby wgrać nowe.");
                setLoading(false);
                return;
            }
    
            // Prepare the stocks data for insertion
            const stocks = excelRows.map((obj) => ({
                _id: stockList.find((x) => x.Tow_Kod === obj["Tow_Kod"])?._id,
                Tow_Kod: obj["Tow_Kod"] || "",
                Tow_Opis: obj["Tow_Opis"] || ""
            }));
    
            const updatedStocks = stocks.filter((x) => x._id);
            const newStocks = stocks.filter((x) => !x._id);
    
            if (updatedStocks.length) {
                const result = (await axios.post("http://localhost:3000/api/excel/stock/update-many-stocks", updatedStocks)).data;
                if (result) {
                    alert("Dodano pomyślnie " + updatedStocks.length + " rekordów.");
                }
            }
    
            if (newStocks.length) {
                const result = (await axios.post("http://localhost:3000/api/excel/stock/insert-many-stocks", newStocks)).data;
                if (result) {
                    alert("Dodano pomyślnie " + newStocks.length + " rekordów.");
                }
            }
    
            // Fetch the updated data to display in the table
            fetchData();
    
            setLoading(false);
        } catch (error) {
            setLoading(false);
            console.log(error);
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
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = utils.sheet_to_json(worksheet);
                    setExcelRows(json);
                    console.log(json);
                } catch (error) {
                    if (error.message.includes("File is password-protected")) {
                        alert("Plik jest chroniony hasłem. Proszę wybrać inny plik.");
                    } else {
                        alert("Wystąpił błąd podczas przetwarzania pliku. Proszę spróbować ponownie.");
                        console.log(error);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    function renderDataTable() {
        return (
            <Table>
                <thead>
                    <tr>
                        <th>Tow_Kod</th>
                        <th>Tow_Opis</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.Tow_Kod}</td>
                            <td>{item.Tow_Opis}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        );
    }

    return (
        <div>
            <Fragment>
                <h3 className="text-center mt-4 mb-4">
                    Asortyment
                </h3>
                <div className="container">
                    <div className="row">
                    </div>
                    <Row>
                        <Col md="6 text-left">
                            <FormGroup>
                                <Input
                                    id="inputEmpGroupFile"
                                    name="file"
                                    type="file"
                                    onChange={readUploadFile}
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                />
                                <FormText>
                                    {
                                        "NOTE: The headers in the Excel file should be as follows!. => "
                                    }
                                    {requiredFields.join(", ")}
                                </FormText>
                            </FormGroup>
                        </Col>
                        <Col md="6 text-left">
                                <Button disabled={loading} color="success" onClick={uploadData}>
                                    {"Upload data"}
                                </Button>
                                <Button disabled={loading} color="danger" onClick={removeFile}>
                                    {"Remove file"}
                                </Button>
                        </Col>
                    </Row>
                    {loading && <progress style={{ width: "100%" }}></progress>}
                    <h4 className="mt-4" style={{ color: "lightgray" }}>
                    </h4>
                    <button onClick={fetchData}>Refresh</button>
                    {renderDataTable()}
                </div>
            </Fragment>
        </div>
    );
};

export default Stock;