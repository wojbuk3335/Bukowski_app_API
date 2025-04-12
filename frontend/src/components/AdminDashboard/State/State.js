import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from './State.module.css'; // Import the CSS module
import Barcode from 'react-barcode'; // Import the Barcode component
import { saveAs } from 'file-saver'; // For exporting files
import { Button, Table, Modal, ModalHeader, ModalBody, FormGroup, Label, ModalFooter } from 'reactstrap'; // Import reactstrap components
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import jsPDF from 'jspdf'; // Import jsPDF for PDF export
import autoTable from 'jspdf-autotable'; // Ensure correct import for autoTable
import pl from 'date-fns/locale/pl'; // Import Polish locale

registerLocale('pl', pl); // Register Polish locale

const State = () => {
    const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today's date
    const [goods, setGoods] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [tableData, setTableData] = useState([]); // State to store table data
    const [searchQuery, setSearchQuery] = useState(''); // State for search input
    const [filteredTableData, setFilteredTableData] = useState([]); // State for filtered table data
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration
    const [currentPage, setCurrentPage] = useState(1); // State for current page
    const [recordsPerPage, setRecordsPerPage] = useState(6); // Default to 6 records per page
    const [nameFilter, setNameFilter] = useState(''); // State for filtering by name
    const [sizeFilter, setSizeFilter] = useState(''); // State for filtering by size
    const [dateFilter, setDateFilter] = useState(null); // State for filtering by date
    const [sellingPointFilter, setSellingPointFilter] = useState(''); // State for filtering by selling point
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal visibility
    const [editData, setEditData] = useState({}); // State for data to edit
    const modalRef = useRef(null); // Ref for draggable modal
    const [users, setUsers] = useState([]); // State to store user data
    const [selectedSellingPoint, setSelectedSellingPoint] = useState(''); // State for selected selling point
    const [input1Value, setInput1Value] = useState('');
    const [input2Value, setInput2Value] = useState('');
    const inputRefs = useRef([null, null]); // Array of refs for both inputs

    const goodsOptions = goods.map((item) => ({ value: item.fullName, label: item.fullName })); // Map goods to Select options
    const sizesOptions = sizes.map((item) => ({ value: item.Roz_Opis, label: item.Roz_Opis })); // Map sizes to Select options

    useEffect(() => {
        // Fetch data from the API
        const fetchGoods = async () => {
            try {
                const response = await axios.get('/api/excel/goods/get-all-goods');
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

    useEffect(() => {
        // Fetch user data from the API
        const fetchUsers = async () => {
            try {
                const response = await axios.get('/api/user');
                if (response.data && Array.isArray(response.data.users)) {
                    const filteredUsers = response.data.users.filter(user => user.role !== 'admin'); // Exclude admin users
                    setUsers(filteredUsers); // Update users state

                    if (filteredUsers.length > 0) {
                        setSelectedSellingPoint(filteredUsers[0].sellingPoint); // Set the first sellingPoint as default
                    }
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setUsers([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                setUsers([]); // Fallback to an empty array
            }
        };

        fetchUsers();
    }, []);

    const fetchTableData = async () => {
        try {
            const response = await axios.get('/api/state'); // Fetch table data from backend
            const formattedData = response.data.map((row) => ({
                id: row.id,
                fullName: row.fullName?.fullName || row.fullName || "Brak danych", // Ensure fullName is a string or fallback to "Brak danych"
                date: row.date,
                size: row.size?.Roz_Opis || row.size || "Brak danych", // Ensure size is a string or fallback to "Brak danych"
                barcode: row.barcode || "Brak danych", // Ensure barcode is included or fallback to "Brak danych"
                sellingPoint: row.sellingPoint || "Brak danych", // Include sellingPoint or fallback to "Brak danych"
            }));
            setTableData(formattedData.reverse()); // Reverse the data to show the newest rows at the top
        } catch (error) {
            console.error('Error fetching table data:', error);
        }
    };

    const sendDataToBackend = async (selectedSize) => {
        if (!input1Value.trim() || !selectedSize || !selectedDate || !selectedSellingPoint) { // Ensure all fields are filled
            alert('Wszystkie dane muszą być uzupełnione'); // Alert if any field is empty
            return;
        }

        const dataToSend = {
            fullName: input1Value.trim(), // Trim whitespace before sending
            size: selectedSize,
            date: selectedDate.toISOString(), // Ensure date is sent in ISO format
            sellingPoint: selectedSellingPoint, // Include sellingPoint
        };

        console.log('Data being sent to the database:', dataToSend); // Log the data being sent

        try {
            const response = await axios.post('/api/state', dataToSend);
            console.log('Backend response:', response.data); // Log the backend response

            // Prepend the new row to the table data
            const newRow = {
                id: response.data.id,
                fullName: dataToSend.fullName,
                date: dataToSend.date,
                size: dataToSend.size,
                barcode: response.data.barcode || "Brak danych", // Include barcode from response or fallback
                sellingPoint: dataToSend.sellingPoint,
            };
            setTableData((prevData) => [newRow, ...prevData]); // Add the new row to the top of the table

            setInput1Value('');
            setInput2Value('');
            setSelectedSellingPoint(users.length > 0 ? users[0].sellingPoint : ''); // Reset to the first sellingPoint

            // Move cursor to the product input field
            inputRefs.current[0].focus();
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
        // Filter table data based on the selected filters
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

        if (sellingPointFilter) {
            filteredData = filteredData.filter((row) =>
                row.sellingPoint.toLowerCase().includes(sellingPointFilter.toLowerCase())
            );
        }

        setFilteredTableData(filteredData);
    }, [nameFilter, sizeFilter, dateFilter, sellingPointFilter, tableData]); // Update filtered data when filters or tableData change

    const deleteRow = async (id) => {
        try {
            await axios.delete(`/api/state/${id}`); // Send delete request to the backend
            await fetchTableData(); // Refresh table data after deletion
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
                    head: [['Nr zamówienia', 'Pełna nazwa', 'Data', 'Rozmiar', 'Barcode', 'Punkt Sprzedaży']],
                    body: tableData.map((row, index) => [
                        index + 1,
                        row.fullName,
                        new Date(row.date).toLocaleDateString(),
                        row.size,
                        row.barcode,
                        row.sellingPoint,
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

    const handleSaveEdit = async () => {
        try {
            await axios.put(`/api/state/${editData.id}`, {
                fullName: editData.fullName,
                date: editData.date,
                size: editData.size,
            });
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

    const handleInputChange = (selectedOption, inputIndex) => {
        if (inputIndex === 0) {
            setInput1Value(selectedOption ? selectedOption.label : '');
            if (selectedOption) {
                inputRefs.current[1].focus(); // Automatically jump to second input
            }
        } else {
            setInput2Value(selectedOption ? selectedOption.label : '');
            if (selectedOption) {
                sendDataToBackend(selectedOption.label); // Send data to backend
                setInput1Value('');
                setInput2Value('');
                inputRefs.current[0].focus(); // Automatically jump to first input
            }
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-center mb-3">
                <div className="btn-group">
                    <Button color="success" className="me-2 btn btn-sm" onClick={() => handleExport('excel')}>Export to Excel</Button>
                    <Button color="primary" className="me-2 btn btn-sm" onClick={() => handleExport('json')}>Export to JSON</Button>
                    <Button color="info" className="me-2 btn btn-sm" onClick={() => handleExport('csv')}>Export to CSV</Button>
                    <Button color="danger" className="me-2 btn btn-sm" onClick={() => handleExport('pdf')}>Export to PDF</Button>
                </div>
            </div>

            <div className={`d-flex align-items-center gap-3 mb-4 ${styles.responsiveContainer}`}>
                <Select
                    ref={(el) => (inputRefs.current[0] = el)}
                    value={goodsOptions.find((option) => option.label === input1Value) || null}
                    onChange={(selectedOption) => handleInputChange(selectedOption, 0)}
                    options={goodsOptions}
                    placeholder="Wpisz pełną nazwę" // Polish: Enter full name
                    isClearable
                    isSearchable
                    className="w-50"
                    styles={{
                        control: (base, state) => ({
                            ...base,
                            backgroundColor: 'black',
                            color: 'white',
                            borderColor: state.isFocused ? '#0d6efd' : base.borderColor, // Change focus border color to #0d6efd
                            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow, // Add blue outline on focus
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: 'white',
                        }),
                        input: (base) => ({
                            ...base,
                            color: 'white',
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: 'black',
                            color:'white',
                            borderRadius: '4px',
                            border: '1px solid white',
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor, // Change hover color to #0d6efd
                            color: state.isFocused ? 'white' : base.color, // Ensure text is white on hover
                        }),
                    }}
                />
                <Select
                    ref={(el) => (inputRefs.current[1] = el)}
                    value={sizesOptions.find((option) => option.label === input2Value) || null}
                    onChange={(selectedOption) => handleInputChange(selectedOption, 1)}
                    options={sizesOptions}
                    placeholder="Wybierz rozmiar" // Polish: Select size
                    isClearable
                    isSearchable
                    className="w-25" // Adjusted width to be two times narrower
                    styles={{
                        control: (base, state) => ({
                            ...base,
                            backgroundColor: 'black',
                            color: 'white',
                            borderColor: state.isFocused ? '#0d6efd' : base.borderColor, // Change focus border color to #0d6efd
                            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow, // Add blue outline on focus
                        }),
                        singleValue: (base) => ({
                            ...base,
                            color: 'white',
                        }),
                        input: (base) => ({
                            ...base,
                            color: 'white',
                        }),
                        menu: (base) => ({
                            ...base,
                            backgroundColor: 'black',
                            color:'white',
                            border: '1px solid white',
                        }),
                        option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor, // Change hover color to #0d6efd
                            color: state.isFocused ? 'white' : base.color, // Ensure text is white on hover
                        }),
                    }}
                />
                <div style={{ margin: '10px 0', padding: '5px', borderRadius: '4px' }}>
                    <DatePicker
                        selected={selectedDate}
                        onChange={(date) => setSelectedDate(date)} // Update selectedDate on change
                        placeholderText="Wybierz datę" // Polish: Select a date
                        className={`form-control xxxx ${styles.datePicker}`} // Apply custom styles
                        dateFormat="yyyy-MM-dd" // Ensure a valid date format
                        locale="pl" // Set Polish locale
                        style={{
                            margin: '0',
                            padding: '5px',
                            boxSizing: 'border-box',
                            width: '100%', // Ensure consistent width
                            height: '38px', // Match default input height
                            lineHeight: '1.5', // Match default line height
                            outlineColor: '#0d6efd', // Change focus outline color to #0d6efd
                        }}
                        onKeyDown={(e) => e.preventDefault()} // Prevent manual input
                    />
                </div>
                <select
                    style={{
                        backgroundColor: 'black',
                        color: 'white',
                        border: '1px solid white',
                        borderRadius: '4px',
                        padding: '5px',
                        height: '38px',
                        marginLeft: '10px',
                        width: '150px', // Set width to 150px
                        outlineColor: 'rgb(13, 110, 253)', // Change focus color
                    }}
                    value={selectedSellingPoint}
                    onChange={(e) => setSelectedSellingPoint(e.target.value)} // Update selectedSellingPoint on change
                >
                    {users.map((user) => (
                        <option key={user._id} value={user.sellingPoint}>
                            {user.sellingPoint || 'No Selling Point'}
                        </option>
                    ))}
                </select>
                <div className="d-flex align-items-center gap-2 rrr">
                    <input
                        type="text"
                        placeholder="Szukaj w tabeli" // Polish: Search in the table
                        className="form-control w-50"
                        style={{
                            minWidth: '200px',
                            backgroundColor: 'black',
                            color: 'white',
                        }} // Add min-width for responsiveness
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

            <Table className={`table ${styles.responsiveTable}`} styles={styles.table}>
                <thead style={{ backgroundColor: 'black', color: 'white' }}>
                    <tr>
                        <th style={tableCellStyle}>Lp</th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('fullName')} // Enable sorting for "Pełna nazwa"
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    <label style={{ margin: 0 }}>Pełna nazwa</label>
                                    <span>{getSortIcon('fullName')}</span>
                                </div>
                                <Select
                                    options={[...new Set(tableData.map((row) => ({ value: row.fullName, label: row.fullName })))]}
                                    placeholder="Filtruj pełną nazwę" // Polish: Filter full name
                                    isClearable
                                    isSearchable
                                    onChange={(selectedOption) => {
                                        setNameFilter(selectedOption ? selectedOption.value : ''); // Update nameFilter based on selection
                                    }}
                                    styles={{
                                        control: (base, state) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderColor: state.isFocused ? '#0d6efd' : base.borderColor, // Change focus border color to #0d6efd
                                            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow, // Add blue outline on focus
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        input: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderRadius: '4px',
                                            border: '1px solid white',
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor, // Change hover color to #0d6efd
                                            color: state.isFocused ? 'white' : base.color, // Ensure text is white on hover
                                        }),
                                    }}
                                />
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('date')} // Enable sorting for "Data"
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    <label style={{ margin: 0 }}>Data</label>
                                    <span>{getSortIcon('date')}</span>
                                </div>
                                <div style={{ margin: '0', padding: '0', borderRadius: '4px' }}>

                                    <DatePicker
                                        selected={dateFilter}
                                        onChange={(date) => setDateFilter(date)} // Update dateFilter on change
                                        placeholderText="Filtruj datę" // Polish: Filter date
                                        className="form-control"
                                        dateFormat="yyyy-MM-dd" // Ensure a valid date format
                                        locale="pl" // Set Polish locale
                                        style={{
                                            margin: '0',
                                            padding: '0px',
                                            boxSizing: 'border-box',
                                            width: '100%', // Ensure consistent width
                                            height: '38px', // Match default input height
                                            lineHeight: '1.5', // Match default line height
                                        }}
                                    />
                                </div>
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('size')} // Enable sorting for "Rozmiar"
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    <label style={{ margin: 0 }}>Rozmiar</label>
                                    <span>{getSortIcon('size')}</span>
                                </div>
                                <Select
                                    options={[...new Set(tableData.map((row) => ({ value: row.size, label: row.size })))]}
                                    placeholder="Filtruj rozmiar" // Polish: Filter size
                                    isClearable
                                    isSearchable
                                    onChange={(selectedOption) => {
                                        setSizeFilter(selectedOption ? selectedOption.value : ''); // Update sizeFilter based on selection
                                    }}
                                    styles={{
                                        control: (base, state) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderColor: state.isFocused ? '#0d6efd' : base.borderColor, // Change focus border color to #0d6efd
                                            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow, // Add blue outline on focus
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        input: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderRadius: '4px',
                                            border: '1px solid white',
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor, // Change hover color to #0d6efd
                                            color: state.isFocused ? 'white' : base.color, // Ensure text is white on hover
                                        }),
                                    }}
                                />
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle, cursor: 'pointer' }}
                            onClick={() => handleSort('sellingPoint')} // Enable sorting for "Punkt Sprzedaży"
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                    <label style={{ margin: 0 }}>Punkt Sprzedaży</label>
                                    <span>{getSortIcon('sellingPoint')}</span>
                                </div>
                                <Select
                                    options={[...new Set(tableData.map((row) => ({ value: row.sellingPoint, label: row.sellingPoint })))]}
                                    placeholder="Filtruj punkt sprzedaży" // Polish: Filter selling point
                                    isClearable
                                    isSearchable
                                    onChange={(selectedOption) => {
                                        setSellingPointFilter(selectedOption ? selectedOption.value : ''); // Update sellingPointFilter based on selection
                                    }}
                                    styles={{
                                        control: (base, state) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderColor: state.isFocused ? '#0d6efd' : base.borderColor, // Change focus border color to #0d6efd
                                            boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow, // Add blue outline on focus
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        input: (base) => ({
                                            ...base,
                                            color: 'white',
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            backgroundColor: 'black',
                                            color: 'white',
                                            borderRadius: '4px',
                                            border: '1px solid white',
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor, // Change hover color to #0d6efd
                                            color: state.isFocused ? 'white' : base.color, // Ensure text is white on hover
                                        }),
                                    }}
                                />
                            </div>
                        </th>
                        <th style={tableCellStyle}>Kody kreskowe</th>
                        <th style={tableCellStyle}>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {currentRecords.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: 'black', color: 'white' }}>
                            <td style={tableCellStyle} data-label="Nr zamówienia">{indexOfFirstRecord + index + 1}</td>
                            <td style={tableCellStyle} data-label="Pełna nazwa">{row.fullName}</td>
                            <td style={tableCellStyle} data-label="Data">
                                {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td style={tableCellStyle} data-label="Rozmiar">{row.size}</td>
                            <td style={tableCellStyle} data-label="Punkt Sprzedaży">{row.sellingPoint}</td> 
                            <td style={tableCellStyle} data-label="Barcode">
                                <Barcode value={row.barcode} width={0.8} height={30} fontSize={10} />
                            </td>
                            <td style={tableCellStyle} data-label="Akcje">
                                <div className="d-flex gap-1"> 
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


            <Modal isOpen={isEditModalOpen} toggle={toggleEditModal} innerRef={modalRef}>
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
                        <Select
                            value={goodsOptions.find((option) => option.label === editData.fullName) || null}
                            onChange={(selectedOption) => setEditData({ ...editData, fullName: selectedOption ? selectedOption.label : '' })}
                            options={goodsOptions}
                            placeholder="Wybierz pełną nazwę" // Polish: Select a full name
                            isClearable
                            isSearchable
                            className="w-100"
                        />
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="date" className={styles.emailLabel}>Data:</Label>
                        <div style={{ margin: '10px 0', padding: '5px', borderRadius: '4px' }}>
                            <DatePicker
                                selected={editData.date ? new Date(editData.date) : null} // Bind editData.date to DatePicker
                                onChange={(date) => setEditData({ ...editData, date: date.toISOString() })} // Update editData.date on change
                                placeholderText="Wybierz datę" // Polish: Select a date
                                className="form-control"
                                dateFormat="yyyy-MM-dd" // Ensure a valid date format
                                locale="pl" // Set Polish locale
                                onKeyDown={(e) => e.preventDefault()} // Prevent manual input
                                readOnly // Make the input field read-only
                            />
                        </div>
                    </FormGroup>
                    <FormGroup className={styles.formGroup}>
                        <Label for="size" className={styles.emailLabel}>Rozmiar:</Label>
                        <Select
                            value={sizesOptions.find((option) => option.label === editData.size) || null}
                            onChange={(selectedOption) => setEditData({ ...editData, size: selectedOption ? selectedOption.label : '' })}
                            options={sizesOptions}
                            placeholder="Wybierz rozmiar" // Polish: Select a size
                            isClearable
                            isSearchable
                            className="w-100"
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter className="d-flex justify-content-end" style={{ gap: '10px' }}>
                    <Button color="primary" onClick={handleSaveEdit} className="btn-sm">Zapisz zmiany</Button>
                    <Button color="secondary" onClick={toggleEditModal} className="btn-sm">Anuluj</Button>
                </ModalFooter>
            </Modal>

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