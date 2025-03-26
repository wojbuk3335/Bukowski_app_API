import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Downshift from 'downshift';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './State.module.css'; // Import the CSS module
import Barcode from 'react-barcode'; // Import the Barcode component
import { saveAs } from 'file-saver'; // For exporting files
import { Modal, ModalHeader, ModalBody, Button, Table, ModalFooter } from 'reactstrap'; // Import reactstrap components
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import jsPDF from 'jspdf'; // Import jsPDF for PDF export
import 'jspdf-autotable'; // Import autotable plugin for jsPDF

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today's date
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState(''); // Manage input value manually
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState(''); // Manage size input value manually
    const [tableData, setTableData] = useState([]); // State to store table data
    const sizeInputRef = React.useRef(null); // Ref for the size input field
    const [searchQuery, setSearchQuery] = useState(''); // State for search input
    const [filteredTableData, setFilteredTableData] = useState([]); // State for filtered table data
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
    const [editData, setEditData] = useState(null); // State for data to edit
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration

    useEffect(() => {
        // Fetch data from the API
        const fetchGoods = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/excel/goods/get-all-goods');
                // Extract the goods array from the response
                if (response.data && Array.isArray(response.data.goods)) {
                    setGoods(response.data.goods);
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setGoods([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching goods:', error);
                setGoods([]); // Fallback to an empty array
            }
        };

        fetchGoods();
    }, []);

    useEffect(() => {
        // Fetch sizes from the API
        const fetchSizes = async () => {
            try {
                const response = await axios.get('/api/excel/size/get-all-sizes');
                // Extract the sizes array from the response
                if (response.data && Array.isArray(response.data.sizes)) {
                    setSizes(response.data.sizes);
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setSizes([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching sizes:', error);
                setSizes([]); // Fallback to an empty array
            }
        };

        fetchSizes();
    }, []);

    const fetchTableData = async () => {
        try {
            const response = await axios.get('/api/state'); // Fetch table data from backend
            const formattedData = response.data.map((row) => ({
                id: row.id,
                fullName: row.fullName?.fullName || row.fullName, // Ensure fullName is a string
                date: row.date,
                size: row.size?.Roz_Opis || row.size, // Ensure size is a string
                barcode: row.barcode, // Ensure barcode is included
            }));
            setTableData(formattedData); // Update table data state
        } catch (error) {
            console.error('Error fetching table data:', error);
        }
    };

    const sendDataToBackend = async (selectedSize) => {
        if (!inputValue.trim() || !selectedSize?.Roz_Opis || !selectedDate) { // Ensure all fields are filled
            alert('Wszystkie dane muszą być uzupełnione'); // Alert if any field is empty
            return;
        }

        try {
            await axios.post('/api/state', {
                fullName: inputValue.trim(), // Trim whitespace before sending
                size: selectedSize.Roz_Opis,
                date: selectedDate.toISOString(), // Ensure date is sent in ISO format
            });
            fetchTableData(); // Refresh table data after successful save

            // Clear inputs
            setInputValue('');
            setSizeInputValue('');

            // Move cursor to the product input field
            document.querySelector('[placeholder="Wybierz pełną nazwę"]')?.focus();
        } catch (error) {
            console.error('Error sending data to backend:', error);
        }
    };

    useEffect(() => {
        fetchTableData(); // Fetch table data on component mount
    }, []);

    useEffect(() => {
        // Filter table data based on search query
        const filteredData = tableData.filter((row) =>
            Object.values(row).some((value) =>
                value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
        setFilteredTableData(filteredData);
    }, [searchQuery, tableData]); // Update filtered data when searchQuery or tableData changes

    const deleteRow = async (id) => {
        try {
            await axios.delete(`/api/state/${id}`); // Send delete request to the backend
            fetchTableData(); // Refresh table data after deletion
        } catch (error) {
            console.error('Error deleting row:', error);
        }
    };

    const fetchEditData = async (id) => {
        try {
            const response = await axios.get(`http://localhost:3000/api/state/${id}`); // Fetch data for editing
            setEditData(response.data); // Set data to edit
            setIsModalOpen(true); // Open modal
        } catch (error) {
            console.error('Error fetching data for editing:', error);
        }
    };

    const handleExport = (format) => {
        switch (format) {
            case 'excel':
                const worksheet = XLSX.utils.json_to_sheet(tableData); // Convert table data to worksheet
                const workbook = XLSX.utils.book_new(); // Create a new workbook
                XLSX.utils.book_append_sheet(workbook, worksheet, 'TableData'); // Append worksheet to workbook
                XLSX.writeFile(workbook, 'tableData.xlsx'); // Save workbook as Excel file
                break;
            case 'json':
                const jsonBlob = new Blob([JSON.stringify(tableData, null, 2)], { type: 'application/json' });
                saveAs(jsonBlob, 'tableData.json');
                break;
            case 'csv':
                const csvContent = tableData.map(row => Object.values(row).join(',')).join('\n');
                const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                saveAs(csvBlob, 'tableData.csv');
                break;
            case 'pdf':
                const doc = new jsPDF(); // Create a new jsPDF instance
                doc.text('Table Data', 10, 10); // Add title
                doc.autoTable({
                    head: [['Nr zamówienia', 'Pełna nazwa', 'Data', 'Rozmiar', 'Barcode']],
                    body: tableData.map((row, index) => [
                        index + 1,
                        row.fullName,
                        new Date(row.date).toLocaleDateString(),
                        row.size,
                        row.barcode,
                    ]),
                });
                doc.save('tableData.pdf'); // Save PDF file
                break;
            default:
                console.error('Unsupported export format:', format);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...filteredTableData].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredTableData(sortedData);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '▲' : '▼'; // Use arrows for sorting direction
        }
        return '⇅'; // Default icon when no sorting is applied
    };

    const tableCellStyle = {
        textAlign: 'center', // Center horizontally
        verticalAlign: 'middle', // Center vertically
    };

    return (
        <div>
            {/* Modal for editing */}
            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)}>
                <ModalHeader toggle={() => setIsModalOpen(false)}>Edit Data</ModalHeader>
                <ModalBody>
                    {editData && (
                        <div>
                            <p>Full Name: {editData.fullName}</p>
                            <p>Date: {new Date(editData.date).toLocaleDateString()}</p>
                            <p>Size: {editData.size}</p>
                            {/* Add form fields for editing if needed */}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setIsModalOpen(false)}>Close</Button>
                </ModalFooter>
            </Modal>

            {/* Export section */}
            <div className="d-flex justify-content-center mb-3">
                <div className="btn-group">
                    <Button color="success" className="me-2 btn btn-sm" onClick={() => handleExport('excel')}>Export to Excel</Button>
                    <Button color="primary" className="me-2 btn btn-sm" onClick={() => handleExport('json')}>Export to JSON</Button>
                    <Button color="info" className="me-2 btn btn-sm" onClick={() => handleExport('csv')}>Export to CSV</Button>
                    <Button color="danger" className="me-2 btn btn-sm" onClick={() => handleExport('pdf')}>Export to PDF</Button>
                </div>
            </div>

            <div className="d-flex align-items-center gap-3 mb-4">
                <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)} // Update selectedDate on change
                    placeholderText="Wybierz datę" // Polish: Select a date
                    className="form-control"
                    dateFormat="yyyy-MM-dd" // Ensure a valid date format
                />
                <Downshift
                    inputValue={inputValue} // Bind inputValue to Downshift
                    onInputValueChange={(newInputValue) => {
                        // Check if the input value matches any item in the dropdown
                        const matches = goods.some((item) =>
                            item.fullName.toLowerCase().startsWith(newInputValue.toLowerCase())
                        );
                        if (matches || newInputValue === '') {
                            setInputValue(newInputValue); // Update input value only if it matches
                            setSizeInputValue(''); // Clear size input value when typing in the product input
                        }
                    }}
                    onChange={(selection) => {
                        sizeInputRef.current?.focus(); // Focus on the size input field
                    }}
                    itemToString={(item) => (item ? item.fullName : '')} // Use fullName for display
                >
                    {({
                        getInputProps,
                        getItemProps,
                        getMenuProps,
                        isOpen,
                        highlightedIndex,
                    }) => (
                        <div className="w-50 position-relative">
                            <input
                                {...getInputProps({
                                    placeholder: 'Wybierz pełną nazwę', // Polish: Select a full name
                                    className: 'form-control',
                                })}
                            />
                            <ul
                                {...getMenuProps()}
                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                            >
                                {isOpen &&
                                    goods
                                        .filter((item) =>
                                            item.fullName
                                                .toLowerCase()
                                                .includes(inputValue.toLowerCase())
                                        )
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <li
                                                key={item._id || index} // Ensure unique key for each item
                                                {...getItemProps({
                                                    index,
                                                    item,
                                                    className: `list-group-item ${highlightedIndex === index
                                                        ? styles.dropdownItemActive
                                                        : styles.dropdownItem
                                                        }`,
                                                })}
                                            >
                                                {item.fullName} {/* Display fullName */}
                                            </li>
                                        ))}
                            </ul>
                        </div>
                    )}
                </Downshift>
                <Downshift
                    inputValue={sizeInputValue} // Bind sizeInputValue to Downshift
                    onInputValueChange={(newInputValue) => {
                        // Check if the input value matches any item in the dropdown
                        const matches = sizes.some((item) =>
                            item.Roz_Opis.toLowerCase().startsWith(newInputValue.toLowerCase())
                        );
                        if (matches || newInputValue === '') {
                            setSizeInputValue(newInputValue); // Update input value only if it matches
                        }
                    }}
                    onChange={(selection) => {
                        if (selection) {
                            sendDataToBackend(selection); // Send data to backend
                            setSizeInputValue(''); // Clear size input value
                        }
                    }}
                    itemToString={(item) => (item ? item.Roz_Opis : '')}
                >
                    {({
                        getInputProps,
                        getItemProps,
                        getMenuProps,
                        isOpen,
                        highlightedIndex,
                    }) => (
                        <div className="w-50 position-relative">
                            <input
                                {...getInputProps({
                                    placeholder: 'Wybierz rozmiar', // Polish: Select a size
                                    className: 'form-control',
                                    ref: sizeInputRef, // Attach ref to the size input field
                                    onKeyDown: (e) => {
                                        if (e.key === 'Enter' && sizes.length > 0) {
                                            const matchedSize = sizes.find((item) =>
                                                item.Roz_Opis.toLowerCase().startsWith(sizeInputValue.toLowerCase())
                                            );
                                            if (matchedSize) {
                                                // Removed sendDataToBackend call here to avoid duplication
                                            }
                                        }
                                    },
                                })}
                            />
                            <ul
                                {...getMenuProps()}
                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                            >
                                {isOpen &&
                                    sizes
                                        .filter((item) =>
                                            item.Roz_Opis
                                                .toLowerCase()
                                                .includes(sizeInputValue.toLowerCase())
                                        )
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <li
                                                key={item._id} // Pass key directly
                                                {...getItemProps({
                                                    index,
                                                    item,
                                                    className: `list-group-item ${highlightedIndex === index
                                                        ? styles.dropdownItemActive
                                                        : styles.dropdownItem
                                                        }`,
                                                })}
                                            >
                                                {item.Roz_Opis}
                                            </li>
                                        ))}
                            </ul>
                        </div>
                    )}
                </Downshift>
                <input
                    type="text"
                    placeholder="Szukaj w tabeli" // Polish: Search in the table
                    className="form-control w-25"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} // Update search query on input change
                />
            </div>
            <Table dark striped bordered className={styles.responsiveTable}>
                <thead style={{ backgroundColor: 'black', color: 'white' }}>
                    <tr>
                        <th style={tableCellStyle}>Nr zamówienia</th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }} // Add pointer cursor
                            onClick={() => handleSort('fullName')}
                        >
                            Pełna nazwa <span>{getSortIcon('fullName')}</span>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }} // Add pointer cursor
                            onClick={() => handleSort('date')}
                        >
                            Data <span>{getSortIcon('date')}</span>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }} // Add pointer cursor
                            onClick={() => handleSort('size')}
                        >
                            Rozmiar <span>{getSortIcon('size')}</span>
                        </th>
                        <th style={tableCellStyle}>Barcode</th>
                        <th style={tableCellStyle}>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTableData.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: 'black', color: 'white' }}>
                            <td style={tableCellStyle} data-label="Nr zamówienia">{index + 1}</td>
                            <td style={tableCellStyle} data-label="Pełna nazwa">{row.fullName}</td>
                            <td style={tableCellStyle} data-label="Data">{new Date(row.date).toLocaleDateString()}</td>
                            <td style={tableCellStyle} data-label="Rozmiar">{row.size}</td>
                            <td style={tableCellStyle} data-label="Barcode">
                                <Barcode value={row.barcode} width={0.8} height={30} fontSize={10} /> {/* Adjusted barcode size */}
                            </td>
                            <td style={tableCellStyle} data-label="Akcje">
                                <Button color="danger" size="sm" onClick={() => {
                                    if (window.confirm('Czy na pewno chcesz usunąć ten wiersz?')) { // Confirm before deleting
                                        deleteRow(row.id);
                                    }
                                }}>
                                    Usuń
                                </Button>
                                <Button color="warning" size="sm" className="ms-2" onClick={() => fetchEditData(row.id)} // Fetch data for editing
                                >
                                    Edytuj
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

export default State;