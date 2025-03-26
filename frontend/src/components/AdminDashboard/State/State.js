import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Downshift from 'downshift';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './State.module.css'; // Import the CSS module
import Barcode from 'react-barcode'; // Import the Barcode component
import { saveAs } from 'file-saver'; // For exporting files
import { Button, Table, Modal, ModalHeader, ModalBody, FormGroup, Label, Input, ModalFooter } from 'reactstrap'; // Import reactstrap components
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import jsPDF from 'jspdf'; // Import jsPDF for PDF export
import autoTable from 'jspdf-autotable'; // Ensure correct import for autoTable

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today's date
    const [goods, setGoods] = useState([]);
    const [inputValue, setInputValue] = useState(''); // Manage input value manually
    const [sizes, setSizes] = useState([]);
    const [sizeInputValue, setSizeInputValue] = useState(''); // Manage size input value manually
    const [tableData, setTableData] = useState([]); // State to store table data
    const sizeInputRef = useRef(null); // Ref for the size input field
    const [searchQuery, setSearchQuery] = useState(''); // State for search input
    const [filteredTableData, setFilteredTableData] = useState([]); // State for filtered table data
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration
    const [currentPage, setCurrentPage] = useState(1); // State for current page
    const [recordsPerPage, setRecordsPerPage] = useState(6); // Default to 6 records per page
    const [nameFilter, setNameFilter] = useState(''); // State for filtering by name
    const [sizeFilter, setSizeFilter] = useState(''); // State for filtering by size
    const [dateFilter, setDateFilter] = useState(null); // State for filtering by date
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal visibility
    const [editData, setEditData] = useState({}); // State for data to edit
    const modalRef = useRef(null); // Ref for draggable modal

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

    useEffect(() => {
        // Filter table data based on the selected name filter
        if (nameFilter) {
            const filteredData = tableData.filter((row) =>
                row.fullName.toLowerCase().includes(nameFilter.toLowerCase())
            );
            setFilteredTableData(filteredData);
        } else {
            setFilteredTableData(tableData); // Reset to full table data if no filter is applied
        }
    }, [nameFilter, tableData]); // Update filtered data when nameFilter or tableData changes

    useEffect(() => {
        // Filter table data based on the selected size and date filters
        let filteredData = tableData;

        if (nameFilter) {
            filteredData = filteredData.filter((row) =>
                row.fullName.toLowerCase().includes(nameFilter.toLowerCase())
            );
        }

        if (sizeFilter) {
            filteredData = filteredData.filter((row) =>
                row.size.toLowerCase().includes(sizeFilter.toLowerCase())
            );
        }

        if (dateFilter) {
            filteredData = filteredData.filter((row) =>
                new Date(row.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString()
            );
        }

        setFilteredTableData(filteredData);
    }, [nameFilter, sizeFilter, dateFilter, tableData]); // Update filtered data when filters or tableData change

    const deleteRow = async (id) => {
        try {
            await axios.delete(`/api/state/${id}`); // Send delete request to the backend
            fetchTableData(); // Refresh table data after deletion
        } catch (error) {
            console.error('Error deleting row:', error);
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
                autoTable(doc, {
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
            if (key === 'date') {
                // Special handling for date sorting
                const dateA = new Date(a[key]);
                const dateB = new Date(b[key]);
                return direction === 'asc' ? dateA - dateB : dateB - dateA;
            } else {
                // General sorting for strings
                if (a[key].toLowerCase() < b[key].toLowerCase()) return direction === 'asc' ? -1 : 1;
                if (a[key].toLowerCase() > b[key].toLowerCase()) return direction === 'asc' ? 1 : -1;
                return 0;
            }
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

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredTableData.slice(indexOfFirstRecord, indexOfLastRecord); // Records for the current page

    const totalPages = Math.ceil(filteredTableData.length / recordsPerPage); // Total number of pages

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber); // Update the current page
    };

    const handleRecordsPerPageChange = (event) => {
        setRecordsPerPage(Number(event.target.value)); // Update the number of records per page
        setCurrentPage(1); // Reset to the first page
    };

    const toggleEditModal = () => setIsEditModalOpen(!isEditModalOpen);

    const handleEditClick = (row) => {
        setEditData(row); // Set the row data to edit
        toggleEditModal(); // Open the modal
    };

    const handleEditInputChange = (e) => {
        const { id, value } = e.target;
        setEditData({ ...editData, [id]: value }); // Update the edit data
    };

    const handleSaveEdit = async () => {
        try {
            const response = await axios.put(`/api/state/${editData.id}`, {
                fullName: editData.fullName,
                date: editData.date,
                size: editData.size,
            });
            console.log('Updated data:', response.data);
            fetchTableData(); // Refresh table data after successful update
            toggleEditModal(); // Close the modal
        } catch (error) {
            console.error('Error updating state:', error);
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

    useEffect(() => {
        if (isEditModalOpen) {
            setTimeout(() => {
                makeModalDraggable();
            }, 100);
        }
    }, [isEditModalOpen]);

    return (
        <div>
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
                                    style: { minWidth: '200px' }, // Add min-width for responsiveness
                                })}
                            />
                            <ul
                                {...getMenuProps()}
                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                                style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
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
                                                    style: {
                                                        backgroundColor: highlightedIndex === index ? 'gray' : 'black', // Highlight active item
                                                        color: 'white', // White text
                                                    },
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
                        <div className="w-70 position-relative"> {/* Adjusted width to 70% */}
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
                                style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
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
                                                    style: {
                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Highlight active item
                                                        color: 'white', // White text
                                                    },
                                                })}
                                            >
                                                {item.Roz_Opis}
                                            </li>
                                        ))}
                            </ul>
                        </div>
                    )}
                </Downshift>
                <div className="d-flex align-items-center gap-2">
                    <input
                        type="text"
                        placeholder="Szukaj w tabeli" // Polish: Search in the table
                        className="form-control w-50"
                        style={{ minWidth: '200px' }} // Add min-width for responsiveness
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} // Update search query on input change
                    />
                    <select
                        id="recordsPerPage"
                        className="form-select d-inline-block w-auto"
                        style={{ backgroundColor: 'black', color: 'white' }} // Black background and white text
                        value={recordsPerPage}
                        onChange={handleRecordsPerPageChange}
                    >
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </select>
                </div>
            </div>

            <Table dark striped bordered className={styles.responsiveTable}>
                <thead style={{ backgroundColor: 'black', color: 'white' }}>
                    <tr>
                        <th style={tableCellStyle}>Nr zamówienia</th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('fullName')} // Enable sorting for "Pełna nazwa"
                        >
                            <div>
                                Pełna nazwa <span>{getSortIcon('fullName')}</span>
                                <Downshift
                                    inputValue={nameFilter} // Bind nameFilter to Downshift
                                    onInputValueChange={(newInputValue) => {
                                        const matches = goods.some((item) =>
                                            item.fullName.toLowerCase().startsWith(newInputValue.toLowerCase())
                                        );
                                        if (matches || newInputValue === '') {
                                            setNameFilter(newInputValue); // Update nameFilter only if it matches
                                        }
                                    }}
                                    onChange={(selection) => {
                                        if (selection) {
                                            setNameFilter(selection.fullName); // Set nameFilter to the selected suggestion
                                        }
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
                                        <div className="position-relative">
                                            <input
                                                {...getInputProps({
                                                    placeholder: 'Filtruj pełną nazwę', // Polish: Filter full name
                                                    className: 'form-control mt-2',
                                                })}
                                            />
                                            <ul
                                                {...getMenuProps()}
                                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                                                style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
                                            >
                                                {isOpen &&
                                                    goods
                                                        .filter((item) =>
                                                            item.fullName
                                                                .toLowerCase()
                                                                .includes(nameFilter.toLowerCase())
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
                                                                    style: {
                                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Highlight active item
                                                                        color: 'white', // White text
                                                                    },
                                                                })}
                                                            >
                                                                {item.fullName} {/* Display fullName */}
                                                            </li>
                                                        ))}
                                            </ul>
                                        </div>
                                    )}
                                </Downshift>
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('date')} // Enable sorting for "Data"
                        >
                            <div>
                                <label style={{ display: 'block' }}>Data</label> {/* Display block for label */}
                                <DatePicker
                                    selected={dateFilter}
                                    onChange={(date) => setDateFilter(date)} // Update dateFilter on change
                                    placeholderText="Filtruj datę" // Polish: Filter date
                                    className="form-control mt-2"
                                    dateFormat="yyyy-MM-dd" // Ensure a valid date format
                                    style={{ margin: '0' }} // Ensure consistent margins
                                />
                                <span>{getSortIcon('date')}</span>
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('size')} // Enable sorting for "Rozmiar"
                        >
                            <div>
                                Rozmiar <span>{getSortIcon('size')}</span>
                                <Downshift
                                    inputValue={sizeFilter} // Bind sizeFilter to Downshift
                                    onInputValueChange={(newInputValue) => {
                                        const matches = sizes.some((item) =>
                                            item.Roz_Opis.toLowerCase().startsWith(newInputValue.toLowerCase())
                                        );
                                        if (matches || newInputValue === '') {
                                            setSizeFilter(newInputValue); // Update sizeFilter only if it matches
                                        }
                                    }}
                                    onChange={(selection) => {
                                        if (selection) {
                                            setSizeFilter(selection.Roz_Opis); // Set sizeFilter to the selected suggestion
                                        }
                                    }}
                                    itemToString={(item) => (item ? item.Roz_Opis : '')} // Use Roz_Opis for display
                                >
                                    {({
                                        getInputProps,
                                        getItemProps,
                                        getMenuProps,
                                        isOpen,
                                        highlightedIndex,
                                    }) => (
                                        <div className="position-relative w-70"> {/* Adjusted width to 70% */}
                                            <input
                                                {...getInputProps({
                                                    placeholder: 'Filtruj rozmiar', // Polish: Filter size
                                                    className: 'form-control mt-2',
                                                })}
                                            />
                                            <ul
                                                {...getMenuProps()}
                                                className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                                                style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
                                            >
                                                {isOpen &&
                                                    sizes
                                                        .filter((item) =>
                                                            item.Roz_Opis
                                                                .toLowerCase()
                                                                .includes(sizeFilter.toLowerCase())
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
                                                                    style: {
                                                                        backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Highlight active item
                                                                        color: 'white', // White text
                                                                    },
                                                                })}
                                                            >
                                                                {item.Roz_Opis} {/* Display Roz_Opis */}
                                                            </li>
                                                        ))}
                                            </ul>
                                        </div>
                                    )}
                                </Downshift>
                            </div>
                        </th>
                        <th style={tableCellStyle}>Barcode</th>
                        <th style={tableCellStyle}>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {currentRecords.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: 'black', color: 'white' }}>
                            <td style={tableCellStyle} data-label="Nr zamówienia">{indexOfFirstRecord + index + 1}</td>
                            <td style={tableCellStyle} data-label="Pełna nazwa">{row.fullName}</td>
                            <td style={tableCellStyle} data-label="Data">
                                {new Date(row.date).toLocaleDateString()} {/* Render as plain text */}
                            </td>
                            <td style={tableCellStyle} data-label="Rozmiar">{row.size}</td>
                            <td style={tableCellStyle} data-label="Barcode">
                                <Barcode value={row.barcode} width={0.8} height={30} fontSize={10} /> {/* Adjusted barcode size */}
                            </td>
                            <td style={tableCellStyle} data-label="Akcje">
                                <div className="d-flex gap-1"> {/* Adjust button spacing */}
                                    <Button color="warning" size="sm" onClick={() => handleEditClick(row)}>Edytuj</Button>
                                    <Button color="danger" size="sm" onClick={() => {
                                        if (window.confirm('Czy na pewno chcesz usunąć ten wiersz?')) { // Confirm before deleting
                                            deleteRow(row.id);
                                        }
                                    }}>
                                        Usuń
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} toggle={toggleEditModal} className={styles.customModal} innerRef={modalRef}>
                <ModalHeader
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                    onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                    toggle={toggleEditModal}
                    className={`modal-header draggable-header ${styles.modalHeader}`}
                >
                    Edytuj dane
                </ModalHeader>
                <ModalBody className={styles.modalBody}>
                    <FormGroup className={styles.formGroup}>
                        <Label for="fullName" className={styles.emailLabel}>Pełna nazwa:</Label>
                        <Downshift
                            inputValue={editData.fullName || ''} // Bind editData.fullName to Downshift
                            onInputValueChange={(newInputValue) => {
                                const matches = goods.some((item) =>
                                    item.fullName.toLowerCase().startsWith(newInputValue.toLowerCase())
                                );
                                if (matches || newInputValue === '') {
                                    setEditData({ ...editData, fullName: newInputValue }); // Update editData.fullName only if it matches
                                }
                            }}
                            onChange={(selection) => {
                                if (selection) {
                                    setEditData({ ...editData, fullName: selection.fullName }); // Set editData.fullName to the selected suggestion
                                }
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
                                <div className="position-relative">
                                    <input
                                        {...getInputProps({
                                            placeholder: 'Wybierz pełną nazwę', // Polish: Select a full name
                                            className: 'form-control',
                                        })}
                                    />
                                    <ul
                                        {...getMenuProps()}
                                        className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                                        style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
                                    >
                                        {isOpen &&
                                            goods
                                                .filter((item) =>
                                                    item.fullName
                                                        .toLowerCase()
                                                        .includes((editData.fullName || '').toLowerCase())
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
                                                            style: {
                                                                backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Highlight active item
                                                                color: 'white', // White text
                                                            },
                                                        })}
                                                    >
                                                        {item.fullName} {/* Display fullName */}
                                                    </li>
                                                ))}
                                    </ul>
                                </div>
                            )}
                        </Downshift>
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="date" className={styles.emailLabel}>Data:</Label>
                        <DatePicker
                            selected={editData.date ? new Date(editData.date) : null} // Bind editData.date to DatePicker
                            onChange={(date) => setEditData({ ...editData, date: date.toISOString() })} // Update editData.date on change
                            placeholderText="Wybierz datę" // Polish: Select a date
                            className="form-control"
                            dateFormat="yyyy-MM-dd" // Ensure a valid date format
                            onKeyDown={(e) => e.preventDefault()} // Prevent manual input
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="size" className={styles.emailLabel}>Rozmiar:</Label>
                        <Downshift
                            inputValue={editData.size || ''} // Bind editData.size to Downshift
                            onInputValueChange={(newInputValue) => {
                                // Check if the input value matches any item in the dropdown
                                const matches = sizes.some((item) =>
                                    item.Roz_Opis.toLowerCase().startsWith(newInputValue.toLowerCase())
                                );
                                if (matches || newInputValue === '') {
                                    setEditData({ ...editData, size: newInputValue }); // Update editData.size only if it matches
                                }
                            }}
                            onChange={(selection) => {
                                if (selection) {
                                    setEditData({ ...editData, size: selection.Roz_Opis }); // Set editData.size to the selected suggestion
                                }
                            }}
                            itemToString={(item) => (item ? item.Roz_Opis : '')} // Use Roz_Opis for display
                        >
                            {({
                                getInputProps,
                                getItemProps,
                                getMenuProps,
                                isOpen,
                                highlightedIndex,
                            }) => (
                                <div className="position-relative">
                                    <input
                                        {...getInputProps({
                                            placeholder: 'Wybierz rozmiar', // Polish: Select a size
                                            className: 'form-control',
                                        })}
                                    />
                                    <ul
                                        {...getMenuProps()}
                                        className={`list-group mt-1 position-absolute w-100 ${isOpen ? '' : 'd-none'} ${styles.dropdownMenu}`}
                                        style={{ backgroundColor: 'black', color: 'white', zIndex: 1050 }} // Black background and white text
                                    >
                                        {isOpen &&
                                            sizes
                                                .filter((item) =>
                                                    item.Roz_Opis
                                                        .toLowerCase()
                                                        .includes((editData.size || '').toLowerCase())
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
                                                            style: {
                                                                backgroundColor: highlightedIndex === index ? '#0d6efd' : 'black', // Highlight active item
                                                                color: 'white', // White text
                                                            },
                                                        })}
                                                    >
                                                        {item.Roz_Opis} {/* Display Roz_Opis */}
                                                    </li>
                                                ))}
                                    </ul>
                                </div>
                            )}
                        </Downshift>
                    </FormGroup>
                    <Button color="primary" onClick={handleSaveEdit} className="btn-sm">Zapisz zmiany</Button>
                </ModalBody>
            </Modal>

            {/* Pagination */}
            <div className="d-flex justify-content-center mt-3">
                <nav>
                    <ul className="pagination">
                        {Array.from({ length: totalPages }, (_, index) => (
                            <li
                                key={index + 1}
                                className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                            >
                                <button
                                    className="page-link"
                                    onClick={() => handlePageChange(index + 1)}
                                >
                                    {index + 1}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default State;