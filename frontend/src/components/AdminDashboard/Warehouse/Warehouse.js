import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import Select from 'react-select';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range'; // Import updated default ranges
import 'react-datepicker/dist/react-datepicker.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-date-range/dist/styles.css'; // Import DateRangePicker styles
import 'react-date-range/dist/theme/default.css'; // Import default theme
import styles from './Warehouse.module.css'; // Import the CSS module
import Barcode from 'react-barcode'; // Import the Barcode component
import { saveAs } from 'file-saver'; // For exporting files
import { Button, Table, Modal, ModalHeader, ModalBody, FormGroup, Label, ModalFooter, Spinner, Input } from 'reactstrap'; // Import reactstrap components
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import jsPDF from 'jspdf'; // Import jsPDF for PDF export
import autoTable from 'jspdf-autotable'; // Import autoTable function for jsPDF
import pl from 'date-fns/locale/pl'; // Import Polish locale


registerLocale('pl', pl); // Register Polish locale

const Warehouse = () => {
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

    const [selectedIds, setSelectedIds] = useState([]); // State for selected row IDs
    const [columnFilters, setColumnFilters] = useState({}); // State for column filters
    const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]); // State for date range
    const [isDateRangePickerVisible, setIsDateRangePickerVisible] = useState(false); // State to toggle date range picker visibility
    const calendarRef = useRef(null); // Ref for the calendar container
    const [loading, setLoading] = useState(false); // Loading state
    const [magazynCount, setMagazynCount] = useState(0); // State to store the count of "MAGAZYN"
    
    // Warehouse report states
    const [isWarehouseReportModalOpen, setIsWarehouseReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState('movements'); // 'movements' or 'inventory'
    const [reportDateRange, setReportDateRange] = useState([{ startDate: new Date(), endDate: new Date(), key: 'selection' }]);
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
        // Fetch manufacturers from the API
        const fetchManufacturers = async () => {
            try {
                const response = await axios.get('/api/excel/manufacturers');
                if (response.data && Array.isArray(response.data.manufacturers)) {
                    setManufacturers(response.data.manufacturers);
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setManufacturers([]);
                }
            } catch (error) {
                console.error('Error fetching manufacturers:', error);
                setManufacturers([]);
            }
        };

        fetchManufacturers();
        
        // Fetch available sizes from the API
        const fetchSizes = async () => {
            try {
                const response = await axios.get('/api/excel/size/get-all-sizes');
                if (response.data && Array.isArray(response.data.sizes)) {
                    setAvailableSizes(response.data.sizes.map(size => ({
                        value: size._id,
                        label: `${size.Roz_Kod} - ${size.Roz_Opis}`
                    })));
                } else {
                    console.error('Unexpected sizes API response format:', response.data);
                    setAvailableSizes([]);
                }
            } catch (error) {
                console.error('Error fetching sizes:', error);
                setAvailableSizes([]);
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
                    // Filter only warehouse user (magazyn role)
                    const warehouseUsers = response.data.users.filter(user => 
                        user.role?.toLowerCase() === 'magazyn'
                    );
                    setUsers(warehouseUsers);

                    if (warehouseUsers.length > 0) {
                        setSelectedSellingPoint(warehouseUsers[0].symbol); // Use symbol instead of sellingPoint
                    } else {
                        console.warn('Nie znaleziono użytkownika z rolą magazyn');
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
    }, []);    const fetchTableData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/state');
            // Filter to only show products with "MAGAZYN" symbol
            const filteredData = response.data.filter(row => row.symbol === 'MAGAZYN');
            const formattedData = filteredData.map((row) => {
                const combinedPrice = row.discount_price && Number(row.discount_price) !== 0
                    ? `${row.price};${row.discount_price}` // Combine price and discount_price with semicolon
                    : row.price; // Use only price if discount_price is not valid
                return {
                    id: row.id,
                    fullName: row.fullName?.fullName || row.fullName || "Brak danych",
                    plec: row.Plec || "Brak danych",
                    date: row.date,
                    size: row.size, // Backend już prawidłowo obsługuje torebki i portfele
                    barcode: row.barcode || "Brak danych",
                    symbol: row.symbol || "Brak danych",
                    price: combinedPrice, // Set combined price
                };
            });
            setTableData(formattedData.reverse());
        } catch (error) {
            console.error('Error fetching table data:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendDataToBackendForBags = async (productName) => {
        // Użyj przekazanej nazwy produktu lub input1Value jako fallback
        const finalProductName = productName || input1Value.trim();
        
        if (!finalProductName || !selectedDate) {
            alert('Nazwa produktu i data muszą być uzupełnione');
            return;
        }

        // Użyj domyślnego punktu sprzedaży "MAGAZYN" jeśli nie ma wybranego
        const sellingPoint = selectedSellingPoint || 'MAGAZYN';

        setLoading(true);
        try {
            // Fetch the selected bag to get price
            const selectedGood = goods.find((good) => good.fullName === finalProductName);
            
            if (!selectedGood) {
                alert('Wybrany produkt nie istnieje w bazie danych.');
                setLoading(false);
                return;
            }

            // For bags, use default price structure
            let price;
            if (
                selectedGood.discount_price !== undefined &&
                selectedGood.discount_price !== null &&
                selectedGood.discount_price !== "" &&
                Number(selectedGood.discount_price) !== 0
            ) {
                price = `${selectedGood.price};${selectedGood.discount_price}`;
            } else {
                price = selectedGood.price;
            }

            const dataToSend = {
                fullName: finalProductName,
                size: '-', // Używamy "-" dla torebek
                plec: selectedGood.gender || 'Unisex', // Używamy płci z produktu
                date: selectedDate.toISOString(),
                sellingPoint: sellingPoint,
                price,
            };

            const response = await axios.post('/api/state', dataToSend);

            const newRow = {
                id: response.data._id,
                fullName: finalProductName,
                plec: selectedGood.gender || 'Unisex',
                date: selectedDate.toISOString().split('T')[0],
                size: '-',
                barcode: response.data.barcode,
                symbol: sellingPoint,
                price,
            };

            setTableData((prevData) => [newRow, ...prevData]);

            // Reset inputs
            setInput1Value('');
            
            // Dla React Select musimy użyć setTimeout żeby upewnić się, że stan się zaktualizował
            setTimeout(() => {
                if (inputRefs.current[0]) {
                    // Próbujemy różne metody focusowania dla React Select
                    if (inputRefs.current[0].focus) {
                        inputRefs.current[0].focus();
                    } else if (inputRefs.current[0].select && inputRefs.current[0].select.focus) {
                        inputRefs.current[0].select.focus();
                    } else if (inputRefs.current[0].inputRef && inputRefs.current[0].inputRef.focus) {
                        inputRefs.current[0].inputRef.focus();
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error sending bag data to backend:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(`Błąd podczas dodawania torebki do magazynu: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const sendDataToBackendForWallets = async (productName) => {
        // Użyj przekazanej nazwy produktu lub input1Value jako fallback
        const finalProductName = productName || input1Value.trim();
        
        if (!finalProductName || !selectedDate) {
            alert('Nazwa produktu i data muszą być uzupełnione');
            return;
        }

        // Użyj domyślnego punktu sprzedaży "MAGAZYN" jeśli nie ma wybranego
        const sellingPoint = selectedSellingPoint || 'MAGAZYN';

        setLoading(true);
        try {
            // Fetch the selected wallet to get price
            const selectedGood = goods.find((good) => good.fullName === finalProductName);
            
            if (!selectedGood) {
                alert('Wybrany produkt nie istnieje w bazie danych.');
                setLoading(false);
                return;
            }

            // For wallets, use default price structure
            let price;
            if (
                selectedGood.discount_price !== undefined &&
                selectedGood.discount_price !== null &&
                selectedGood.discount_price !== "" &&
                Number(selectedGood.discount_price) !== 0
            ) {
                price = `${selectedGood.price};${selectedGood.discount_price}`;
            } else {
                price = selectedGood.price;
            }

            const dataToSend = {
                fullName: finalProductName,
                size: '-', // Używamy "-" dla portfeli
                plec: selectedGood.gender || 'Unisex', // Używamy płci z produktu
                date: selectedDate.toISOString(),
                sellingPoint: sellingPoint,
                price,
            };

            const response = await axios.post('/api/state', dataToSend);

            const newRow = {
                id: response.data._id,
                fullName: finalProductName,
                plec: selectedGood.gender || 'Unisex',
                date: selectedDate.toISOString().split('T')[0],
                size: '-',
                barcode: response.data.barcode,
                symbol: sellingPoint,
                price,
            };

            setTableData((prevData) => [newRow, ...prevData]);

            // Reset inputs
            setInput1Value('');
            
            // Dla React Select musimy użyć setTimeout żeby upewnić się, że stan się zaktualizował
            setTimeout(() => {
                if (inputRefs.current[0]) {
                    // Próbujemy różne metody focusowania dla React Select
                    if (inputRefs.current[0].focus) {
                        inputRefs.current[0].focus();
                    } else if (inputRefs.current[0].select && inputRefs.current[0].select.focus) {
                        inputRefs.current[0].select.focus();
                    } else if (inputRefs.current[0].inputRef && inputRefs.current[0].inputRef.focus) {
                        inputRefs.current[0].inputRef.focus();
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error sending wallet data to backend:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(`Błąd podczas dodawania portfela do magazynu: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const sendDataToBackendForRemainingProducts = async (productName) => {
        // Użyj przekazanej nazwy produktu lub input1Value jako fallback
        const finalProductName = productName || input1Value.trim();
        
        if (!finalProductName || !selectedDate) {
            alert('Nazwa produktu i data muszą być uzupełnione');
            return;
        }

        // Użyj domyślnego punktu sprzedaży "MAGAZYN" jeśli nie ma wybranego
        const sellingPoint = selectedSellingPoint || 'MAGAZYN';

        setLoading(true);
        try {
            // Fetch the selected remaining product to get price
            const selectedGood = goods.find((good) => good.fullName === finalProductName);
            
            if (!selectedGood) {
                alert('Wybrany produkt nie istnieje w bazie danych.');
                setLoading(false);
                return;
            }

            // For remaining products, use default price structure
            let price;
            if (
                selectedGood.discount_price !== undefined &&
                selectedGood.discount_price !== null &&
                selectedGood.discount_price !== "" &&
                Number(selectedGood.discount_price) !== 0
            ) {
                price = `${selectedGood.price};${selectedGood.discount_price}`;
            } else {
                price = selectedGood.price;
            }

            const dataToSend = {
                fullName: finalProductName,
                size: '-', // Używamy "-" dla pozostałego asortymentu (brak rozmiarów)
                plec: selectedGood.gender || 'Unisex', // Używamy płci z produktu
                date: selectedDate.toISOString(),
                sellingPoint: sellingPoint,
                price,
            };

            const response = await axios.post('/api/state', dataToSend);

            const newRow = {
                id: response.data._id,
                fullName: finalProductName,
                plec: selectedGood.gender || 'Unisex',
                date: selectedDate.toISOString().split('T')[0],
                size: '-',
                barcode: response.data.barcode,
                symbol: sellingPoint,
                price,
            };

            setTableData((prevData) => [newRow, ...prevData]);

            // Reset inputs
            setInput1Value('');
            
            // Dla React Select musimy użyć setTimeout żeby upewnić się, że stan się zaktualizował
            setTimeout(() => {
                if (inputRefs.current[0]) {
                    // Próbujemy różne metody focusowania dla React Select
                    if (inputRefs.current[0].focus) {
                        inputRefs.current[0].focus();
                    } else if (inputRefs.current[0].select && inputRefs.current[0].select.focus) {
                        inputRefs.current[0].select.focus();
                    } else if (inputRefs.current[0].inputRef && inputRefs.current[0].inputRef.focus) {
                        inputRefs.current[0].inputRef.focus();
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error sending remaining product data to backend:', error);
            console.error('Error details:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(`Błąd podczas dodawania pozostałego asortymentu do magazynu: ${error.response?.data?.message || error.message}`);
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
                price = `${selectedGood.price};${selectedGood.discount_price}`;
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
    const toggleWarehouseReportModal = () => setIsWarehouseReportModalOpen(!isWarehouseReportModalOpen);

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

        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = modal.offsetLeft;
            initialY = modal.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
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
                // Sprawdź czy wybrany produkt to torebka
                const selectedProduct = selectedOption.value;
                
                if (selectedProduct.category === 'Torebki') {
                    // Automatycznie dodaj torebkę bez przechodzenia do selecta z rozmiarami
                    sendDataToBackendForBags(selectedOption.label);
                } else if (selectedProduct.category === 'Portfele') {
                    // Automatycznie dodaj portfel bez przechodzenia do selecta z rozmiarami
                    sendDataToBackendForWallets(selectedOption.label);
                } else if (selectedProduct.category === 'Pozostały asortyment') {
                    // Automatycznie dodaj pozostały asortyment bez przechodzenia do selecta z rozmiarami
                    sendDataToBackendForRemainingProducts(selectedOption.label);
                } else {
                    // Dla innych produktów przejdź do selecta z rozmiarami
                    inputRefs.current[1].focus(); // Automatically jump to second input
                }
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

    // Funkcja do generowania ZPL kodu dla drukarki Zebra (skopiowane z AddToState)
    const generateZPLCode = (item) => {
        const itemName = item.fullName || item.jacketName || 'N/A';
        const itemSize = item.size || 'N/A';
        const barcode = item.barcode || 'NO-BARCODE';
        const price = item.price || 'N/A';
        const symbol = item.symbol || 'N/A';
        
        // Mapowanie punktów na numery (dodamy symbol jako punkt)
        const pointMapping = {
            'P': '01',
            'M': '02', 
            'K': '03',
            'T': '04',
            'S': '05',
            'Kar': '06'
        };
        const mappedPoint = pointMapping[symbol] || symbol;
        
        // Usuń polskie znaki które mogą powodować problemy i przetwórz nazwę
        let processedName = (itemName || 'N/A');
        // Usuń kolor z nazwy - znajdź tylko model (rozszerzona lista kolorów)
        processedName = processedName.replace(/\s*(czarny|czarna|czarne|biały|biała|białe|niebieski|niebieska|niebieskie|czerwony|czerwona|czerwone|zielony|zielona|zielone|żółty|żółta|żółte|szary|szara|szare|brązowy|brązowa|brązowe|różowy|różowa|różowe|fioletowy|fioletowa|fioletowe|pomarańczowy|pomarańczowa|pomarańczowe|kakao|beżowy|beżowa|beżowe|kremowy|kremowa|kremowe|granatowy|granatowa|granatowe|bordowy|bordowa|bordowe|khaki|oliwkowy|oliwkowa|oliwkowe|złoty|złota|złote|srebrny|srebrna|srebrne|miętowy|miętowa|miętowe)\s*/gi, '').trim();
        
        // Dodaj pozycje 4 i 5 z kodu kreskowego do nazwy
        const barcodeDigits = (barcode && barcode.length >= 5) ? barcode.substring(3, 5) : '';
        if (barcodeDigits) {
            processedName += ' ' + barcodeDigits;
        }
        
        const safeName = processedName.replace(/[^\x00-\x7F]/g, "?");
        const safeSize = (itemSize || 'N/A').replace(/[^\x00-\x7F]/g, "?");
        const safeTransfer = (mappedPoint || 'N/A').replace(/[^\x00-\x7F]/g, "?");
        const safePrice = (price || 'N/A').toString().replace(/[^\x00-\x7F]/g, "?");
        
        // Format z większą szerokością - nazwa bez koloru, większy rozmiar, cena z marginesem
        const zplCode = `^XA
^MMT
^PW450
^LL0400
^LS0
^FT3,50^A0N,40,40^FD${safeName}^FS
^FT320,55^A0N,40,40^FDCena:^FS
^FT320,105^A0N,55,55^FD${safePrice} zl^FS

^FT3,120^A0N,38,38^FDRozmiar: ${safeSize}^FS
^FT3,150^A0N,25,25^FDPunkt: ${safeTransfer}^FS
^BY3,3,70^FT15,250^BCN,,N,N
^FD${barcode || 'NO-BARCODE'}^FS
^FT125,280^A0N,28,28^FB200,1,0,C,0^FD${barcode || 'NO-BARCODE'}^FS
^XZ`;
        
        return zplCode;
    };

    // Funkcja do wysyłania ZPL do drukarki Zebra przez Browser Print HTTP API (skopiowane z AddToState)
    const sendToZebraPrinter = async (zplCode) => {
        try {
            // Pobierz dostępne drukarki
            const availableResponse = await fetch('http://localhost:9100/available');
            if (!availableResponse.ok) {
                throw new Error('Browser Print nie jest dostępny');
            }
            
            const availableData = await availableResponse.json();
            if (!availableData.printer || availableData.printer.length === 0) {
                throw new Error('Brak dostępnych drukarek');
            }
            
            const printer = availableData.printer[0];
            
            // Wysłij ZPL przez Browser Print z kompletną strukturą device
            const deviceData = {
                device: {
                    deviceType: printer.deviceType,
                    uid: printer.uid,
                    name: printer.name,
                    connection: printer.connection,
                    provider: printer.provider,
                    version: printer.version,
                    manufacturer: printer.manufacturer
                },
                data: zplCode
            };
            
            const printResponse = await fetch('http://localhost:9100/write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deviceData)
            });
            
            if (printResponse.ok) {
                const result = await printResponse.text();
                return true;
            } else {
                const errorText = await printResponse.text();
                console.error('❌ Browser Print błąd:', printResponse.status, errorText);
                throw new Error(`Browser Print error: ${printResponse.status} ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Błąd drukowania:', error.message);
            throw error;
        }
    };

    const handlePrint = async () => {
        if (selectedIds.length === 0) {
            alert("Proszę wybrać wiersze do wydrukowania.");
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        
        // Drukuj każdą etykietę z zaznaczonych wierszy
        for (let i = 0; i < selectedIds.length; i++) {
            const id = selectedIds[i];
            const row = tableData.find((item) => item.id === id);
            
            if (!row) continue;
            
            try {
                // Obsługa podwójnych cen (oddzielonych średnikiem) - stwórz dwie osobne etykiety
                const rawPrice = row?.price || null;
                if (rawPrice && rawPrice.toString().includes(';')) {
                    const prices = rawPrice.toString().split(';');
                    if (prices.length === 2) {
                        // Pierwsza etykieta z pierwszą ceną
                        const labelData1 = {
                            fullName: row?.fullName || "N/A",
                            size: row?.size || "N/A", 
                            barcode: row?.barcode || "NO-BARCODE",
                            price: prices[0].trim(),
                            symbol: row?.symbol || "N/A"
                        };
                        
                        const zplCode1 = generateZPLCode(labelData1);
                        await sendToZebraPrinter(zplCode1);
                        successCount++;
                        
                        // Druga etykieta z drugą ceną
                        const labelData2 = {
                            fullName: row?.fullName || "N/A",
                            size: row?.size || "N/A",
                            barcode: row?.barcode || "NO-BARCODE", 
                            price: prices[1].trim(),
                            symbol: row?.symbol || "N/A"
                        };
                        
                        const zplCode2 = generateZPLCode(labelData2);
                        await sendToZebraPrinter(zplCode2);
                        successCount++;
                    }
                } else {
                    // Pojedyncza etykieta
                    const labelData = {
                        fullName: row?.fullName || "N/A",
                        size: row?.size || "N/A",
                        barcode: row?.barcode || "NO-BARCODE",
                        price: rawPrice || "N/A",
                        symbol: row?.symbol || "N/A"
                    };
                    
                    const zplCode = generateZPLCode(labelData);
                    await sendToZebraPrinter(zplCode);
                    successCount++;
                }
            } catch (error) {
                console.error(`Błąd drukowania etykiety ${i + 1}:`, error);
                errorCount++;
            }
        }
        
        // Podsumowanie
        setSelectedIds([]); // Wyczyść zaznaczenie
        
        if (successCount === 0 && errorCount > 0) {
            alert(`Nie udało się wydrukować żadnej etykiety.\nSprawdź czy drukarka Zebra jest podłączona i włączona.`);
        } else if (errorCount > 0) {
            alert(`Wydrukowano ${successCount} etykiet.\n${errorCount} etykiet nie zostało wydrukowanych.`);
        } else {
            alert(`Pomyślnie wydrukowano ${successCount} etykiet!`);
        }
    };

    // Handle warehouse report button click
    const handleWarehouseReport = () => {
        setIsWarehouseReportModalOpen(true);
    };

    // Generate warehouse report
    const generateWarehouseReport = async () => {
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
            console.error('Error generating report:', error);
            alert('Błąd podczas generowania raportu');
        } finally {
            setReportLoading(false);
        }
    };

    // Generate movements report (existing logic)
    const generateMovementsReport = async (startDate, endDate) => {
        try {

            // Determine filter type based on selected options
            let filterType = 'all';
            const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
            
            if (selectedFiltersValues.includes('specific')) {
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

            const response = await axios.get('/api/warehouse/report', { params });
            setReportData(response.data);
            
            // Generate PDF report
            generateReportPDF(response.data, startDate, endDate);
            
        } catch (error) {
            console.error('Error generating warehouse report:', error);
            alert('Błąd podczas generowania raportu: ' + (error.response?.data?.message || error.message));
        }
    };

    // Generate inventory report (new function)
    const generateInventoryReport = async (date) => {
        try {
            // Determine filter type based on selected options
            let filterType = 'all';
            const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
            
            if (selectedFiltersValues.includes('specific')) {
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

            const response = await axios.get('/api/warehouse/inventory', { params });
            setReportData(response.data);
            
            // Generate PDF report
            generateInventoryReportPDF(response.data, date);
            
        } catch (error) {
            console.error('Error generating inventory report:', error);
            alert('Błąd podczas generowania raportu inwentaryzacyjnego: ' + (error.response?.data?.message || error.message));
        }
    };

    // Generate PDF report
    const generateReportPDF = (data, startDate, endDate) => {
        const doc = new jsPDF({
            orientation: 'portrait', // Zmienione na pionową orientację
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
        const titleText = convertPolishChars('Raport Magazynowy');
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
                filters.push(`Producent: ${selectedManufacturerForReport.label}`);
            }
            
            if (filters.length > 0) {
                productText = convertPolishChars(filters.join(', '));
            } else {
                productText = convertPolishChars('Wszystkie produkty');
            }
        }
        const productWidth = doc.getTextWidth(productText);
        doc.text(productText, (pageWidth - productWidth) / 2, 45);
        
        // Stan początkowy przed tabelą - centered
        let yPosition = 55;
        if (data.initialState) {
            doc.setFont('helvetica', 'bold');
            const initialText = convertPolishChars(`Stan poczatkowy (${startDate.toLocaleDateString('pl-PL')}): ${data.initialState.quantity || 0}`);
            const initialWidth = doc.getTextWidth(initialText);
            doc.text(initialText, (pageWidth - initialWidth) / 2, yPosition);
            doc.setFont('helvetica', 'normal');
            yPosition += 15;
        }
        
        // Table headers - 6 kolumn z krótszymi nazwami
        const tableColumn = ['Lp.', 'Data', 'Nazwa produktu', 'Rodzaj', 'Odj.', 'Dod.'];
        const tableRows = [];
        
        // Add operations
        data.operations?.forEach((operation, index) => {
            const row = [
                (index + 1).toString(),
                new Date(operation.date).toLocaleDateString('pl-PL'),
                convertPolishChars(operation.product || 'Nieznany produkt'),
                convertPolishChars(operation.type),
                // Dla odjęć pokazuj ujemną wartość, dla zer nie pokazuj nic
                operation.subtract && operation.subtract > 0 ? -operation.subtract : '',
                // Dla dodań pokazuj dodatnią wartość, dla zer nie pokazuj nic
                operation.add && operation.add > 0 ? operation.add : ''
            ];
            tableRows.push(row);
        });
        
        // Add summary row - Suma w scalonej komórce (4 kolumny), wartości w ostatnich dwóch
        if (data.summary) {
            // Dodajemy wiersz z scalonymi komórkami
            tableRows.push([
                {
                    content: 'Suma',
                    colSpan: 4, // Scala pierwsze 4 kolumny (Lp, Data, Nazwa produktu, Rodzaj)
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
        
        // Calculate table width for centering (adjusted for portrait)
        const tableWidth = 12 + 20 + 55 + 40 + 18 + 18; // suma szerokości kolumn = 163mm (dla portrait)
        const tableStartX = (pageWidth - tableWidth) / 2;
        
        // Add table to PDF - centered
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
                0: { halign: 'center', cellWidth: 12 }, // Lp - zmniejszone dla portrait
                1: { halign: 'center', cellWidth: 20 }, // Data - zmniejszone
                2: { halign: 'center', cellWidth: 55 }, // Nazwa produktu - zmniejszone
                3: { halign: 'center', cellWidth: 40 }, // Rodzaj - zmniejszone
                4: { halign: 'center', cellWidth: 18 }, // Odj. - zmniejszone
                5: { halign: 'center', cellWidth: 18 }  // Dod. - zmniejszone
            },
            didParseCell: function (data) {
                // Dodatkowe style dla wiersza sumy są już obsłużone przez colSpan i styles w definicji komórek
                // Ta funkcja może zostać pusta lub obsługiwać inne specjalne przypadki
            }
        });
        
        // Add final calculation and final state after table - centered
        if (data.summary) {
            let finalY = doc.lastAutoTable.finalY + 20;
            
            // Stan końcowy z formułą
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            
            const initialState = data.initialState?.quantity || 0;
            const totalAdded = data.summary.totalAdded || 0;
            const totalSubtracted = data.summary.totalSubtracted || 0;
            const finalState = data.summary.finalState || 0;
            
            // Formuła: Stan końcowy (data): stan początkowy + dodano - odjęto = wynik
            const formulaText = convertPolishChars(`Stan koncowy (${endDate.toLocaleDateString('pl-PL')}): ${initialState} + ${totalAdded} - ${totalSubtracted} = ${finalState}`);
            const formulaWidth = doc.getTextWidth(formulaText);
            doc.text(formulaText, (pageWidth - formulaWidth) / 2, finalY);
        }
        
        // Otwórz tryb drukowania zamiast pobierania PDF
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Otwórz PDF w nowym oknie i uruchom drukowanie
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
            printWindow.onload = function() {
                printWindow.print();
                // Opcjonalnie zamknij okno po drukowaniu
                printWindow.onafterprint = function() {
                    printWindow.close();
                    URL.revokeObjectURL(pdfUrl);
                };
            };
        }
        
        setIsWarehouseReportModalOpen(false);
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
        
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Header - centered
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        const headerText = convertPolishChars('STAN MAGAZYNOWY');
        const headerWidth = doc.getTextWidth(headerText);
        doc.text(headerText, (pageWidth - headerWidth) / 2, 20);
        
        // Date - centered
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        const dateText = convertPolishChars(`Data inwentarza: ${date.toLocaleDateString('pl-PL')}`);
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, (pageWidth - dateWidth) / 2, 30);
        
        // Filter info - wyświetl wszystkie aktywne filtry
        let filtersList = [];
        const selectedFiltersValues = selectedFiltersForReport.map(f => f.value);
        
        console.log('🔍 DEBUG Filtry - selectedFiltersForReport:', selectedFiltersForReport);
        console.log('🔍 DEBUG Filtry - selectedFiltersValues:', selectedFiltersValues);
        
        // Sprawdź i dodaj wszystkie aktywne filtry
        if (selectedFiltersValues.includes('specific') && selectedProductForReport) {
            filtersList = [selectedProductForReport.label];
        } else {
            // Zawsze dodaj "Wszystkie produkty" jeśli jest zaznaczone
            if (selectedFiltersValues.includes('all')) {
                filtersList.push('Wszystkie produkty');
            }
            
            // Dodaj każdy aktywny filtr
            if (selectedFiltersValues.includes('category') && selectedCategoryForReport) {
                filtersList.push(selectedCategoryForReport.label);
            }
            if (selectedFiltersValues.includes('manufacturer') && selectedManufacturerForReport) {
                filtersList.push(selectedManufacturerForReport.label);
            }
            if (selectedFiltersValues.includes('size') && selectedSizeForReport) {
                filtersList.push(selectedSizeForReport.label);
            }
            
            // Jeśli brak jakichkolwiek filtrów (fallback)
            if (filtersList.length === 0) {
                filtersList = ['Wszystkie produkty'];
            }
        }
        
        console.log('🔍 DEBUG Filtry - finalFiltersList:', filtersList);
        
        // Twórz tekst z prefiksem "Filtry:"
        const filterText = convertPolishChars(`Filtry: ${filtersList.join(', ')}`);
        const filterWidth = doc.getTextWidth(filterText);
        doc.text(filterText, (pageWidth - filterWidth) / 2, 40);
        
        // Total count - centered
        const totalText = convertPolishChars(`Calkowita liczba produktow w magazynie: ${data.totalItems || 0}`);
        const totalWidth = doc.getTextWidth(totalText);
        doc.text(totalText, (pageWidth - totalWidth) / 2, 50);
        
        // PODSUMOWANIE TABELA (zamiast szczegółowej tabeli)
        if (data.summary && data.summary.length > 0) {
            // Header podsumowania
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            const summaryHeaderText = convertPolishChars('PODSUMOWANIE');
            const summaryHeaderWidth = doc.getTextWidth(summaryHeaderText);
            doc.text(summaryHeaderText, (pageWidth - summaryHeaderWidth) / 2, 65);
            
            // Tabela podsumowująca - sortowanie alfabetyczne
            const summaryColumns = ['Lp.', 'Produkt', 'Ilosc', 'Kod kreskowy'];
            
            // Sortuj alfabetycznie według nazwy produktu (productKey)
            const sortedSummary = [...data.summary].sort((a, b) => {
                const nameA = (a.productKey || 'Nieznany produkt').toLowerCase();
                const nameB = (b.productKey || 'Nieznany produkt').toLowerCase();
                return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
            });
            
            const summaryRows = sortedSummary.map((item, index) => [
                (index + 1).toString(),
                convertPolishChars(item.productKey || 'Nieznany produkt'),
                `${item.count} szt.`,
                item.barcode && item.barcode !== '-' ? item.barcode : 'Brak kodu'
            ]);
            
            // Use autoTable function dla tabeli podsumowującej
            autoTable(doc, {
                head: [summaryColumns],
                body: summaryRows,
                startY: 75,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185], // Niebieski nagłówek
                    textColor: [255, 255, 255],
                    fontSize: 11,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 10,
                    textColor: [0, 0, 0]
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { left: 15, right: 15 },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' }, // Lp.
                    1: { cellWidth: 80 }, // Produkt (szersze dla pełnej nazwy)
                    2: { cellWidth: 30, halign: 'center' }, // Ilość
                    3: { cellWidth: 40, halign: 'center' }  // Kod kreskowy
                }
            });
        }

        // Add total value summary at the bottom (without unnecessary details)
        if (data.summary && data.summary.length > 0) {
            // Get the Y position after the summary table
            const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200;
            
            // Check if we need a new page
            if (finalY > 260) {
                doc.addPage();
                var currentY = 20;
            } else {
                var currentY = finalY;
            }
            
            // Only show total summary (without total value)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            
            // Center the total information
            const totalItemsText = convertPolishChars(`Calkowita liczba sztuk: ${data.totalItems || 0}`);
            const totalItemsWidth = doc.getTextWidth(totalItemsText);
            doc.text(totalItemsText, (pageWidth - totalItemsWidth) / 2, currentY);
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
        
        setIsWarehouseReportModalOpen(false);
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

    const handleSellingPointChange = (value) => {
        setSelectedSellingPoint(value); // Update selected selling point
        const normalizedValue = value.trim().toLowerCase(); // Normalize the selected value
        const count = tableData.filter((row) => row.symbol?.trim().toLowerCase() === normalizedValue).length; // Count rows matching the normalized value
        setMagazynCount(count); // Update the count
    };

    useEffect(() => {
        if (selectedSellingPoint && tableData.length > 0) {
            handleSellingPointChange(selectedSellingPoint); // Calculate count on initial load or when dependencies change
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
                    <Button color="warning" className="me-2 btn btn-sm" onClick={handleWarehouseReport}>Drukuj raport magazynowy</Button>
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
                    onChange={(e) => handleSellingPointChange(e.target.value)} // Update selectedSellingPoint and count
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

            {/* Warehouse Report Modal */}
            <Modal isOpen={isWarehouseReportModalOpen} toggle={toggleWarehouseReportModal} size="lg">
                <ModalHeader toggle={toggleWarehouseReportModal}>
                    Raport Magazynowy
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
                                    Przepływy magazynowe (okres)
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
                                    Stan magazynowy (na datę)
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
                            <Input
                                type="date"
                                id="inventoryDate"
                                value={inventoryDate.toISOString().split('T')[0]}
                                onChange={(e) => setInventoryDate(new Date(e.target.value))}
                                style={{ 
                                    backgroundColor: 'black', 
                                    color: 'white', 
                                    border: '1px solid white' 
                                }}
                            />
                        </FormGroup>
                    )}
                    
                    <FormGroup>
                        <Label for="filterSelect">Wybierz filtry:</Label>
                        <Select
                            isMulti
                            value={selectedFiltersForReport}
                            onChange={setSelectedFiltersForReport}
                            options={[
                                { value: 'all', label: 'Wszystkie produkty' },
                                { value: 'category', label: 'Filtruj według kategorii' },
                                { value: 'manufacturer', label: 'Filtruj według producenta' },
                                { value: 'size', label: 'Filtruj według rozmiaru' },
                                { value: 'specific', label: 'Konkretny produkt' }
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
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'category') && (
                        <FormGroup>
                            <Label for="categorySelect">Wybierz kategorię:</Label>
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
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'manufacturer') && (
                        <FormGroup>
                            <Label for="manufacturerSelect">Wybierz producenta:</Label>
                            <Select
                                value={selectedManufacturerForReport}
                                onChange={setSelectedManufacturerForReport}
                                options={manufacturers.map(manufacturer => ({
                                    value: manufacturer._id,
                                    label: manufacturer.Prod_Opis || manufacturer.Prod_Kod
                                }))}
                                placeholder="Wybierz producenta..."
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
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'specific') && (
                        <FormGroup>
                            <Label for="productSelect">Wybierz produkt:</Label>
                            <Select
                                value={selectedProductForReport}
                                onChange={setSelectedProductForReport}
                                options={goods.map(good => ({
                                    value: good._id,
                                    label: good.fullName
                                }))}
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

                    {(selectedFiltersForReport.some(filter => filter.value === 'size') ||
                      selectedFiltersForReport.some(filter => filter.value === 'category_size') ||
                      selectedFiltersForReport.some(filter => filter.value === 'manufacturer_size') ||
                      selectedFiltersForReport.some(filter => filter.value === 'combined_all')) && (
                        <FormGroup>
                            <Label for="sizeSelect">Wybierz rozmiar:</Label>
                            <Select
                                value={selectedSizeForReport}
                                onChange={setSelectedSizeForReport}
                                options={availableSizes}
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
                    <Button 
                        color="primary" 
                        onClick={generateWarehouseReport}
                        disabled={reportLoading}
                    >
                        {reportLoading ? <Spinner size="sm" /> : 'Drukuj raport'}
                    </Button>
                    <Button color="secondary" onClick={toggleWarehouseReportModal}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>


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


export default Warehouse;
