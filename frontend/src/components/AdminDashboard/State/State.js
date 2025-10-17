import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
    const { userId } = useParams(); // Get userId from URL parameters
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
    
    // States for label printing functionality
    const [priceList, setPriceList] = useState(null); // State for user's price list
    const [isPrintingLabel, setIsPrintingLabel] = useState(false); // State for printing status
    const [colors, setColors] = useState([]); // State for colors mapping
    const [isDateRangePickerVisible, setIsDateRangePickerVisible] = useState(false); // State to toggle date range picker visibility
    const calendarRef = useRef(null); // Ref for the calendar container
    const [loading, setLoading] = useState(false); // Loading state
    const [magazynCount, setMagazynCount] = useState(0); // State to store the count of "MAGAZYN"
    
    // State report states
    const [isStateReportModalOpen, setIsStateReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState('movements'); // 'movements' or 'inventory'
    const [reportDateRange, setReportDateRange] = useState([{ 
        startDate: new Date(new Date().setHours(0, 0, 0, 0)), 
        endDate: new Date(new Date().setHours(23, 59, 59, 999)), 
        key: 'selection' 
    }]);
    const [inventoryDate, setInventoryDate] = useState(new Date()); // For inventory reports
    const [selectedFiltersForReport, setSelectedFiltersForReport] = useState([]); // Multi-select filters
    const [selectedProductForReport, setSelectedProductForReport] = useState(null);
    const [selectedCategoryForReport, setSelectedCategoryForReport] = useState(null);
    const [selectedManufacturerForReport, setSelectedManufacturerForReport] = useState(null);
    const [selectedSizeForReport, setSelectedSizeForReport] = useState(null);
    const [manufacturers, setManufacturers] = useState([]);
    const [availableSizes, setAvailableSizes] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [summaryData, setSummaryData] = useState(null); // For "All States" summary below table

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

    // Test mount
    useEffect(() => {
        console.log('🏁 State component mounted!');
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

        // Fetch colors for label printing mapping
        const fetchColors = async () => {
            try {
                const response = await axios.get('/api/excel/color/get-all-colors');
                setColors(response.data.colors || []);
            } catch (error) {
                console.error('Error fetching colors:', error);
                setColors([]); // Fallback to an empty array
            }
        };

        fetchSizes();
        fetchColors();
    }, []);    useEffect(() => {
        // Fetch user data from the API
        const fetchUsers = async () => {
            try {
                const response = await axios.get('/api/user');
                if (response.data && Array.isArray(response.data.users)) {
                    
                    let usersToShow;
                    
                    // If userId is provided, show only that specific user
                    if (userId) {
                        const selectedUser = response.data.users.find(u => u._id === userId);
                        if (selectedUser) {
                            usersToShow = [selectedUser]; // Show only the selected user
                            setSelectedSellingPoint(selectedUser.symbol);
                        } else {
                            console.error('User with ID not found:', userId);
                            usersToShow = [];
                        }
                    } else {
                        // Show all users except admin if no specific userId
                        usersToShow = response.data.users.filter(user => 
                            user.role?.toLowerCase() !== 'admin'
                        );
                        // Set default to "all" to show all states at once
                        setSelectedSellingPoint('all');
                    }
                    
                    setUsers(usersToShow);
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
    }, [userId]); // Re-run when userId changes

    // Fetch price list for the current user (for label printing)
    useEffect(() => {
        const fetchPriceList = async () => {
            if (!userId) return;
            
            try {
                const response = await axios.get(`/api/pricelists/${userId}`);
                if (response.data) {
                    // Transform structure to match AddToState: { items: [items] }
                    const priceListData = {
                        items: response.data.priceList || [],
                        sellingPointId: userId
                    };
                    setPriceList(priceListData);
                } else {
                    setPriceList(null);
                }
            } catch (error) {
                // If user doesn't have a dedicated price list, that's OK - we'll use fallback
                console.log('No dedicated price list found for user, will use fallback pricing');
                setPriceList(null);
            }
        };

        fetchPriceList();
    }, [userId]); // Re-run when userId changes

    const fetchTableData = useCallback(async () => {
        setLoading(true);
        
        try {
            // Special handling for "All States" - show detailed data + fetch summary for later use
            if (selectedSellingPoint === 'all') {

                // Get detailed data from regular state endpoint (shows all individual items)
                const detailResponse = await axios.get('/api/state');
                
                // Also fetch grouped summary for display below table
                const summaryResponse = await axios.get('/api/state/all/inventory', {
                    params: { 
                        date: new Date().toISOString().split('T')[0] // Use current date
                    }
                });
                
                // Store summary data for later use in component
                setSummaryData(summaryResponse.data);
                
                // Use detailed data for table (shows each individual product)
                let filteredData = detailResponse.data;
                
                // Apply column filters for All States
                if (columnFilters.fullName) {
                    filteredData = filteredData.filter((row) =>
                        (row.fullName || '').toLowerCase().includes(columnFilters.fullName.toLowerCase())
                    );
                }
                
                if (columnFilters.size) {
                    filteredData = filteredData.filter((row) =>
                        (row.size || '').toLowerCase().includes(columnFilters.size.toLowerCase())
                    );
                }
                
                if (columnFilters.symbol) {
                    filteredData = filteredData.filter((row) =>
                        (row.symbol || '').toLowerCase().includes(columnFilters.symbol.toLowerCase())
                    );
                }
                
                // Apply date range filter for All States
                if (dateRange && dateRange[0].startDate && dateRange[0].endDate) {
                    filteredData = filteredData.filter((row) => {
                        const rowDate = new Date(row.date);
                        return rowDate >= dateRange[0].startDate && rowDate <= dateRange[0].endDate;
                    });
                }
                
                const formattedData = filteredData.map((row) => {
                    // Find user name for selling point using symbol from backend
                    let sellingPointName = row.symbol || "Brak danych";
                    if (users.length > 0 && row.symbol) {
                        const userForSymbol = users.find(u => u.symbol === row.symbol);
                        if (userForSymbol) {
                            const userName = userForSymbol.name || userForSymbol.symbol || 'Nieznany';
                            if (userName.toUpperCase() === userForSymbol.symbol.toUpperCase()) {
                                sellingPointName = userName;
                            } else {
                                sellingPointName = userName + ' (' + userForSymbol.symbol + ')';
                            }
                        }
                    }
                    
                    return {
                        id: row.id,
                        fullName: row.fullName || "Brak danych",
                        plec: row.plec || "Brak danych", 
                        date: row.date,
                        size: row.size || "Brak danych",
                        barcode: row.barcode || "Brak danych",
                        symbol: row.symbol || "Brak danych",
                        sellingPointName: sellingPointName,
                        price: row.price || 0,
                        quantity: 1 // Each individual item has quantity 1
                    };
                });
                
                setTableData(formattedData.reverse());
                setLoading(false);
                return;
            }
            
            const response = await axios.get('/api/state');
            
            let filteredData = response.data;
            
            // If userId is provided in URL, filter by that specific user
            if (userId && users.length > 0) {
                // Find user by ID to get their symbol
                const user = users.find(u => u._id === userId);
                if (user) {
                    let targetSymbol = user.symbol;
                    // Special handling for warehouse users
                    if (user.role?.toLowerCase() === 'magazyn') {
                        targetSymbol = 'MAGAZYN'; // Products in warehouse have symbol 'MAGAZYN'
                    }
                    filteredData = response.data.filter(row => row.symbol === targetSymbol);
                } else {
                    console.warn('User with userId not found in users array:', userId);
                    filteredData = []; // No data if user not found
                }
            } else if (selectedSellingPoint && selectedSellingPoint !== '') {
                if (selectedSellingPoint === 'all') {
                    // Show all states - no filtering by selling point
                    filteredData = response.data;
                } else {
                    // Otherwise filter by selected selling point
                    const selectedUser = users.find(u => u.symbol === selectedSellingPoint);
                    let targetSymbol = selectedSellingPoint;
                    // Special handling for warehouse users
                    if (selectedUser && selectedUser.role?.toLowerCase() === 'magazyn') {
                        targetSymbol = 'MAGAZYN'; // Products in warehouse have symbol 'MAGAZYN'
                    }
                    filteredData = response.data.filter(row => row.symbol === targetSymbol);
                }
            } else {
                // If no selling point selected, show all data as fallback
                filteredData = response.data;
            }

            const formattedData = filteredData.map((row) => {
                // Combine price and discount_price with semicolon if both exist
                let combinedPrice;
                if (row.discount_price && row.discount_price !== 0 && row.discount_price !== "0") {
                    combinedPrice = `${row.price};${row.discount_price}`;
                } else {
                    combinedPrice = row.price;
                }
                
                // Find user name for selling point using symbol from backend
                let sellingPointName = row.symbol || "Brak danych";
                if (users.length > 0 && row.symbol) {
                    const userForSymbol = users.find(u => u.symbol === row.symbol);
                    if (userForSymbol) {
                        const userName = userForSymbol.name || userForSymbol.symbol || 'Nieznany';
                        // Don't duplicate if name and symbol are the same (e.g., MAGAZYN)
                        if (userName.toUpperCase() === userForSymbol.symbol.toUpperCase()) {
                            sellingPointName = userName;
                        } else {
                            sellingPointName = userName + ' (' + userForSymbol.symbol + ')';
                        }
                    }
                }
                
                const formattedRow = {
                    id: row.id, // Backend already provides id field
                    fullName: row.fullName || "Brak danych", // Backend already formats this
                    plec: row.plec || "Brak danych", 
                    date: row.date,
                    size: row.size || "Brak danych", // Backend already formats this
                    barcode: row.barcode || "Brak danych",
                    symbol: row.symbol || "Brak danych", // Backend already provides this
                    sellingPointName: sellingPointName,
                    price: combinedPrice, // Set combined price with semicolon
                };
                
                return formattedRow;
            });
            
            setTableData(formattedData.reverse());
        } catch (error) {
            console.error('Error fetching table data:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedSellingPoint, users, columnFilters, dateRange]);

    const sendDataToBackend = async (selectedSize, selectedPlec) => {
        if (!input1Value.trim() || !selectedSize || !selectedDate || !selectedSellingPoint) {
            alert('Wszystkie dane muszą być uzupełnione');
            return;
        }

        setLoading(true);
        try {
            // Fetch the selected good to check for price exceptions
            const selectedGood = goods.find((good) => good.fullName === input1Value.trim());
            if (!selectedGood) {
                alert('Wybrany produkt nie istnieje w bazie danych.');
                setLoading(false);
                return;
            }

            // Check if the selected size exists in the price exceptions
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
                price = `${selectedGood.price}`
            } else {
                price = selectedGood.price;
            }

            const dataToSend = {
                fullName: input1Value.trim(),
                size: selectedSize,
                plec: selectedPlec,
                date: selectedDate.toISOString(),
                sellingPoint: selectedSellingPoint,
                price,
            };

            const response = await axios.post('/api/state', dataToSend);

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
            // Do not reset selectedSellingPoint
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
        if (users.length > 0) {
            fetchTableData(); // Fetch table data when users are loaded or selectedSellingPoint changes
        }
    }, [selectedSellingPoint, users]);

    // Load manufacturers and sizes for report filters
    useEffect(() => {
        const fetchManufacturers = async () => {
            try {
                const response = await axios.get('/api/manufacturers');
                setManufacturers(response.data.manufacturers || []);
            } catch (error) {
                console.error('Error fetching manufacturers:', error);
            }
        };
        
        const fetchSizes = async () => {
            try {
                const response = await axios.get('/api/sizes');
                setAvailableSizes(response.data.sizes || []);
            } catch (error) {
                console.error('Error fetching sizes:', error);
            }
        };
        
        fetchManufacturers();
        fetchSizes();
    }, []);

    useEffect(() => {
        // Clear summary data when changing selling points
        if (selectedSellingPoint !== 'all') {
            setSummaryData(null);
        }
        fetchTableData(); // Refetch data when selling point changes or userId changes
    }, [selectedSellingPoint, userId, users]); // Removed filters to avoid infinite loop

    // Separate useEffect for handling filters in "All States" mode
    useEffect(() => {
        if (selectedSellingPoint === 'all' && users.length > 0) {

            fetchTableData();
        }
    }, [columnFilters, dateRange]);

    // Function to handle selling point selection
    const handleSellingPointChange = (value) => {
        setSelectedSellingPoint(value);
    };

    useEffect(() => {
        // Consolidate all filtering logic into one useEffect to avoid conflicts
        let filteredData = [...tableData];

        // Filter by selected selling point (most important filter)
        if (selectedSellingPoint && selectedSellingPoint !== 'all') {
            // Find the selected user to check their role
            const selectedUser = users.find(u => u.symbol === selectedSellingPoint);
            
            filteredData = filteredData.filter((row) => {
                let targetSymbol = selectedSellingPoint;
                
                // Special handling for warehouse users
                if (selectedUser && selectedUser.role?.toLowerCase() === 'magazyn') {
                    targetSymbol = 'MAGAZYN'; // Products in warehouse have symbol 'MAGAZYN'
                }
                
                const match = row.symbol?.trim().toLowerCase() === targetSymbol.trim().toLowerCase();
                return match;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filteredData = filteredData.filter((row) =>
                Object.values(row).some((value) =>
                    value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Filter by name
        if (nameFilter) {
            filteredData = filteredData.filter((row) =>
                row.fullName.toLowerCase().includes(nameFilter.toLowerCase())
            );
        }

        // Filter by size
        if (sizeFilter) {
            filteredData = filteredData.filter((row) =>
                row.size.toLowerCase().includes(sizeFilter.toLowerCase())
            );
        }

        // Filter by date
        if (dateFilter) {
            filteredData = filteredData.filter((row) =>
                new Date(row.date).toLocaleDateString() === new Date(dateFilter).toLocaleDateString()
            );
        }

        // Filter by selling point filter (different from selectedSellingPoint)
        if (sellingPointFilter) {
            filteredData = filteredData.filter((row) =>
                row.symbol.toLowerCase().includes(sellingPointFilter.toLowerCase())
            );
        }

        // Apply column filters
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

        // Filter by date range
        if (dateRange[0].startDate && dateRange[0].endDate) {
            filteredData = filteredData.filter((row) => {
                const rowDate = new Date(row.date);
                return rowDate >= dateRange[0].startDate && rowDate <= dateRange[0].endDate;
            });
        }

        setFilteredTableData(filteredData);
    }, [
        tableData, 
        selectedSellingPoint, 
        searchQuery, 
        nameFilter, 
        sizeFilter, 
        dateFilter, 
        sellingPointFilter, 
        columnFilters, 
        dateRange
    ]);

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

    // State report functions
    const handleStateReport = () => {
        setIsStateReportModalOpen(true);
    };

    const toggleStateReportModal = () => setIsStateReportModalOpen(!isStateReportModalOpen);

    // Generate state report
    const generateStateReport = async () => {
        setReportLoading(true);
        try {
            if (reportType === 'movements') {
                const startDate = reportDateRange[0].startDate;
                const endDate = reportDateRange[0].endDate;
                
                if (!startDate || !endDate) {
                    alert('Proszę wybrać zakres dat');
                    setReportLoading(false);
                    return;
                }
                
                await generateMovementsReport(startDate, endDate);
            } else if (reportType === 'inventory') {
                if (!inventoryDate) {
                    alert('Proszę wybrać datę inwentarza');
                    setReportLoading(false);
                    return;
                }
                
                await generateInventoryReport(inventoryDate);
            }
        } catch (error) {
            console.error('Error generating state report:', error);
            alert('Błąd podczas generowania raportu: ' + (error.response?.data?.message || error.message));
        } finally {
            setReportLoading(false);
        }
    };

    // Generate movements report for state
    const generateMovementsReport = async (startDate, endDate) => {
        try {
            // Determine filter type based on selected options
            let filterType = 'all';
            const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
            
            if (selectedFiltersValues.includes('all') || selectedFiltersValues.length === 0) {
                filterType = 'all';
            } else if (selectedFiltersValues.includes('specific')) {
                filterType = 'specific';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('manufacturer') && selectedFiltersValues.includes('size')) {
                filterType = 'combined_all';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('manufacturer')) {
                filterType = 'combined';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('size')) {
                filterType = 'category_size';
            } else if (selectedFiltersValues.includes('manufacturer') && selectedFiltersValues.includes('size')) {
                filterType = 'manufacturer_size';
            } else if (selectedFiltersValues.includes('category')) {
                filterType = 'category';  
            } else if (selectedFiltersValues.includes('manufacturer')) {
                filterType = 'manufacturer';
            } else if (selectedFiltersValues.includes('size')) {
                filterType = 'size';
            }

            const params = {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                productFilter: filterType,
                productId: selectedProductForReport?.value || null,
                category: selectedCategoryForReport?.value || null,
                manufacturerId: selectedManufacturerForReport?.value || null,
                sizeId: selectedSizeForReport?.value || null
            };

            // Use different endpoint for "all states" vs specific user
            const reportUrl = (!userId || selectedSellingPoint === 'all') 
                ? '/api/state/all/report'  // New endpoint for all states
                : `/api/state/${userId}/report`;
            
            const response = await axios.get(reportUrl, { params });
            setReportData(response.data);
            
            // Generate PDF report
            generateReportPDF(response.data, startDate, endDate);
            
        } catch (error) {
            console.error('Error generating state movements report:', error);
            alert('Błąd podczas generowania raportu: ' + (error.response?.data?.message || error.message));
        }
    };

    // Generate inventory report for state
    const generateInventoryReport = async (date) => {
        try {
            // Similar logic for inventory report
            let filterType = 'all';
            const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
            
            if (selectedFiltersValues.includes('all') || selectedFiltersValues.length === 0) {
                filterType = 'all';
            } else if (selectedFiltersValues.includes('specific')) {
                filterType = 'specific';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('manufacturer') && selectedFiltersValues.includes('size')) {
                filterType = 'combined_all';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('manufacturer')) {
                filterType = 'combined';
            } else if (selectedFiltersValues.includes('category') && selectedFiltersValues.includes('size')) {
                filterType = 'category_size';
            } else if (selectedFiltersValues.includes('manufacturer') && selectedFiltersValues.includes('size')) {
                filterType = 'manufacturer_size';
            } else if (selectedFiltersValues.includes('category')) {
                filterType = 'category';  
            } else if (selectedFiltersValues.includes('manufacturer')) {
                filterType = 'manufacturer';
            } else if (selectedFiltersValues.includes('size')) {
                filterType = 'size';
            }

            const params = {
                date: date.toISOString().split('T')[0],
                productFilter: filterType,
                productId: selectedProductForReport?.value || null,
                category: selectedCategoryForReport?.value || null,
                manufacturerId: selectedManufacturerForReport?.value || null,
                sizeId: selectedSizeForReport?.value || null
            };

            // Use different endpoint for "all states" vs specific user
            const inventoryUrl = (!userId || selectedSellingPoint === 'all') 
                ? '/api/state/all/inventory'  // New endpoint for all states
                : `/api/state/${userId}/inventory`;
            
            const response = await axios.get(inventoryUrl, { params });
            setReportData(response.data);
            
            // Generate PDF report
            generateInventoryReportPDF(response.data, date);
            
        } catch (error) {
            console.error('Error generating state inventory report:', error);
            alert('Błąd podczas generowania raportu inwentarza: ' + (error.response?.data?.message || error.message));
        }
    };

    // Generate PDF for state movements report
    const generateReportPDF = (data, startDate, endDate) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            compress: true
        });
        
        // Function to convert Polish characters for PDF
        const convertPolishChars = (text) => {
            if (!text) return text;
            return text
                .replace(/ą/g, 'a')
                .replace(/ć/g, 'c')
                .replace(/ę/g, 'e')
                .replace(/ł/g, 'l')
                .replace(/ń/g, 'n')
                .replace(/ó/g, 'o')
                .replace(/ś/g, 's')
                .replace(/ź/g, 'z')
                .replace(/ż/g, 'z')
                .replace(/Ą/g, 'A')
                .replace(/Ć/g, 'C')
                .replace(/Ę/g, 'E')
                .replace(/Ł/g, 'L')
                .replace(/Ń/g, 'N')
                .replace(/Ó/g, 'O')
                .replace(/Ś/g, 'S')
                .replace(/Ź/g, 'Z')
                .replace(/Ż/g, 'Z');
        };
        
        // Set professional font
        doc.setFont('helvetica', 'normal');
        
        // Get page width for centering
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Title - centered
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const currentStateName = getCurrentStateName();
        const titlePrefix = currentStateName === 'Wszystkie stany' ? 'Raport Przeplywow' : 'Raport Punktu Sprzedazy';
        const titleText = convertPolishChars(`${titlePrefix}: ${currentStateName}`);
        const titleWidth = doc.getTextWidth(titleText);
        doc.text(titleText, (pageWidth - titleWidth) / 2, 20);
        
        // Date range - centered
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const periodText = convertPolishChars(`Okres: ${startDate.toLocaleDateString('pl-PL')} - ${endDate.toLocaleDateString('pl-PL')}`);
        const periodWidth = doc.getTextWidth(periodText);
        doc.text(periodText, (pageWidth - periodWidth) / 2, 35);
        
        // Product filter info - centered
        let productText = '';
        const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
        
        if (selectedFiltersValues.includes('specific') && selectedProductForReport) {
            productText = convertPolishChars(`Produkt: ${selectedProductForReport.label}`);
        } else {
            let filters = [];
            if (selectedFiltersValues.includes('category') && selectedCategoryForReport) {
                filters.push(`Kategoria: ${selectedCategoryForReport.label}`);
            }
            if (selectedFiltersValues.includes('manufacturer') && selectedManufacturerForReport) {
                filters.push(`Grupa: ${selectedManufacturerForReport.label}`);
            }
            
            if (filters.length > 0) {
                productText = convertPolishChars(filters.join(', '));
            } else {
                productText = convertPolishChars('Wszystkie produkty');
            }
        }
        const productWidth = doc.getTextWidth(productText);
        doc.text(productText, (pageWidth - productWidth) / 2, 45);
        
        // Initial state info
        let yPosition = 55;
        if (data.initialState) {
            doc.setFont('helvetica', 'bold');
            const initialText = convertPolishChars(`Stan poczatkowy (${startDate.toLocaleDateString('pl-PL')}): ${data.initialState.quantity || 0}`);
            const initialWidth = doc.getTextWidth(initialText);
            doc.text(initialText, (pageWidth - initialWidth) / 2, yPosition);
            doc.setFont('helvetica', 'normal');
            yPosition += 15;
        }
        
        // Table headers
        const tableColumn = ['Lp.', 'Data', 'Nazwa produktu', 'Rozmiar', 'Rodzaj', 'Skad', 'Dokad', 'Odj.', 'Dod.'];
        const tableRows = [];
        
        // Add operations (handle both single user 'operations' and all states 'movements')
        const operationsData = data.operations || data.movements || [];
        operationsData.forEach((operation, index) => {
            // Map fields for different response formats
            const type = operation.type || operation.operation || 'Nieznana operacja';
            const from = operation.from || operation.source || 'Nieznane';
            const to = operation.to || operation.destination || 'Nieznane';
            
            const row = [
                (index + 1).toString(),
                new Date(operation.date).toLocaleDateString('pl-PL'),
                convertPolishChars(operation.product || 'Nieznany produkt'),
                convertPolishChars(operation.size || '-'),
                convertPolishChars(type),
                convertPolishChars(from),
                convertPolishChars(to),
                operation.subtract && operation.subtract > 0 ? -operation.subtract : '',
                operation.add && operation.add > 0 ? operation.add : ''
            ];
            tableRows.push(row);
        });
        
        // Add summary row
        if (data.summary) {
            tableRows.push([
                {
                    content: 'Suma',
                    colSpan: 7,
                    styles: { 
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [230, 230, 230]
                    }
                },
                {
                    content: data.summary.totalSubtracted && data.summary.totalSubtracted > 0 ? -data.summary.totalSubtracted : '',
                    styles: { 
                        halign: 'center',
                        fontStyle: 'bold',
                        fillColor: [230, 230, 230]
                    }
                },
                {
                    content: data.summary.totalAdded && data.summary.totalAdded > 0 ? data.summary.totalAdded : '',
                    styles: { 
                        halign: 'center',
                        fontStyle: 'bold',
                        fillColor: [230, 230, 230]
                    }
                }
            ]);
        }
        
        // Calculate table position
        const tableWidth = 8 + 14 + 25 + 10 + 18 + 15 + 15 + 10 + 10; // = 125mm
        const tableStartX = (pageWidth - tableWidth) / 2;
        
        // Add table to PDF
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: yPosition,
            theme: 'grid',
            margin: { left: tableStartX },
            tableWidth: tableWidth,
            styles: {
                fontSize: 8,
                halign: 'center',
                cellPadding: 2,
                font: 'helvetica',
                fontStyle: 'normal'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
                font: 'helvetica'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },  // Lp
                1: { halign: 'center', cellWidth: 14 }, // Data
                2: { halign: 'left', cellWidth: 25 },   // Nazwa produktu
                3: { halign: 'center', cellWidth: 10 }, // Rozmiar
                4: { halign: 'center', cellWidth: 18 }, // Rodzaj
                5: { halign: 'center', cellWidth: 15 }, // Skad
                6: { halign: 'center', cellWidth: 15 }, // Dokad
                7: { halign: 'center', cellWidth: 10 }, // Odj.
                8: { halign: 'center', cellWidth: 10 }  // Dod.
            }
        });
        
        // Add final calculation
        if (data.summary) {
            let finalY = doc.lastAutoTable.finalY + 20;
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            
            const initialState = data.initialState?.quantity || 0;
            const totalAdded = data.summary.totalAdded || 0;
            const totalSubtracted = data.summary.totalSubtracted || 0;
            const finalState = data.summary.finalState || 0;
            
            const formulaText = convertPolishChars(`Stan koncowy (${endDate.toLocaleDateString('pl-PL')}): ${initialState} + ${totalAdded} - ${totalSubtracted} = ${finalState}`);
            const formulaWidth = doc.getTextWidth(formulaText);
            doc.text(formulaText, (pageWidth - formulaWidth) / 2, finalY);
        }
        
        // Open print dialog
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
            printWindow.onload = function() {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                    URL.revokeObjectURL(pdfUrl);
                };
            };
        }
        
        setIsStateReportModalOpen(false);
    };

    // Generate inventory PDF report
    const generateInventoryReportPDF = (data, date) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            compress: true
        });
        
        // Function to convert Polish characters for PDF
        const convertPolishChars = (text) => {
            if (!text) return text;
            return text
                .replace(/ą/g, 'a')
                .replace(/ć/g, 'c')
                .replace(/ę/g, 'e')
                .replace(/ł/g, 'l')
                .replace(/ń/g, 'n')
                .replace(/ó/g, 'o')
                .replace(/ś/g, 's')
                .replace(/ź/g, 'z')
                .replace(/ż/g, 'z')
                .replace(/Ą/g, 'A')
                .replace(/Ć/g, 'C')
                .replace(/Ę/g, 'E')
                .replace(/Ł/g, 'L')
                .replace(/Ń/g, 'N')
                .replace(/Ó/g, 'O')
                .replace(/Ś/g, 'S')
                .replace(/Ź/g, 'Z')
                .replace(/Ż/g, 'Z');
        };
        
        // Set professional font
        doc.setFont('helvetica', 'normal');
        
        // Get page width for centering
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Title - centered
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const currentStateName = getCurrentStateName();
        const titlePrefix = currentStateName === 'Wszystkie stany' ? 'Raport Stanow' : 'Stan Magazynowy Punktu';
        const titleText = convertPolishChars(`${titlePrefix}: ${currentStateName}`);
        const titleWidth = doc.getTextWidth(titleText);
        doc.text(titleText, (pageWidth - titleWidth) / 2, 20);
        
        // Date - centered
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const dateText = convertPolishChars(`Na dzien: ${date.toLocaleDateString('pl-PL')}`);
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, (pageWidth - dateWidth) / 2, 35);
        
        // Product filter info - centered
        let productText = '';
        const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
        
        if (selectedFiltersValues.includes('specific') && selectedProductForReport) {
            productText = convertPolishChars(`Produkt: ${selectedProductForReport.label}`);
        } else {
            let filters = [];
            if (selectedFiltersValues.includes('category') && selectedCategoryForReport) {
                filters.push(`Kategoria: ${selectedCategoryForReport.label}`);
            }
            if (selectedFiltersValues.includes('manufacturer') && selectedManufacturerForReport) {
                filters.push(`Grupa: ${selectedManufacturerForReport.label}`);
            }
            
            if (filters.length > 0) {
                productText = convertPolishChars(filters.join(', '));
            } else {
                productText = convertPolishChars('Wszystkie produkty');
            }
        }
        const productWidth = doc.getTextWidth(productText);
        doc.text(productText, (pageWidth - productWidth) / 2, 45);
        
        // Table headers
        const tableColumn = ['Lp.', 'Nazwa produktu', 'Rozmiar', 'Ilosc'];
        const tableRows = [];
        
        // Add inventory items
        data.inventory?.forEach((item, index) => {
            const row = [
                (index + 1).toString(),
                convertPolishChars(item.product || 'Nieznany produkt'),
                convertPolishChars(item.size || 'Brak'),
                (item.quantity || 0).toString()
            ];
            tableRows.push(row);
        });
        
        // Add summary row
        if (data.summary) {
            tableRows.push([
                {
                    content: 'RAZEM',
                    colSpan: 3,
                    styles: { 
                        halign: 'left',
                        fontStyle: 'bold',
                        fillColor: [230, 230, 230]
                    }
                },
                {
                    content: data.summary.totalItems.toString(),
                    styles: { 
                        halign: 'center',
                        fontStyle: 'bold',
                        fillColor: [230, 230, 230]
                    }
                }
            ]);
        }
        
        // Calculate table position
        const tableWidth = 12 + 80 + 25 + 20; // = 137mm
        const tableStartX = (pageWidth - tableWidth) / 2;
        
        // Add table to PDF
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            margin: { left: tableStartX },
            tableWidth: tableWidth,
            styles: {
                fontSize: 8,
                halign: 'center',
                cellPadding: 2,
                font: 'helvetica',
                fontStyle: 'normal'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
                font: 'helvetica'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 }, // Lp
                1: { halign: 'left', cellWidth: 80 },   // Nazwa produktu (powiększona)
                2: { halign: 'center', cellWidth: 25 }, // Rozmiar (powiększony)
                3: { halign: 'center', cellWidth: 20 }  // Ilosc (powiększona)
            }
        });
        
        // Add summary info
        if (data.summary) {
            let finalY = doc.lastAutoTable.finalY + 20;
            
            // Check if this is "All States" report (has reportType)
            const isAllStatesReport = data.summary.reportType && data.summary.reportType.includes('All States');
            
            if (isAllStatesReport && data.inventory && data.inventory.length > 0) {
                // Add detailed summary section for All States
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                const summaryTitle = convertPolishChars('Podsumowanie produktow (zgrupowane)');
                const titleWidth = doc.getTextWidth(summaryTitle);
                doc.text(summaryTitle, (pageWidth - titleWidth) / 2, finalY);
                
                finalY += 15;
                
                // Add each product summary
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                
                data.inventory.forEach((item, index) => {
                    if (finalY > 270) { // Check if we need a new page
                        doc.addPage();
                        finalY = 30;
                    }
                    
                    const summaryLine = convertPolishChars(
                        `${index + 1}. ${item.product || 'Nieznany produkt'} ${item.size || '-'} - ${item.quantity || 0} sztuk`
                    );
                    doc.text(summaryLine, 20, finalY);
                    finalY += 6;
                    
                    // Add selling points info if available
                    if (item.sellingPoints && item.sellingPoints !== 'Wszystkie stany') {
                        const pointsLine = convertPolishChars(`   Punkty: ${item.sellingPoints}`);
                        doc.setFont('helvetica', 'italic');
                        doc.setFontSize(8);
                        doc.text(pointsLine, 25, finalY);
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(10);
                        finalY += 5;
                    }
                });
                
                finalY += 10;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
        }
        
        // Open print dialog
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
            printWindow.onload = function() {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                    URL.revokeObjectURL(pdfUrl);
                };
            };
        }
        
        setIsStateReportModalOpen(false);
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
            id: row.id, // Include ID for saving changes
            fullName: row.fullName,
            date: row.date,
            size: row.size,
            symbol: row.symbol || '', // Ensure symbol is included and defaults to an empty string if null
        });
        toggleEditModal(); // Open the modal
    };

    const handleSaveEdit = async () => {
        try {
            await axios.put(`/api/state/${editData.id}`, {
                fullName: editData.fullName,
                date: editData.date,
                size: editData.size,
                sellingPoint: editData.symbol, // Send updated symbol as sellingPoint
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

    // Get price info from price list with priority system (same as AddToState)
    const getPriceFromPriceList = (item, itemSize) => {
        if (!priceList || !priceList.items) {
            return null;
        }

        // Find matching item in price list by barcode or name/category combination
        const priceListItem = priceList.items.find(priceItem => {
            // Match by barcode if available
            if (item.barcode && priceItem.code === item.barcode) {
                return true;
            }
            
            // Match by name and category if no barcode match
            const itemFullName = typeof item.fullName === 'object' 
                ? item.fullName?.fullName 
                : item.fullName;
            
            // If names match exactly, don't require category match (in case category is missing)
            if (priceItem.fullName === itemFullName) {
                return true;
            }
            
            // Otherwise require both name and category match
            return priceItem.fullName === itemFullName && 
                   priceItem.category === item.category;
        });

        if (!priceListItem) {
            return null;
        }

        const result = {
            regularPrice: priceListItem.price || 0,
            discountPrice: priceListItem.discountPrice || 0,
            sizeExceptionPrice: null,
            hasDiscount: priceListItem.discountPrice && priceListItem.discountPrice > 0
        };

        // Check for size-specific exceptions
        if (itemSize && priceListItem.priceExceptions && priceListItem.priceExceptions.length > 0) {
            const sizeException = priceListItem.priceExceptions.find(exception => {
                const exceptionSizeName = exception.size?.Roz_Opis || exception.size;
                return exceptionSizeName === itemSize;
            });
            
            if (sizeException) {
                result.sizeExceptionPrice = sizeException.value;
            }
        }

        return result;
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

        // Generate ZPL labels for each selected row
        const allLabels = [];
        
        selectedIds.forEach((id) => {
            const row = tableData.find((item) => item.id === id);
            
            // Use price list priority system (same as AddToState)
            const priceInfo = getPriceFromPriceList(row, row?.size);
            
            let finalPrice;
            if (priceInfo) {
                // Priority 1: Size exceptions override everything
                if (priceInfo.sizeExceptionPrice) {
                    finalPrice = priceInfo.sizeExceptionPrice;
                } 
                // Priority 2: Discount price
                else if (priceInfo.hasDiscount) {
                    finalPrice = priceInfo.discountPrice;
                }
                // Priority 3: Regular price
                else {
                    finalPrice = priceInfo.regularPrice;
                }
            } else {
                // Fallback to original price from database
                finalPrice = row?.price || "Brak ceny";
            }

            // Check if item has promotional pricing that requires two labels
            const shouldPrintTwoLabels = priceInfo && priceInfo.hasDiscount && !priceInfo.sizeExceptionPrice;
            
            if (shouldPrintTwoLabels) {
                // Print both regular and discount price labels
                const regularZPL = generateZPLCode(row, priceInfo.regularPrice);
                const discountZPL = generateZPLCode(row, priceInfo.discountPrice);
                allLabels.push(regularZPL);
                allLabels.push(discountZPL);
            } else {
                // Single label with priority-based price
                const zplCode = generateZPLCode(row, finalPrice);
                allLabels.push(zplCode);
            }
        });

        // Send each label separately to the printer
        let labelIndex = 0;
        const sendNextLabel = () => {
            if (labelIndex >= allLabels.length) {
                setSelectedIds([]); // Clear selected IDs after all labels are printed
                return;
            }
            
            printer.send(
                allLabels[labelIndex],
                () => {
                    labelIndex++;
                    // Small delay between labels to ensure proper processing
                    setTimeout(sendNextLabel, 100);
                },
                (err) => alert(`Błąd drukowania etykiety ${labelIndex + 1}: ${err}`)
            );
        };
        
        sendNextLabel();
    };

    // Function to print single label (like AddToState)
    const handlePrintSingleLabel = async (item) => {
        if (!printer) {
            alert("Brak drukarki");
            return;
        }

        try {
            // Check if item has promotional pricing that requires two labels
            const priceInfo = getPriceFromPriceList(item, item?.size);
            
            const shouldPrintTwoLabels = priceInfo && priceInfo.hasDiscount && !priceInfo.sizeExceptionPrice;

            if (shouldPrintTwoLabels) {
                // Print two labels: regular price and discount price
                const regularZPL = generateZPLCode(item, priceInfo.regularPrice);
                const discountZPL = generateZPLCode(item, priceInfo.discountPrice);
                
                // Send first label
                printer.send(
                    regularZPL,
                    () => {
                        // Send second label after short delay
                        setTimeout(() => {
                            printer.send(
                                discountZPL,
                                () => {}, // Success callback for second label
                                (err) => alert(`Błąd drukowania drugiej etykiety: ${err}`)
                            );
                        }, 100);
                    },
                    (err) => alert(`Błąd drukowania pierwszej etykiety: ${err}`)
                );
            } else {
                // Print single label with priority-based price
                const zplCode = generateZPLCode(item);
                printer.send(
                    zplCode,
                    () => {}, // Success callback
                    (err) => alert(`Błąd drukowania etykiety: ${err}`)
                );
            }
        } catch (error) {
            console.error('❌ Błąd podczas drukowania pojedynczej etykiety:', error);
            alert('Błąd podczas drukowania etykiety');
        }
    };

    // Function to get color code from color name using colors mapping
    const getColorCodeFromName = (itemName) => {
        if (!itemName || !colors.length) return null;
        
        // Find color by matching the color name in the item name
        const foundColor = colors.find(color => {
            const colorName = color.Kol_Opis.toLowerCase();
            const itemNameLower = itemName.toLowerCase();
            return itemNameLower.includes(colorName);
        });
        
        return foundColor ? foundColor.Kol_Kod : null;
    };

    // Convert Polish characters to Latin equivalents for printing (from AddToState)
    const convertPolishChars = (text) => {
        const polishToLatin = {
            'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
            'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
        };
        
        return text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (match) => polishToLatin[match] || match);
    };

    // Generate ZPL code for State printing (identical to AddToState)
    const generateZPLCode = (item, customPrice = null) => {
        // Adapt State item data to AddToState format
        const itemName = item?.fullName || '';
        const itemSize = item?.size || '';
        const barcode = item?.barcode || '';
        const transferTo = item?.symbol || ''; // Use symbol as transfer point
        
        // Use custom price if provided, otherwise get from price list
        let finalPrice;
        
        if (customPrice !== null) {
            finalPrice = customPrice;
        } else {
            // Get price info from price list
            const priceInfo = getPriceFromPriceList(item, itemSize);
            
            if (priceInfo) {
                // Priority 1: Size exceptions override everything
                if (priceInfo.sizeExceptionPrice) {
                    finalPrice = priceInfo.sizeExceptionPrice;
                } 
                // Priority 2: Discount price
                else if (priceInfo.hasDiscount) {
                    finalPrice = priceInfo.discountPrice;
                }
                // Priority 3: Regular price
                else {
                    finalPrice = priceInfo.regularPrice;
                }
            } else {
                // Fallback to original price
                finalPrice = item.price || '';
            }
        }
        
        // Mapowanie punktów na numery (same as AddToState)
        const pointMapping = {
            'P': '01',
            'M': '02', 
            'K': '03',
            'T': '04',
            'S': '05',
            'Kar': '06'
        };
        const mappedPoint = pointMapping[transferTo] || transferTo;
        
        // ZPL kod dla etykiety 50mm x 30mm
        
        // Usuń polskie znaki które mogą powodować problemy i przetwórz nazwę
        let processedName = (itemName || 'N/A');
        // Usuń kolor z nazwy - znajdź tylko model (bez NIEOKREŚLONY bo to rozmiar)
        processedName = processedName.replace(/\s*(czarny|czarna|czarne|biały|biała|białe|niebieski|niebieska|niebieskie|czerwony|czerwona|czerwone|zielony|zielona|zielone|żółty|żółta|żółte|szary|szara|szare|brązowy|brązowa|brązowe|różowy|różowa|różowe|fioletowy|fioletowa|fioletowe|pomarańczowy|pomarańczowa|pomarańczowe|kakao|beżowy|beżowa|beżowe|beż|kremowy|kremowa|kremowe|granatowy|granatowa|granatowe|bordowy|bordowa|bordowe|khaki|oliwkowy|oliwkowa|oliwkowe|złoty|złota|złote|srebrny|srebrna|srebrne|miętowy|miętowa|miętowe)\s*/gi, '').trim();
        
        // Get color code from colors mapping instead of barcode digits
        const colorCode = getColorCodeFromName(itemName);
        if (colorCode) {
            processedName += ' ' + colorCode;
        }
        
        const safeName = convertPolishChars(processedName);
        // Sprawdź czy rozmiar to NIEOKREŚLONY - jeśli tak, zostaw puste miejsce
        const displaySize = (itemSize === '!NIEOKREŚLONY' || itemSize === 'NIEOKREŚLONY') ? '' : (itemSize || 'N/A');
        const safeSize = convertPolishChars(displaySize);
        const safeTransfer = convertPolishChars(mappedPoint || 'N/A');
        const safePrice = (finalPrice || 'N/A').toString().replace(/[^\x00-\x7F]/g, "?");
        
        // Format z większą szerokością - nazwa bez koloru, większy rozmiar, cena z marginesem (identical to AddToState)
        const zplCode = `^XA
^MMT
^PW450
^LL0400
^LS0
^FT3,50^A0N,40,40^FD${safeName}^FS
^FT320,55^A0N,45,45^FDCena:^FS
^FT280,125^A0N,70,70^FD${safePrice} zl^FS

^FT3,120^A0N,38,38^FDRozmiar: ${safeSize}^FS
^FT3,150^A0N,25,25^FDPunkt: ${safeTransfer}^FS
^BY3,3,70^FT15,250^BCN,,N,N
^FD${barcode || 'NO-BARCODE'}^FS
^FT125,280^A0N,28,28^FB200,1,0,C,0^FD${barcode || 'NO-BARCODE'}^FS
^XZ`;
        
        return zplCode;
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
        // Simplified - just set the filter without validation
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            fullName: input,
        }));
    };    const toggleDateRangePicker = () => {
        setIsDateRangePickerVisible((prev) => !prev); // Toggle visibility
    };    useEffect(() => {
        // Count products for selected selling point
        if (selectedSellingPoint && tableData.length > 0) {
            const count = tableData.filter(row => row.symbol === selectedSellingPoint).length;
            setMagazynCount(count);
        } else {
            setMagazynCount(0);
        }
    }, [selectedSellingPoint, tableData]);

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
                    <span className="sr-only"></span>                </div>
            </div>
        );
    }

    // Get current state name for header
    const getCurrentStateName = () => {
        if (userId && users.length > 0) {
            // When userId is provided, users array contains only that one user
            const user = users[0]; // First (and only) user in filtered array
            if (user) {
                return user.role === 'magazyn' ? 'Magazyn' :
                       user.role === 'dom' ? 'Dom' :
                       user.sellingPoint || user.symbol || user.name;
            }
        } else if (selectedSellingPoint === 'all') {
            return 'Wszystkie stany';
        } else if (selectedSellingPoint && users.length > 0) {
            // Find selected user to show their name
            const selectedUser = users.find(u => u.symbol === selectedSellingPoint);
            if (selectedUser) {
                return selectedUser.role === 'magazyn' ? 'Magazyn' :
                       selectedUser.role === 'dom' ? 'Dom' :
                       selectedUser.sellingPoint || selectedUser.symbol || selectedUser.name;
            }
        }
        return 'Wszystkie stany';
    };

    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-center mb-3">
                <h2 className="text-center">Stan: {getCurrentStateName()}</h2>
            </div>
            
            {/* Export buttons */}
            <div className="d-flex justify-content-center mb-3">
                <div className="btn-group">
                    <Button color="success" className="me-2 btn btn-sm" onClick={() => handleExport('excel')}>Export to Excel</Button>
                    <Button color="primary" className="me-2 btn btn-sm" onClick={() => handleExport('json')}>Export to JSON</Button>
                    <Button color="info" className="me-2 btn btn-sm" onClick={() => handleExport('csv')}>Export to CSV</Button>
                    <Button color="danger" className="me-2 btn btn-sm" onClick={() => handleExport('pdf')}>Export to PDF</Button>
                    <Button color="warning" className="me-2 btn btn-sm" onClick={handleStateReport}>Drukuj raport punktu</Button>
                    <Button color="primary" className="btn btn-sm" onClick={handlePrint}>Drukuj zaznaczone kody</Button>
                </div>            </div>

            {/* FORMULARZ DODAWANIA PRODUKTÓW - ZAKOMENTOWANY (wszystko ma być przez magazyn)
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
                    />                </div>
            </div>
            KONIEC ZAKOMENTOWANEGO FORMULARZA */}            <div className="d-flex align-items-center justify-content-center gap-3 mb-4">
                <select
                    style={{
                        backgroundColor: 'black',
                        color: 'white',
                        border: '1px solid white',
                        borderRadius: '4px',
                        padding: '5px',
                        height: '38px',
                        width: '200px', // Set width to 200px
                        outlineColor: 'rgb(13, 110, 253)', // Change focus color
                        opacity: userId ? 0.8 : 1, // Slightly dimmed when disabled
                    }}
                    value={selectedSellingPoint}
                    onChange={(e) => handleSellingPointChange(e.target.value)} // Update selectedSellingPoint and count
                    disabled={userId ? true : false} // Disable when viewing specific user
                >
                    {!userId ? (
                        <option key="all" value="all">
                            🌟 Wszystkie stany
                        </option>
                    ) : (
                        users.map((user) => (
                            <option key={user._id} value={user.symbol}>
                                {user.name} {user.symbol}
                            </option>
                        ))
                    )}
                </select>
                <div className="d-flex align-items-center gap-2">
                    <input
                        type="text"
                        placeholder="Szukaj w tabeli" // Polish: Search in the table
                        className="form-control"
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

            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    {selectedSellingPoint && (
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                            Liczba produktów w "{selectedSellingPoint}": <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.5rem' }}>{magazynCount}</span>
                        </span>
                    )}
                </div>
            </div>

            <Table className={`table ${styles.responsiveTable}`} styles={styles.table}>
                <thead style={{ backgroundColor: 'black', color: 'white' }}>
                    <tr>
                        <th
                            style={{ ...tableCellStyle, maxWidth: '270px', width: '130px' }}
                            onClick={() => handleSort('lp')}
                        >
                            Lp {getSortIcon('lp')}
                        </th>
                        <th
                            style={{ ...tableCellStyle }}
                            onClick={() => handleSort('fullName')}
                        >
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
                                        ref={calendarRef} // Attach the ref to the calendar container
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
                                            onChange={(ranges) => setDateRange([ranges.selection])} // Update date range on change
                                            locale={pl} // Apply Polish locale
                                            rangeColors={['#0d6efd']} // Set custom range color
                                            staticRanges={customStaticRanges} // Use custom static ranges
                                            inputRanges={customInputRanges} // Use custom input ranges
                                        />
                                    </div>
                                )}
                            </div>
                        </th>
                        <th
                            style={{ ...tableCellStyle }}
                            onClick={() => handleSort('size')}
                        >
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
                                onChange={e => setColumnFilters({ ...columnFilters, size: e.target.value })}
                            />
                        </th>
                        <th
                            style={{ ...tableCellStyle }}
                            onClick={() => handleSort('symbol')}
                        >
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
                                onChange={e => setColumnFilters({ ...columnFilters, symbol: e.target.value })}
                            />
                        </th>
                        {selectedSellingPoint === 'all' && (
                            <th
                                style={{ ...tableCellStyle }}
                                onClick={() => handleSort('sellingPointName')}
                            >
                                Punkt sprzedaży {getSortIcon('sellingPointName')}
                            </th>
                        )}
                        <th style={tableCellStyle} onClick={() => handleSort('price')}>
                            Cena (PLN) {getSortIcon('price')}
                        </th>
                        <th style={{ ...tableCellStyle, textAlign: 'center' }}>
                            <div className="d-flex align-items-center justify-content-center gap-2">
                                Kody kreskowe
                                <input
                                    type="checkbox"
                                    style={{ width: '20px', height: '20px' }} // Larger checkbox
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(filteredTableData.map((row) => row.id)); // Select only filtered rows
                                        } else {
                                            setSelectedIds([]); // Deselect all rows
                                        }
                                    }}
                                    checked={
                                        filteredTableData.length > 0 &&
                                        filteredTableData.every((row) => selectedIds.includes(row.id)) // Check if all filtered rows are selected
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
                            {selectedSellingPoint === 'all' && (
                                <td style={tableCellStyle} data-label="Punkt sprzedaży">
                                    {row.sellingPointName || row.symbol || 'Brak danych'}
                                </td>
                            )}
                            <td style={tableCellStyle} data-label="Cena (PLN)">
                                {row.price}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'center' }} data-label="Barcode"> 
                                <div className="d-flex align-items-center justify-content-center gap-2">
                                    <Barcode value={row.barcode} width={0.8} height={30} fontSize={10} />
                                    <input
                                        type="checkbox"
                                        style={{ width: '20px', height: '20px' }} // Larger checkbox
                                        checked={selectedIds.includes(row.id)}
                                        onChange={() => toggleRowSelection(row.id)}
                                    />
                                </div>
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'center' }} data-label="Akcje"> 
                                <div className="d-flex justify-content-center gap-1">
                                    <Button color="warning" size="sm" onClick={() => handleEditClick(row)}>Edytuj</Button>
                                    <Button 
                                        color="info" 
                                        size="sm" 
                                        onClick={() => handlePrintSingleLabel(row)}
                                        disabled={!printer}
                                        title={!printer ? "Brak drukarki" : "Drukuj etykietę"}
                                    >
                                        Drukuj
                                    </Button>
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
                    <FormGroup className={styles.formGroup}>
                        <Label for="symbol" className={styles.emailLabel}>Symbol:</Label>
                        <Select
                            value={users.map((user) => ({ value: user.symbol, label: user.symbol }))
                                .find((option) => option.value === editData.symbol) || null} // Match the structure of options
                            onChange={(selectedOption) => setEditData({ ...editData, symbol: selectedOption ? selectedOption.value : '' })}
                            options={users.map((user) => ({ value: user.symbol, label: user.symbol }))}
                            placeholder="Wybierz symbol"
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

            {/* State Report Modal */}
            <Modal isOpen={isStateReportModalOpen} toggle={toggleStateReportModal} size="lg">
                <ModalHeader toggle={toggleStateReportModal}>
                    Raport Punktu Sprzedaży
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label>Typ raportu:</Label>
                        <div>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="reportType"
                                    id="movementsReport"
                                    value="movements"
                                    checked={reportType === 'movements'}
                                    onChange={(e) => setReportType(e.target.value)}
                                />
                                <label className="form-check-label" htmlFor="movementsReport">
                                    Przepływy punktu (okres)
                                </label>
                            </div>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="reportType"
                                    id="inventoryReport"
                                    value="inventory"
                                    checked={reportType === 'inventory'}
                                    onChange={(e) => setReportType(e.target.value)}
                                />
                                <label className="form-check-label" htmlFor="inventoryReport">
                                    Stan punktu (na datę)
                                </label>
                            </div>
                        </div>
                    </FormGroup>

                    {reportType === 'movements' && (
                        <FormGroup>
                            <Label for="reportDateRange">Zakres dat:</Label>
                            <DateRangePicker
                                ranges={reportDateRange}
                                onChange={(ranges) => setReportDateRange([ranges.selection])}
                                locale={pl}
                                rangeColors={['#3d91ff']}
                                staticRanges={customStaticRanges}
                                inputRanges={customInputRanges}
                            />
                        </FormGroup>
                    )}

                    {reportType === 'inventory' && (
                        <FormGroup>
                            <Label for="inventoryDate">Data inwentarza:</Label>
                            <DatePicker
                                selected={inventoryDate}
                                onChange={(date) => setInventoryDate(date)}
                                dateFormat="dd/MM/yyyy"
                                locale="pl"
                                className="form-control"
                                placeholderText="Wybierz datę"
                            />
                        </FormGroup>
                    )}

                    <FormGroup>
                        <Label>Filtry produktów:</Label>
                        <Select
                            isMulti
                            value={selectedFiltersForReport}
                            onChange={(newFilters) => {
                                setSelectedFiltersForReport(newFilters);
                                
                                // Reset specific filter values when filter types change
                                const newFilterValues = (newFilters || []).map(f => f.value);
                                
                                // If single filter is selected, clear others
                                if (newFilterValues.length === 1) {
                                    const singleFilter = newFilterValues[0];
                                    
                                    // Clear all specific selections
                                    if (singleFilter !== 'specific') setSelectedProductForReport(null);
                                    if (singleFilter !== 'category') setSelectedCategoryForReport(null);
                                    if (singleFilter !== 'manufacturer') setSelectedManufacturerForReport(null);
                                    if (singleFilter !== 'size') setSelectedSizeForReport(null);
                                }
                            }}
                            options={[
                                { value: 'all', label: 'Wszystkie produkty' },
                                { value: 'specific', label: 'Konkretny produkt' },
                                { value: 'category', label: 'Kategoria' },
                                { value: 'manufacturer', label: 'Grupa' },
                                { value: 'size', label: 'Rozmiar' }
                            ]}
                            placeholder="Wybierz opcje filtrowania..."
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            maxMenuHeight={200}
                            styles={{
                                control: (provided) => ({
                                    ...provided,
                                    backgroundColor: 'black',
                                    borderColor: 'white',
                                    color: 'white'
                                }),
                                menu: (provided) => ({
                                    ...provided,
                                    backgroundColor: 'black',
                                    border: '1px solid white',
                                    zIndex: 9999
                                }),
                                menuPortal: (provided) => ({
                                    ...provided,
                                    zIndex: 9999
                                }),
                                option: (provided, state) => ({
                                    ...provided,
                                    backgroundColor: state.isSelected ? '#333' : 'black',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#555'
                                    }
                                }),
                                multiValue: (provided) => ({
                                    ...provided,
                                    backgroundColor: '#333',
                                    color: 'white'
                                }),
                                multiValueLabel: (provided) => ({
                                    ...provided,
                                    color: 'white'
                                }),
                                multiValueRemove: (provided) => ({
                                    ...provided,
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#555',
                                        color: 'white'
                                    }
                                }),
                                placeholder: (provided) => ({
                                    ...provided,
                                    color: '#ccc'
                                }),
                                input: (provided) => ({
                                    ...provided,
                                    color: 'white'
                                })
                            }}
                        />
                    </FormGroup>

                    {selectedFiltersForReport.some(f => f.value === 'specific') && (
                        <FormGroup>
                            <Label>Konkretny produkt:</Label>
                            <Select
                                value={selectedProductForReport}
                                onChange={setSelectedProductForReport}
                                options={goods.map(good => ({ value: good._id, label: good.fullName }))}
                                placeholder="Wybierz produkt..."
                                isClearable
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        borderColor: 'white',
                                        color: 'white'
                                    }),
                                    menu: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        border: '1px solid white',
                                        zIndex: 9999
                                    }),
                                    menuPortal: (provided) => ({
                                        ...provided,
                                        zIndex: 9999
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isSelected ? '#333' : 'black',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555'
                                        }
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    }),
                                    placeholder: (provided) => ({
                                        ...provided,
                                        color: '#ccc'
                                    }),
                                    input: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    })
                                }}
                            />
                        </FormGroup>
                    )}

                    {selectedFiltersForReport.some(f => f.value === 'category') && (
                        <FormGroup>
                            <Label>Kategoria:</Label>
                            <Select
                                value={selectedCategoryForReport}
                                onChange={setSelectedCategoryForReport}
                                options={[
                                    { value: 'Kurtki kożuchy futra', label: 'Kurtki kożuchy futra' },
                                    { value: 'Torebki', label: 'Torebki' },
                                    { value: 'Portfele', label: 'Portfele' },
                                    { value: 'Pozostały asortyment', label: 'Pozostały asortyment' },
                                    { value: 'Paski', label: 'Paski' },
                                    { value: 'Rękawiczki', label: 'Rękawiczki' }
                                ]}
                                placeholder="Wybierz kategorię..."
                                isClearable
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        borderColor: 'white',
                                        color: 'white'
                                    }),
                                    menu: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        border: '1px solid white',
                                        zIndex: 9999
                                    }),
                                    menuPortal: (provided) => ({
                                        ...provided,
                                        zIndex: 9999
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isSelected ? '#333' : 'black',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555'
                                        }
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    }),
                                    placeholder: (provided) => ({
                                        ...provided,
                                        color: '#ccc'
                                    }),
                                    input: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    })
                                }}
                            />
                        </FormGroup>
                    )}

                    {selectedFiltersForReport.some(f => f.value === 'manufacturer') && (
                        <FormGroup>
                            <Label>Grupa:</Label>
                            <Select
                                value={selectedManufacturerForReport}
                                onChange={setSelectedManufacturerForReport}
                                options={Array.isArray(manufacturers) ? manufacturers.map(m => ({ value: m._id, label: m.Prod_Opis })) : []}
                                placeholder="Wybierz grupę..."
                                isClearable
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        borderColor: 'white',
                                        color: 'white'
                                    }),
                                    menu: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        border: '1px solid white',
                                        zIndex: 9999
                                    }),
                                    menuPortal: (provided) => ({
                                        ...provided,
                                        zIndex: 9999
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isSelected ? '#333' : 'black',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555'
                                        }
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    }),
                                    placeholder: (provided) => ({
                                        ...provided,
                                        color: '#ccc'
                                    }),
                                    input: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    })
                                }}
                            />
                        </FormGroup>
                    )}

                    {selectedFiltersForReport.some(f => f.value === 'size') && (
                        <FormGroup>
                            <Label>Rozmiar:</Label>
                            <Select
                                value={selectedSizeForReport}
                                onChange={setSelectedSizeForReport}
                                options={Array.isArray(availableSizes) ? availableSizes.map(s => ({ value: s._id, label: s.Roz_Opis })) : []}
                                placeholder="Wybierz rozmiar..."
                                isClearable
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                maxMenuHeight={200}
                                styles={{
                                    control: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        borderColor: 'white',
                                        color: 'white'
                                    }),
                                    menu: (provided) => ({
                                        ...provided,
                                        backgroundColor: 'black',
                                        border: '1px solid white',
                                        zIndex: 9999
                                    }),
                                    menuPortal: (provided) => ({
                                        ...provided,
                                        zIndex: 9999
                                    }),
                                    option: (provided, state) => ({
                                        ...provided,
                                        backgroundColor: state.isSelected ? '#333' : 'black',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#555'
                                        }
                                    }),
                                    singleValue: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    }),
                                    placeholder: (provided) => ({
                                        ...provided,
                                        color: '#ccc'
                                    }),
                                    input: (provided) => ({
                                        ...provided,
                                        color: 'white'
                                    })
                                }}
                            />
                        </FormGroup>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={generateStateReport} disabled={reportLoading}>
                        {reportLoading ? <Spinner size="sm" /> : 'Drukuj raport'}
                    </Button>
                    <Button color="secondary" onClick={toggleStateReportModal}>
                        Anuluj
                    </Button>
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
                            </li>                        ))}
                    </ul>                </nav>
            </div>
        </div>
    );
};

export default State;
