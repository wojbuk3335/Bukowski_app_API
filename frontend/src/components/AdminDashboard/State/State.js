import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import Select from 'react-select';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range'; // Import updated default ranges
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-date-range/dist/styles.css'; // Import DateRangePicker styles
import 'react-date-range/dist/theme/default.css'; // Import default theme
import styles from './State.module.css'; // Import the CSS module
import Barcode from 'react-barcode'; // Import the Barcode component
import { saveAs } from 'file-saver'; // For exporting files
import { Button, Table, Modal, ModalHeader, ModalBody, FormGroup, Label, ModalFooter, Spinner } from 'reactstrap'; // Import reactstrap components
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
    const [printer, setPrinter] = useState(null); // State for Zebra printer
    const [printerError, setPrinterError] = useState(null); // State for printer errors
    const [selectedIds, setSelectedIds] = useState([]); // State for selected row IDs
    const [columnFilters, setColumnFilters] = useState({}); // State for column filters
    const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]); // State for date range
    const [isDateRangePickerVisible, setIsDateRangePickerVisible] = useState(false); // State to toggle date range picker visibility
    const calendarRef = useRef(null); // Ref for the calendar container
    const [loading, setLoading] = useState(false); // Loading state

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsDateRangePickerVisible(false); // Close the calendar if clicked outside
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Nadpisanie etykiet w defaultStaticRanges
    const customStaticRanges = originalStaticRanges.map((range) => {
        if (range.label === 'Today') {
            return { ...range, label: 'Dzisiaj' }; // Polish: Today
        }
        if (range.label === 'Yesterday') {
            return { ...range, label: 'Wczoraj' }; // Polish: Yesterday
        }
        if (range.label === 'This Week') {
            return { ...range, label: 'Ten tydzień' }; // Polish: This Week
        }
        if (range.label === 'Last Week') {
            return { ...range, label: 'Poprzedni tydzień' }; // Polish: Last Week
        }
        if (range.label === 'This Month') {
            return { ...range, label: 'Ten miesiąc' }; // Polish: This Month
        }
        if (range.label === 'Last Month') {
            return { ...range, label: 'Poprzedni miesiąc' }; // Polish: Last Month
        }
        return range;
    });

    // Nadpisanie etykiet w defaultInputRanges
    const customInputRanges = originalInputRanges.map((range) => {
        if (range.label === 'days up to today') {
            return { ...range, label: 'dni do dzisiaj' }; // Polish: Days up to today
        }
        if (range.label === 'days starting today') {
            return { ...range, label: 'dni od dzisiaj' }; // Polish: Days starting today
        }
        return range;
    });

    const goodsOptions = goods.map((item) => ({ value: item, label: item.fullName })); // Map goods to include the entire object
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
                console.log('Fetched users:', response.data.users); // Log the fetched users

                if (response.data && Array.isArray(response.data.users)) {
                    const filteredUsers = response.data.users.filter(user => user.role !== 'admin');
                    setUsers(filteredUsers);

                    if (filteredUsers.length > 0) {
                        setSelectedSellingPoint(filteredUsers[0].symbol); // Use symbol instead of sellingPoint
                    }
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setUsers([]);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                setUsers([]);
            }
        };

        fetchUsers();
    }, []);

    const fetchTableData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/state');
            const formattedData = response.data.map((row) => ({
                id: row.id,
                fullName: row.fullName?.fullName || row.fullName || "Brak danych",
                plec: row.Plec || "Brak danych",
                date: row.date,
                size: row.size?.Roz_Opis || row.size || "Brak danych",
                barcode: row.barcode || "Brak danych",
                symbol: row.symbol || "Brak danych",
                price: row.price || "Brak danych"
            }));
            setTableData(formattedData.reverse());
        } catch (error) {
            console.error('Error fetching table data:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendDataToBackend = async (selectedSize, selectedPlec) => {
        if (!input1Value.trim() || !selectedSize || !selectedDate || !selectedSellingPoint) {
            alert('Wszystkie dane muszą być uzupełnione');
            return;
        }

        setLoading(true);
        try {
            const selectedGood = goods.find((good) => good.fullName === input1Value.trim());
            if (!selectedGood) {
                alert('Wybrany produkt nie istnieje w bazie danych.');
                setLoading(false);
                return;
            }

            const exception = selectedGood.priceExceptions.find(
                (ex) => ex.size && ex.size.Roz_Opis === selectedSize
            );
            let price;
            if (exception) {
                price = exception.value;
            } else if (
                selectedGood.discount_price !== undefined &&
                selectedGood.discount_price !== null &&
                selectedGood.discount_price !== "" &&
                Number(selectedGood.discount_price) !== 0
            ) {
                price = `${selectedGood.price},${selectedGood.discount_price}`;
            } else {
                price = selectedGood.price;
            }

            const dataToSend = {
                fullName: input1Value.trim(), // Ensure fullName is sent correctly
                size: selectedSize,
                plec: selectedPlec,
                date: selectedDate.toISOString(),
                sellingPoint: selectedSellingPoint,
                price,
            };

            console.log('Sending data to backend:', dataToSend);

            const response = await axios.post('/api/state', dataToSend);
            console.log('Response from backend:', response.data);

            const newRow = {
                id: response.data._id,
                fullName: input1Value.trim(),
                date: selectedDate.toISOString(),
                size: selectedSize,
                barcode: response.data.barcode || "Brak danych",
                symbol: selectedSellingPoint,
                price: price,
            };
            setTableData((prevData) => [newRow, ...prevData]);

            setInput1Value('');
            setInput2Value('');
            setTimeout(() => {
                if (inputRefs.current[0] && inputRefs.current[0].focus) {
                    inputRefs.current[0].focus();
                }
            }, 0);
        } catch (error) {
            console.error('Error sending data to backend:', error);
        } finally {
            setLoading(false);
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

    useEffect(() => {
        // Apply column filters to the table data
        let filteredData = [...tableData];

        if (columnFilters.lp) {
            filteredData = filteredData.filter((row, index) =>
                (index + 1).toString().includes(columnFilters.lp)
            );
        }

        if (columnFilters.fullName) {
            filteredData = filteredData.filter((row) =>
                row.fullName.toLowerCase().includes(columnFilters.fullName.toLowerCase())
            );
        }

        if (columnFilters.size) {
            filteredData = filteredData.filter((row) =>
                row.size.toLowerCase().includes(columnFilters.size.toLowerCase())
            );
        }

        if (columnFilters.symbol) {
            filteredData = filteredData.filter((row) =>
                row.symbol.toLowerCase().includes(columnFilters.symbol.toLowerCase())
            );
        }

        setFilteredTableData(filteredData);
    }, [tableData, columnFilters]);

    useEffect(() => {
        // Filter table data based on the selected date range
        let filteredData = tableData;

        if (dateRange[0].startDate && dateRange[0].endDate) {
            filteredData = filteredData.filter((row) => {
                const rowDate = new Date(row.date);
                return rowDate >= dateRange[0].startDate && rowDate <= dateRange[0].endDate;
            });
        }

        setFilteredTableData(filteredData);
    }, [dateRange, tableData]); // Update filtered data when dateRange or tableData changes

    const deleteRow = async (id) => {
        if (!id) {
            console.error('Invalid ID: Cannot delete row');
            return;
        }

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
                    head: [['Nr zamówienia', 'Pełna nazwa', 'Data', 'Rozmiar', 'Barcode', 'Symbol', 'Cena (PLN)']],
                    body: tableData.map((row, index) => [
                        index + 1,
                        row.fullName,
                        new Date(row.date).toLocaleDateString(),
                        row.size,
                        row.barcode,
                        row.symbol,
                        row.price,
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
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            // Reset to original order if clicked again
            setFilteredTableData([...tableData]);
            setSortConfig({ key: null, direction: 'asc' });
            return;
        }
        setSortConfig({ key, direction });

        const sortedData = [...filteredTableData].sort((a, b) => {
            if (key === 'lp') {
                // Sort by index-based Lp (reverse order based on index)
                return direction === 'asc'
                    ? (a.index || 0) - (b.index || 0)
                    : (b.index || 0) - (a.index || 0);
            }
            if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                return direction === 'asc'
                    ? a[key].localeCompare(b[key])
                    : b[key].localeCompare(a[key]);
            }
            return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
        });
        setFilteredTableData(sortedData);
    };

    const getSortIcon = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'asc' ? '▲' : '▼';
        }
        return '⇅';
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
        setEditData({
            ...row,
            sellingPoint: row.symbol || '', // Ensure sellingPoint is set to the symbol value
        });
        toggleEditModal(); // Open the modal
    };

    const handleSaveEdit = async () => {
        try {
            console.log('Edit data:', editData); // Log the edit data
            console.log('Selling point:', editData.sellingPoint); // Log the selling point

            await axios.put(`/api/state/${editData.id}`, {
                fullName: editData.fullName,
                date: editData.date,
                size: editData.size,
                sellingPoint: editData.sellingPoint, // Ensure sellingPoint is correctly set
            });
            fetchTableData(); // Refresh table data after successful update
            toggleEditModal(); // Close the modal
        } catch (error) {
            console.error('Error updating state:', error); // Log the error
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
                const selectedSize = selectedOption.label;
                const selectedPlec = selectedOption.value.Plec; // Extract 'Plec' from the selected object
                sendDataToBackend(selectedSize, selectedPlec); // Pass 'Plec' to the backend
                setInput1Value('');
                setInput2Value('');
                inputRefs.current[0].focus(); // Automatically jump to first input
            }
        }
    };

    useEffect(() => {
        // Initialize Zebra printer
        if (window.BrowserPrint) {
            window.BrowserPrint.getDefaultDevice(
                "printer",
                (device) => setPrinter(device),
                (err) => setPrinterError("Nie znaleziono drukarki: " + err)
            );
        } else {
            setPrinterError("Nie załadowano biblioteki BrowserPrint.");
        }
    }, []);

    const toggleRowSelection = (id) => {
        setSelectedIds((prevSelectedIds) => {
            if (prevSelectedIds.includes(id)) {
                // Remove the ID if it's already selected
                return prevSelectedIds.filter((selectedId) => selectedId !== id);
            } else {
                // Add the ID if it's not already selected
                return [...prevSelectedIds, id];
            }
        });
    };

    const handlePrint = async () => {
        if (!printer) {
            alert("Brak drukarki");
            return;
        }

        if (selectedIds.length === 0) {
            alert("Proszę wybrać wiersze do wydrukowania.");
            return;
        }

        // Generate ZPL for each selected row
        const zplCommands = selectedIds.map((id) => {
            const row = tableData.find((item) => item.id === id);
            const jacketName = row?.fullName || "Brak nazwy";
            const size = row?.size || "Brak rozmiaru";
            const barcode = row?.barcode || "Brak kodu";
            const symbol = row?.symbol || "Brak symbolu";
            const price = row?.price ? `${row.price} PLN` : "Brak ceny";

            return `
            ^CI28
^XA
^PW700
^LL1000
^FO70,30
^A0N,40,40
^FD${jacketName}  ${size}^FS
^FO600,30
^A0N,30,30
^FD${symbol}^FS
^FO70,80
^BY3,3,120
^BCN,120,Y,N,N
^FD${barcode}^FS
^FO230,250
^A0N,60,60
^FD${price}^FS
^XZ
            `;
        }).join('');

        // Send ZPL commands to the printer
        printer.send(
            zplCommands,
            () => setSelectedIds([]), // Clear selected IDs after printing
            (err) => alert("Błąd drukowania: " + err)
        );
    };

    const handleLpFilterChange = (e) => {
        const input = e.target.value;
        const nextValidChar = tableData
            .map((_, index) => (index + 1).toString())
            .find((lp) => lp.startsWith(input));

        if (nextValidChar || input === '') {
            setColumnFilters((prevFilters) => ({
                ...prevFilters,
                lp: input,
            }));
        }
    };

    const handleFullNameFilterChange = (e) => {
        const input = e.target.value.toLowerCase();
        const nextValidChar = tableData
            .map((row) => row.fullName.toLowerCase())
            .find((name) => name.startsWith(input));

        if (nextValidChar || input === '') {
            setColumnFilters((prevFilters) => ({
                ...prevFilters,
                fullName: input,
            }));
        }
    };

    const toggleDateRangePicker = () => {
        setIsDateRangePickerVisible((prev) => !prev); // Toggle visibility
    };

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
            <div className="d-flex justify-content-center mb-3">
                <div className="btn-group">
                    <Button color="success" className="me-2 btn btn-sm" onClick={() => handleExport('excel')}>Export to Excel</Button>
                    <Button color="primary" className="me-2 btn btn-sm" onClick={() => handleExport('json')}>Export to JSON</Button>
                    <Button color="info" className="me-2 btn btn-sm" onClick={() => handleExport('csv')}>Export to CSV</Button>
                    <Button color="danger" className="me-2 btn btn-sm" onClick={() => handleExport('pdf')}>Export to PDF</Button>
                    <Button color="primary" className="btn btn-sm" onClick={handlePrint}>Drukuj zaznaczone kody</Button>
                </div>
            </div>

            <div className={`d-flex align-items-center gap-3 mb-4 ${styles.responsiveContainer}`}>
                <Select
                    ref={(el) => (inputRefs.current[0] = el)}
                    value={goodsOptions.find((option) => option.label === input1Value) || null}
                    onChange={(selectedOption) => handleInputChange(selectedOption, 0)}
                    options={goodsOptions}
                    placeholder="Wpisz nazwę produktu" // Dodano placeholder
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
                            color: 'white',
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
                        <option key={user._id} value={user.symbol}>
                            {user.symbol || 'No Symbol'}
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
                        <th style={{ ...tableCellStyle, maxWidth: '270px', width: '130px' }} onClick={() => handleSort('lp')}>
                            Lp {getSortIcon('lp')}
                        </th>
                        <th style={{ ...tableCellStyle }} onClick={() => handleSort('fullName')}>
                            Pełna nazwa {getSortIcon('fullName')}
                            <input
                                type="text"
                                className="form-control form-control-sm mt-1"
                                placeholder="Filter"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                }}
                                value={columnFilters.fullName || ''}
                                onChange={handleFullNameFilterChange}
                            />
                        </th>
                        <th style={tableCellStyle}>
                            <div className="d-flex flex-column align-items-center" style={{ position: 'relative' }}>
                                <span onClick={toggleDateRangePicker} style={{ cursor: 'pointer' }}>
                                    Data dobrania {getSortIcon('date')}
                                </span>
                                {isDateRangePickerVisible && (
                                    <div
                                        ref={calendarRef}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 10,
                                            backgroundColor: 'black',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                            padding: '10px',
                                            color: 'white',
                                        }}
                                    >
                                        <DateRangePicker
                                            ranges={dateRange}
                                            onChange={(ranges) => setDateRange([ranges.selection])}
                                            locale={pl}
                                            rangeColors={['#0d6efd']}
                                            staticRanges={customStaticRanges}
                                            inputRanges={customInputRanges}
                                        />
                                    </div>
                                )}
                            </div>
                        </th>
                        <th style={{ ...tableCellStyle }} onClick={() => handleSort('size')}>
                            Rozmiar {getSortIcon('size')}
                            <input
                                type="text"
                                className="form-control form-control-sm mt-1"
                                placeholder="Filter"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                }}
                                value={columnFilters.size || ''}
                                onChange={(e) => setColumnFilters({ ...columnFilters, size: e.target.value })}
                            />
                        </th>
                        <th style={{ ...tableCellStyle }} onClick={() => handleSort('symbol')}>
                            Symbol {getSortIcon('symbol')}
                            <input
                                type="text"
                                className="form-control form-control-sm mt-1"
                                placeholder="Filter"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                }}
                                value={columnFilters.symbol || ''}
                                onChange={(e) => setColumnFilters({ ...columnFilters, symbol: e.target.value })}
                            />
                        </th>
                        <th style={tableCellStyle} onClick={() => handleSort('price')}>
                            Cena (PLN) {getSortIcon('price')}
                        </th>
                        <th style={{ ...tableCellStyle, textAlign: 'center' }}>
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                Kody kreskowe
                                <input
                                    type="checkbox"
                                    style={{ width: '20px', height: '20px' }}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(filteredTableData.map((row) => row.id));
                                        } else {
                                            setSelectedIds([]);
                                        }
                                    }}
                                    checked={
                                        filteredTableData.length > 0 &&
                                        filteredTableData.every((row) => selectedIds.includes(row.id))
                                    }
                                />
                            </div>
                        </th>
                        <th style={{ ...tableCellStyle, textAlign: 'center' }}>Akcje</th>
                    </tr>
                </thead>
                <tbody>
                    {currentRecords.map((row, index) => (
                        <tr key={row.id || index} style={{ backgroundColor: 'black', color: 'white' }}>
                            <td style={tableCellStyle} data-label="Nr zamówienia">
                                {indexOfFirstRecord + index + 1}
                            </td>
                            <td style={tableCellStyle} data-label="Pełna nazwa">{row.fullName}</td>
                            <td style={tableCellStyle} data-label="Data">
                                {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td style={tableCellStyle} data-label="Rozmiar">{row.size}</td>
                            <td style={tableCellStyle} data-label="Symbol">{row.symbol}</td>
                            <td style={tableCellStyle} data-label="Cena (PLN)">
                                {row.price}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'center' }} data-label="Barcode">
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                    <Barcode value={row.barcode} width={0.8} height={30} fontSize={10} />
                                    <input
                                        type="checkbox"
                                        style={{ width: '20px', height: '20px' }}
                                        checked={selectedIds.includes(row.id)}
                                        onChange={() => toggleRowSelection(row.id)}
                                    />
                                </div>
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'center' }} data-label="Akcje">
                                <div className="d-flex justify-content-center gap-1">
                                    <Button color="warning" size="sm" onClick={() => handleEditClick(row)}>Edytuj</Button>
                                    <Button color="danger" size="sm" onClick={() => {
                                        if (window.confirm('Czy na pewno chcesz usunąć ten wiersz?')) {
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
                            placeholder="Wybierz pełną nazwę"
                            isClearable
                            isSearchable
                            className="w-100"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    backgroundColor: 'black',
                                    color: 'white',
                                    borderColor: state.isFocused ? '#0d6efd' : base.borderColor,
                                    boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow,
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
                                    border: '1px solid white',
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor,
                                    color: state.isFocused ? 'white' : base.color,
                                }),
                            }}
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
                            placeholder="Wybierz rozmiar"
                            isClearable
                            isSearchable
                            className="w-100"
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    backgroundColor: 'black',
                                    color: 'white',
                                    borderColor: state.isFocused ? '#0d6efd' : base.borderColor,
                                    boxShadow: state.isFocused ? '0 0 0 1px #0d6efd' : base.boxShadow,
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
                                    border: '1px solid white',
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused ? '#0d6efd' : base.backgroundColor,
                                    color: state.isFocused ? 'white' : base.color,
                                }),
                            }}
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