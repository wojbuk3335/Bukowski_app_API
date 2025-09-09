import React, { useState, useEffect, useRef, Fragment } from 'react';
import axios from 'axios';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import pl from 'date-fns/locale/pl'; // Import Polish locale
import styles from './History.module.css';
import tableStyles from '../History/History.module.css';
import jsPDF from 'jspdf'; // Import jsPDF for PDF export
import autoTable from 'jspdf-autotable'; // Import autoTable for PDF tables
import * as XLSX from 'xlsx'; // Import XLSX for Excel export
import { saveAs } from 'file-saver'; // Import saveAs for file downloads

const History = () => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        collectionName: '',
        operation: '',
        from: '',
        to: '',
        userloggedinId: '',
        details: '',
    });
    const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]); // State for date range
    const [isDateRangePickerVisible, setIsDateRangePickerVisible] = useState(false); // State to toggle date range picker visibility
    const [popupContent, setPopupContent] = useState(null); // State for popup content
    const [isPopupVisible, setIsPopupVisible] = useState(false); // State for popup visibility
    const [hoverContent, setHoverContent] = useState(null); // State for hover content
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 }); // State for hover position
    const [isHoverVisible, setIsHoverVisible] = useState(false); // State for hover visibility
    const calendarRef = useRef(null); // Ref for the calendar container

    // Nowe stany dla zaawansowanych funkcji
    const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [savedFilters, setSavedFilters] = useState([]);
    const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
    const [filterName, setFilterName] = useState('');
    const [groupBy, setGroupBy] = useState('none');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [favorites, setFavorites] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [viewMode, setViewMode] = useState('table'); // table, cards, timeline
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDetails, setSelectedDetails] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/history');
                setHistoryData(response.data);
                // Załaduj zapisane filtry i ulubione z localStorage
                loadSavedData();
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    // Funkcja do ładowania zapisanych danych z localStorage
    const loadSavedData = () => {
        try {
            const savedFiltersData = localStorage.getItem('history_saved_filters');
            const favoritesData = localStorage.getItem('history_favorites');
            
            if (savedFiltersData) {
                setSavedFilters(JSON.parse(savedFiltersData));
            }
            if (favoritesData) {
                setFavorites(new Set(JSON.parse(favoritesData)));
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters((prevFilters) => ({
            ...prevFilters,
            [field]: value,
        }));
    };

    const handleTextFilterChange = (field, value) => {
        const validValues = [...new Set(historyData.map((item) => {
            if (field === 'userloggedinId') {
                // Handle both username and localStorage value for admin
                const username = item.userloggedinId?.username?.toLowerCase() || ''; // Extract username if available
                const adminEmail = localStorage.getItem('AdminEmail')?.toLowerCase() || ''; // Get admin email from localStorage
                return username || adminEmail; // Return either username or admin email
            }
            return item[field]?.toString().toLowerCase() || ''; // Ensure undefined values are replaced with an empty string
        }))];
        const matches = validValues.some((validValue) => validValue.includes(value.toLowerCase())); // Match anywhere in the word

        if (matches || value === '') {
            handleFilterChange(field, value);
        }
    };

    const filteredHistoryData = historyData.filter((item) => {
        const matchesDateRange =
            dateRange[0].startDate && dateRange[0].endDate
                ? new Date(item.timestamp) >= dateRange[0].startDate && new Date(item.timestamp) <= dateRange[0].endDate
                : true;

        return (
            matchesDateRange &&
            Object.keys(filters).every((key) => {
                if (key === 'userloggedinId') {
                    const username = item.userloggedinId?.username?.toLowerCase() || '';
                    const adminEmail = localStorage.getItem('AdminEmail')?.toLowerCase() || '';
                    const valueToMatch = username || adminEmail; // Combine both username and admin email
                    return filters[key] ? valueToMatch.includes(filters[key].toLowerCase()) : true;
                }
                return filters[key]
                    ? item[key]?.toString().toLowerCase().includes(filters[key].toLowerCase())
                    : true;
            })
        );
    });

    const toggleDateRangePicker = () => {
        setIsDateRangePickerVisible((prev) => !prev); // Toggle visibility
    };

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

    // Customize static and input ranges
    const customStaticRanges = originalStaticRanges.map((range) => {
        if (range.label === 'Today') return { ...range, label: 'Dzisiaj' };
        if (range.label === 'Yesterday') return { ...range, label: 'Wczoraj' };
        if (range.label === 'This Week') return { ...range, label: 'Ten tydzień' };
        if (range.label === 'Last Week') return { ...range, label: 'Poprzedni tydzień' };
        if (range.label === 'This Month') return { ...range, label: 'Ten miesiąc' };
        if (range.label === 'Last Month') return { ...range, label: 'Poprzedni miesiąc' };
        return range;
    });

    const customInputRanges = originalInputRanges.map((range) => {
        if (range.label === 'days up to today') return { ...range, label: 'dni do dzisiaj' };
        if (range.label === 'days starting today') return { ...range, label: 'dni od dzisiaj' };
        return range;
    });

    const showPopup = (content) => {
        setPopupContent(content);
        setIsPopupVisible(true);
    };

    const hidePopup = () => {
        setIsPopupVisible(false);
        setPopupContent(null);
    };

    const showHover = (content, event) => {
        const target = event.target;
        if (target.scrollWidth > target.clientWidth) { // Check if text is truncated
            setHoverContent(content);
            setHoverPosition({ x: event.clientX + 10, y: event.clientY + 10 }); // Position near the cursor
            setIsHoverVisible(true);
        }
    };

    const hideHover = () => {
        setIsHoverVisible(false);
        setHoverContent(null);
    };

    // Funkcja do otwierania modala szczegółów
    const openDetailsModal = (item) => {
        try {
            // Spróbuj sparsować szczegóły jako JSON
            let parsedDetails;
            if (typeof item.details === 'string') {
                try {
                    parsedDetails = JSON.parse(item.details);
                } catch (e) {
                    // Jeśli nie da się sparsować jako JSON, traktuj jako zwykły string
                    parsedDetails = { 'Szczegóły': item.details };
                }
            } else {
                parsedDetails = item.details || {};
            }
            
            // Wyciągnij tylko potrzebne dane z parsedDetails
            let barcode = '-';
            let rozmiar = '-';
            
            if (parsedDetails && typeof parsedDetails === 'object') {
                // Szukaj kodu kreskowego
                barcode = parsedDetails.barcode || parsedDetails.code || parsedDetails.barcodeText || '-';
                // Szukaj rozmiaru - tylko jeśli nie jest to ID (długi ciąg znaków)
                const sizeValue = parsedDetails.size || parsedDetails.sizeText || parsedDetails.rozmiar || '';
                // Sprawdź czy to nie jest ID (ID ma zwykle 24 znaki)
                if (sizeValue && sizeValue.length < 15 && !sizeValue.match(/^[a-f0-9]{24}$/i)) {
                    rozmiar = sizeValue;
                }
            }

            const detailsToShow = {
                'ID': item._id || '-',
                'Kolekcja': item.collectionName || '-',
                'Rodzaj': item.operation || '-',
                'Skąd': item.from || '-',
                'Dokąd': item.to || '-',
                'Użytkownik': item.userloggedinId?.username || item.userloggedinId || localStorage.getItem('AdminEmail') || '-',
                'Produkt': item.product || '-',
                'Czas': new Date(item.timestamp).toLocaleString('pl-PL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }) || '-',
                'Kod kreskowy': barcode
            };

            // Dodaj rozmiar tylko jeśli jest prawidłowy
            if (rozmiar && rozmiar !== '-') {
                detailsToShow['Rozmiar'] = rozmiar;
            }

            setSelectedDetails(detailsToShow);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Błąd podczas otwierania szczegółów:', error);
        }
    };

    // Funkcja sortowania
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Funkcja eksportu do CSV
    const exportToCSV = () => {
        const headers = ['Lp.', 'Kolekcja', 'Operacja', 'Skąd', 'Dokąd', 'Użytkownik', 'Produkt', 'Szczegóły', 'Czas'];
        const csvData = [
            headers.join(','),
            ...getSortedAndFilteredData().map((item, index) => [
                index + 1,
                `"${item.collectionName || ''}"`,
                `"${item.operation || ''}"`,
                `"${item.from || '-'}"`,
                `"${item.to || '-'}"`,
                `"${item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}"`,
                `"${item.product || '-'}"`,
                `"${item.details || '-'}"`,
                `"${new Date(item.timestamp).toLocaleString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historia_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Funkcja eksportu do PDF (tylko dane)
    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Historia operacji', 20, 15);
        
        const data = getSortedAndFilteredData();
        autoTable(doc, {
            head: [['Lp.', 'Kolekcja', 'Operacja', 'Skąd', 'Dokąd', 'Użytkownik', 'Produkt', 'Szczegóły', 'Czas']],
            body: data.map((item, index) => [
                index + 1,
                item.collectionName || '',
                item.operation || '',
                item.from || '-',
                item.to || '-',
                item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail'),
                item.product || '-',
                item.details || '-',
                new Date(item.timestamp).toLocaleString()
            ]),
            startY: 25,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 0, 0] }
        });
        
        doc.save(`historia_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Funkcja eksportu do Excel
    const exportToExcel = () => {
        const data = getSortedAndFilteredData();
        const worksheet = XLSX.utils.json_to_sheet(
            data.map((item, index) => ({
                'Lp.': index + 1,
                'Kolekcja': item.collectionName || '',
                'Operacja': item.operation || '',
                'Skąd': item.from || '-',
                'Dokąd': item.to || '-',
                'Użytkownik': item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail'),
                'Produkt': item.product || '-',
                'Szczegóły': item.details || '-',
                'Czas': new Date(item.timestamp).toLocaleString()
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Historia');
        XLSX.writeFile(workbook, `historia_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Funkcja eksportu do JSON
    const exportToJSON = () => {
        const data = getSortedAndFilteredData();
        const jsonData = data.map((item, index) => ({
            lp: index + 1,
            kolekcja: item.collectionName || '',
            operacja: item.operation || '',
            skad: item.from || '-',
            dokad: item.to || '-',
            uzytkownik: item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail'),
            produkt: item.product || '-',
            szczegoly: item.details || '-',
            czas: new Date(item.timestamp).toISOString(),
            timestamp: item.timestamp
        }));

        const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { 
            type: 'application/json;charset=utf-8;' 
        });
        saveAs(jsonBlob, `historia_${new Date().toISOString().split('T')[0]}.json`);
    };

    // Funkcja eksportu do PDF z podsumowaniem
    const exportToFullPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Historia operacji z podsumowaniem', 20, 15);
        
        const data = getSortedAndFilteredData();
        
        // Tabela danych
        autoTable(doc, {
            head: [['Lp.', 'Kolekcja', 'Operacja', 'Skąd', 'Dokąd', 'Użytkownik', 'Produkt', 'Szczegóły', 'Czas']],
            body: data.map((item, index) => [
                index + 1,
                item.collectionName || '',
                item.operation || '',
                item.from || '-',
                item.to || '-',
                item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail'),
                item.product || '-',
                item.details || '-',
                new Date(item.timestamp).toLocaleString()
            ]),
            startY: 25,
            styles: { fontSize: 7 },
            headStyles: { fillColor: [0, 0, 0] }
        });

        // Podsumowanie
        const stats = calculateStats();
        const summaryY = doc.lastAutoTable.finalY + 15;
        
        doc.setFontSize(14);
        doc.text('Podsumowanie:', 20, summaryY);
        
        autoTable(doc, {
            startY: summaryY + 10,
            head: [['Kategoria', 'Wartość']],
            body: [
                ['Łączna liczba rekordów', stats.total.toString()],
                ['Różnych operacji', Object.keys(stats.operations).length.toString()],
                ['Aktywnych użytkowników', Object.keys(stats.users).length.toString()],
                ['Różnych kolekcji', Object.keys(stats.collections).length.toString()],
                ['Najczęstsza operacja', Object.entries(stats.operations).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Brak'],
                ['Najaktywniejszy użytkownik', Object.entries(stats.users).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Brak']
            ],
            styles: { fontSize: 10 },
            headStyles: { fillColor: [50, 50, 50] }
        });

        doc.save(`historia_z_podsumowaniem_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Funkcja zapisywania filtra
    const saveCurrentFilter = () => {
        if (!filterName.trim()) return;
        
        const newFilter = {
            id: Date.now(),
            name: filterName,
            filters: { ...filters },
            dateRange: [...dateRange],
            sortConfig: { ...sortConfig }
        };
        
        const updatedFilters = [...savedFilters, newFilter];
        setSavedFilters(updatedFilters);
        localStorage.setItem('history_saved_filters', JSON.stringify(updatedFilters));
        setFilterName('');
        setShowSaveFilterModal(false);
    };

    // Funkcja ładowania zapisanego filtra
    const loadSavedFilter = (savedFilter) => {
        setFilters(savedFilter.filters);
        setDateRange(savedFilter.dateRange);
        setSortConfig(savedFilter.sortConfig);
    };

    // Funkcja usuwania zapisanego filtra
    const deleteSavedFilter = (filterId) => {
        const updatedFilters = savedFilters.filter(f => f.id !== filterId);
        setSavedFilters(updatedFilters);
        localStorage.setItem('history_saved_filters', JSON.stringify(updatedFilters));
    };

    // Funkcja dodawania/usuwania z ulubionych
    const toggleFavorite = (itemId) => {
        const newFavorites = new Set(favorites);
        if (newFavorites.has(itemId)) {
            newFavorites.delete(itemId);
        } else {
            newFavorites.add(itemId);
        }
        setFavorites(newFavorites);
        localStorage.setItem('history_favorites', JSON.stringify([...newFavorites]));
    };

    // Funkcja zaznaczania wszystkich elementów
    const toggleSelectAll = () => {
        if (selectedItems.size === getSortedAndFilteredData().length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(getSortedAndFilteredData().map(item => item._id)));
        }
    };

    // Funkcja zaznaczania pojedynczego elementu
    const toggleSelectItem = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    // Funkcja usuwania zaznaczonych elementów
    const deleteSelectedItems = async () => {
        if (selectedItems.size === 0) return;
        
        try {
            await Promise.all([...selectedItems].map(id => 
                axios.delete(`/api/history/${id}`)
            ));
            
            setHistoryData(historyData.filter(item => !selectedItems.has(item._id)));
            setSelectedItems(new Set());
            setShowBulkActions(false);
        } catch (error) {
            console.error('Error deleting selected items:', error);
        }
    };

    // Funkcja kopiowania do schowka
    const copySelectedToClipboard = () => {
        const selectedData = getSortedAndFilteredData().filter(item => selectedItems.has(item._id));
        const text = selectedData.map(item => 
            `${item.operation} - ${item.collectionName} - ${new Date(item.timestamp).toLocaleString()}`
        ).join('\n');
        
        navigator.clipboard.writeText(text);
        setShowBulkActions(false);
    };

    // Funkcja obliczania statystyk
    const calculateStats = () => {
        const data = getSortedAndFilteredData();
        const stats = {
            total: data.length,
            operations: {},
            users: {},
            collections: {},
            timeRange: {
                oldest: null,
                newest: null
            }
        };

        data.forEach(item => {
            // Statystyki operacji
            stats.operations[item.operation] = (stats.operations[item.operation] || 0) + 1;
            
            // Statystyki użytkowników
            const user = item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail');
            stats.users[user] = (stats.users[user] || 0) + 1;
            
            // Statystyki kolekcji
            stats.collections[item.collectionName] = (stats.collections[item.collectionName] || 0) + 1;
            
            // Zakres czasowy
            const itemDate = new Date(item.timestamp);
            if (!stats.timeRange.oldest || itemDate < stats.timeRange.oldest) {
                stats.timeRange.oldest = itemDate;
            }
            if (!stats.timeRange.newest || itemDate > stats.timeRange.newest) {
                stats.timeRange.newest = itemDate;
            }
        });

        return stats;
    };

    // Funkcja grupowania danych
    const getGroupedData = () => {
        const data = getSortedAndFilteredData();
        if (groupBy === 'none') return { 'Wszystkie': data };

        const grouped = {};
        data.forEach(item => {
            let key;
            switch (groupBy) {
                case 'operation':
                    key = item.operation || 'Nieznane';
                    break;
                case 'user':
                    key = item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail');
                    break;
                case 'collection':
                    key = item.collectionName || 'Nieznane';
                    break;
                case 'date':
                    key = new Date(item.timestamp).toLocaleDateString();
                    break;
                default:
                    key = 'Wszystkie';
            }
            
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });

        return grouped;
    };

    // Funkcja sortowania i filtrowania danych
    const getSortedAndFilteredData = () => {
        let data = [...filteredHistoryData];
        
        // Sortowanie
        data.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortConfig.key) {
                case 'timestamp':
                    aValue = new Date(a.timestamp);
                    bValue = new Date(b.timestamp);
                    break;
                case 'user':
                    aValue = a.userloggedinId ? a.userloggedinId.username : localStorage.getItem('AdminEmail');
                    bValue = b.userloggedinId ? b.userloggedinId.username : localStorage.getItem('AdminEmail');
                    break;
                default:
                    aValue = a[sortConfig.key] || '';
                    bValue = b[sortConfig.key] || '';
            }
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return data;
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
        <div className={tableStyles.container}>
            {/* Header z tytułem i kontrolkami */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                margin: '10px 0', 
                padding: '15px',
                backgroundColor: 'black',
                borderRadius: '8px',
                border: '1px solid #333',
                gap: '15px'
            }}>
                <h1 className={tableStyles.title} style={{ margin: 0, color: 'white', textAlign: 'center' }}>
                    Historia ({getSortedAndFilteredData().length})
                </h1>
                
                {/* Przyciski kontrolne i eksportu */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className="btn btn-sm"
                        style={{
                            backgroundColor: showAdvancedSearch ? '#28a745' : '#6c757d',
                            color: 'white',
                            border: 'none'
                        }}
                        title="Zaawansowane wyszukiwanie"
                    >
                         Wyszukiwanie
                    </button>
                    
                    <button
                        onClick={() => setShowStatsModal(true)}
                        className="btn btn-sm"
                        style={{ backgroundColor: '#0d6efd', color: 'white', border: 'none' }}
                        title="Pokaż statystyki"
                    >
                        Statystyki
                    </button>
                    
                    {selectedItems.size > 0 && (
                        <button
                            onClick={() => setShowBulkActions(true)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                            title="Akcje grupowe"
                        >
                            ⚡ Akcje ({selectedItems.size})
                        </button>
                    )}
                    
                    <button 
                        onClick={exportToPDF}
                        className="btn btn-sm btn-danger me-2"
                        title="Eksportuj PDF (tylko dane)"
                    >
                         Export to PDF (Dane)
                    </button>
                    <button 
                        onClick={exportToFullPDF}
                        className="btn btn-sm btn-danger me-2"
                        title="Eksportuj PDF (dane + podsumowanie)"
                    >
                         Export to PDF (Dane + Podsumowanie)
                    </button>
                    <button 
                        onClick={exportToExcel}
                        className="btn btn-success btn-sm"
                        title="Exportuj do Excela"
                    >
                         Export to Excel
                    </button>
                    <button 
                        onClick={exportToCSV}
                        className="btn btn-info btn-sm"
                        title="Eksportuj CSV"
                    >
                         Export to CSV
                    </button>
                    <button 
                        onClick={exportToJSON}
                        className="btn btn-secondary btn-sm"
                        title="Eksportuj JSON"
                    >
                         Export to JSON
                    </button>
                </div>
            </div>

            {/* Panel zaawansowanego wyszukiwania */}
            {showAdvancedSearch && (
                <div style={{
                    backgroundColor: 'black',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '15px'
                }}>
                    <h4 style={{ color: 'white', marginBottom: '15px' }}>🔍 Zaawansowane wyszukiwanie</h4>
                    
                    {/* Grupowanie i widok */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '30px', 
                        marginBottom: '15px',
                        padding: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ color: 'white', margin: '0', whiteSpace: 'nowrap' }}>Grupuj według:</label>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value)}
                                className="form-select form-select-sm"
                                style={{ minWidth: '150px' }}
                            >
                                <option value="none">Bez grupowania</option>
                                <option value="operation">Operacja</option>
                                <option value="user">Użytkownik</option>
                                <option value="collection">Kolekcja</option>
                                <option value="date">Data</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ color: 'white', margin: '0', whiteSpace: 'nowrap' }}>Widok:</label>
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                className="form-select form-select-sm"
                                style={{ minWidth: '150px' }}
                            >
                                <option value="table">Tabela</option>
                                <option value="cards">Karty</option>
                                <option value="timeline">Oś czasu</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Zapisane filtry */}
                    {savedFilters.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>💾 Zapisane filtry:</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {savedFilters.map(filter => (
                                    <div key={filter.id} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        backgroundColor: '#333',
                                        borderRadius: '4px',
                                        padding: '4px 8px'
                                    }}>
                                        <button
                                            onClick={() => loadSavedFilter(filter)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                            title={`Załaduj filtr: ${filter.name}`}
                                        >
                                            {filter.name}
                                        </button>
                                        <button
                                            onClick={() => deleteSavedFilter(filter.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#dc3545',
                                                cursor: 'pointer',
                                                marginLeft: '5px',
                                                fontSize: '12px'
                                            }}
                                            title="Usuń filtr"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Główna zawartość */}
            <div className={tableStyles.tableContainer} style={{ width: '100%' }}>
                {viewMode === 'table' && (
                    <table className={`${tableStyles.table} ${tableStyles.responsiveTable}`}>
                        <thead>
                            <tr>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '40px', width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedItems.size === getSortedAndFilteredData().length && getSortedAndFilteredData().length > 0}
                                        onChange={toggleSelectAll}
                                        title="Zaznacz wszystkie"
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('index')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według numeru"
                                    >
                                        Lp. {sortConfig.key === 'index' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('collectionName')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według kolekcji"
                                    >
                                        Kolekcja {sortConfig.key === 'collectionName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.collectionName}
                                        onChange={(e) => handleTextFilterChange('collectionName', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('operation')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według operacji"
                                    >
                                        Operacja {sortConfig.key === 'operation' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.operation}
                                        onChange={(e) => handleTextFilterChange('operation', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('from')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według źródła"
                                    >
                                        Skąd {sortConfig.key === 'from' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.from}
                                        onChange={(e) => handleTextFilterChange('from', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('to')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według celu"
                                    >
                                        Dokąd {sortConfig.key === 'to' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.to}
                                        onChange={(e) => handleTextFilterChange('to', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('user')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według użytkownika"
                                    >
                                        Użytkownik {sortConfig.key === 'user' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.userloggedinId}
                                        onChange={(e) => handleTextFilterChange('userloggedinId', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('product')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według produktu"
                                    >
                                        Produkt {sortConfig.key === 'product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm mt-1"
                                        placeholder="Filtruj"
                                        value={filters.product}
                                        onChange={(e) => handleTextFilterChange('product', e.target.value)}
                                    />
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                    <button 
                                        onClick={() => handleSort('details')}
                                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                        title="Sortuj według szczegółów"
                                    >
                                        Szczegóły {sortConfig.key === 'details' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </button>
                                </th>
                                <th className={tableStyles.tableHeader} style={{ maxWidth: '300px', width: '300px', textAlign: 'center' }}>
                                    <div className="d-flex flex-column align-items-center">
                                        <button 
                                            onClick={() => handleSort('timestamp')}
                                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                            title="Sortuj według czasu"
                                        >
                                            <span onClick={toggleDateRangePicker} style={{ cursor: 'pointer' }}>
                                                Czas {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </span>
                                        </button>
                                        {isDateRangePickerVisible && (
                                            <div
                                                ref={calendarRef}
                                                style={{
                                                    position: 'absolute',
                                                    top: '50px',
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
                            </tr>
                        </thead>
                        <tbody>
                            {groupBy === 'none' ? (
                                getSortedAndFilteredData().map((item, index) => (
                                    <tr key={item._id} style={{ 
                                        backgroundColor: favorites.has(item._id) ? 'rgba(255, 193, 7, 0.1)' : 'transparent' 
                                    }}>
                                        <td className={tableStyles.tableCell} style={{ maxWidth: '40px', width: '40px', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedItems.has(item._id)}
                                                onChange={() => toggleSelectItem(item._id)}
                                            />
                                        </td>
                                        <td className={tableStyles.tableCell} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }} data-label="Lp.">{index + 1}</td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '150px', width: '150px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Kolekcja"
                                            onMouseEnter={(e) => showHover(item.collectionName, e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.collectionName}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '200px', width: '200px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Operacja"
                                            onMouseEnter={(e) => showHover(item.operation, e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.operation}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '150px', width: '150px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Skąd"
                                            onMouseEnter={(e) => showHover(item.from === "" ? "-" : item.from, e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.from === "" ? "-" : item.from}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '150px', width: '150px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Dokąd"
                                            onMouseEnter={(e) => showHover(item.to === "" ? "-" : item.to, e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.to === "" ? "-" : item.to}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '150px', width: '150px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Użytkownik"
                                            onMouseEnter={(e) => showHover(item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail'), e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '200px', width: '200px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Produkt"
                                            onMouseEnter={(e) => showHover(item.product || '-', e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {item.product || '-'}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '200px', width: '200px', textAlign: 'center', position: 'relative' }}
                                            data-label="Szczegóły"
                                        >
                                            {item.details && item.details.trim() !== '' ? (
                                                <button 
                                                    onClick={() => openDetailsModal(item)}
                                                    style={{
                                                        backgroundColor: '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        padding: '6px 12px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Pokaż szczegóły
                                                </button>
                                            ) : (
                                                <span style={{ color: '#888' }}>-</span>
                                            )}
                                        </td>
                                        <td
                                            className={tableStyles.tableCell}
                                            style={{ maxWidth: '150px', width: '150px', textAlign: 'center', position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            data-label="Czas"
                                            onMouseEnter={(e) => showHover(new Date(item.timestamp).toLocaleString(), e)}
                                            onMouseLeave={hideHover}
                                        >
                                            {new Date(item.timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                Object.entries(getGroupedData()).map(([groupName, groupItems]) => (
                                    <React.Fragment key={groupName}>
                                        <tr style={{ backgroundColor: '#333' }}>
                                            <td colSpan="10" style={{ 
                                                textAlign: 'center', 
                                                fontWeight: 'bold', 
                                                color: 'white', 
                                                padding: '10px',
                                                fontSize: '16px'
                                            }}>
                                                📁 {groupName} ({groupItems.length} elementów)
                                            </td>
                                        </tr>
                                        {groupItems.map((item, index) => (
                                            <tr key={item._id} style={{ 
                                                backgroundColor: favorites.has(item._id) ? 'rgba(255, 193, 7, 0.1)' : 'transparent' 
                                            }}>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '40px', width: '40px', textAlign: 'center' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedItems.has(item._id)}
                                                        onChange={() => toggleSelectItem(item._id)}
                                                    />
                                                </td>
                                                {/* Pozostałe komórki podobnie jak powyżej */}
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }}>{index + 1}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>{item.collectionName}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>{item.operation}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>{item.from || '-'}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>{item.to || '-'}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                                    {item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}
                                                </td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>{item.product || '-'}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>{item.details || '-'}</td>
                                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                )}

                {/* Widok kart */}
                {viewMode === 'cards' && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                        gap: '20px',
                        padding: '20px'
                    }}>
                        {getSortedAndFilteredData().map((item, index) => (
                            <div key={item._id} style={{
                                backgroundColor: favorites.has(item._id) ? 'rgba(255, 193, 7, 0.1)' : 'black',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '15px',
                                color: 'white'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedItems.has(item._id)}
                                            onChange={() => toggleSelectItem(item._id)}
                                        />
                                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>#{index + 1}</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#ccc' }}>
                                        {new Date(item.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                
                                <div style={{ marginBottom: '10px' }}>
                                    <strong>{item.operation}</strong> - {item.collectionName}
                                </div>
                                
                                {item.product && (
                                    <div style={{ marginBottom: '8px', color: '#0d6efd' }}>
                                        📦 {item.product}
                                    </div>
                                )}
                                
                                <div style={{ fontSize: '14px', color: '#ccc' }}>
                                    {item.from && <div>📤 Skąd: {item.from}</div>}
                                    {item.to && <div>📥 Dokąd: {item.to}</div>}
                                    <div>👤 {item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}</div>
                                    {item.details && <div>📝 {item.details}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Widok osi czasu */}
                {viewMode === 'timeline' && (
                    <div style={{ padding: '20px', color: 'white' }}>
                        <div style={{ borderLeft: '2px solid #0d6efd', paddingLeft: '20px' }}>
                            {getSortedAndFilteredData().map((item, index) => (
                                <div key={item._id} style={{ 
                                    marginBottom: '30px',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '-30px',
                                        top: '0px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        backgroundColor: '#0d6efd',
                                        border: '2px solid black'
                                    }}></div>
                                    
                                    <div style={{
                                        backgroundColor: 'black',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        padding: '15px',
                                        marginLeft: '10px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedItems.has(item._id)}
                                                    onChange={() => toggleSelectItem(item._id)}
                                                />
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#ccc' }}>
                                                {new Date(item.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                                            {item.operation} - {item.collectionName}
                                        </div>
                                        
                                        <div style={{ fontSize: '14px', color: '#ccc' }}>
                                            {item.from && <span>📤 {item.from} → </span>}
                                            {item.to && <span>📥 {item.to}</span>}
                                            <div>👤 {item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}</div>
                                            {item.product && <div>📦 {item.product}</div>}
                                            {item.details && <div>📝 {item.details}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {isPopupVisible && (
                <div
                    className={styles.popup}
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    }}
                >
                    <div style={{ marginBottom: '10px' }}>{popupContent}</div>
                    <button onClick={hidePopup} style={{ cursor: 'pointer' }}>Zamknij</button>
                </div>
            )}
            
            {isHoverVisible && (
                <div
                    className={styles.hoverPopup}
                    style={{
                        position: 'absolute',
                        top: hoverPosition.y,
                        left: hoverPosition.x,
                        zIndex: 1000,
                        backgroundColor: 'white',
                        padding: '10px',
                        borderRadius: '4px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        pointerEvents: 'none',
                    }}
                >
                    {hoverContent}
                </div>
            )}

            {/* Modal statystyk */}
            {showStatsModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'black',
                        border: '2px solid #0d6efd',
                        borderRadius: '8px',
                        minWidth: '600px',
                        maxWidth: '800px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        color: 'white'
                    }}>
                        <div style={{
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            padding: '16px 24px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            textAlign: 'center'
                        }}>
                            📊 Statystyki historii
                        </div>
                        <div style={{ padding: '24px' }}>
                            {(() => {
                                const stats = calculateStats();
                                return (
                                    <div>
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                            gap: '20px',
                                            marginBottom: '30px'
                                        }}>
                                            <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d6efd' }}>{stats.total}</div>
                                                <div>Łączna liczba rekordów</div>
                                            </div>
                                            
                                            <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>{Object.keys(stats.operations).length}</div>
                                                <div>Różnych operacji</div>
                                            </div>
                                            
                                            <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{Object.keys(stats.users).length}</div>
                                                <div>Aktywnych użytkowników</div>
                                            </div>
                                            
                                            <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>{Object.keys(stats.collections).length}</div>
                                                <div>Różnych kolekcji</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div>
                                                <h4 style={{ color: '#0d6efd', marginBottom: '15px' }}>📈 Top operacje:</h4>
                                                {Object.entries(stats.operations)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .slice(0, 5)
                                                    .map(([operation, count]) => (
                                                        <div key={operation} style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            padding: '8px',
                                                            backgroundColor: '#333',
                                                            marginBottom: '5px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <span>{operation}</span>
                                                            <span style={{ fontWeight: 'bold', color: '#0d6efd' }}>{count}</span>
                                                        </div>
                                                    ))}
                                            </div>

                                            <div>
                                                <h4 style={{ color: '#28a745', marginBottom: '15px' }}>👥 Top użytkownicy:</h4>
                                                {Object.entries(stats.users)
                                                    .sort(([,a], [,b]) => b - a)
                                                    .slice(0, 5)
                                                    .map(([user, count]) => (
                                                        <div key={user} style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            padding: '8px',
                                                            backgroundColor: '#333',
                                                            marginBottom: '5px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <span>{user}</span>
                                                            <span style={{ fontWeight: 'bold', color: '#28a745' }}>{count}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {stats.timeRange.oldest && stats.timeRange.newest && (
                                            <div style={{ 
                                                marginTop: '20px', 
                                                padding: '15px', 
                                                backgroundColor: '#333', 
                                                borderRadius: '8px' 
                                            }}>
                                                <h4 style={{ color: '#ffc107', marginBottom: '10px' }}>⏰ Zakres czasowy:</h4>
                                                <div>📅 Najstarszy rekord: {stats.timeRange.oldest.toLocaleString()}</div>
                                                <div>📅 Najnowszy rekord: {stats.timeRange.newest.toLocaleString()}</div>
                                                <div style={{ marginTop: '8px', color: '#ccc' }}>
                                                    Okres: {Math.ceil((stats.timeRange.newest - stats.timeRange.oldest) / (1000 * 60 * 60 * 24))} dni
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '16px 24px',
                            borderTop: '1px solid #555'
                        }}>
                            <button
                                onClick={() => setShowStatsModal(false)}
                                className="btn btn-sm"
                                style={{
                                    backgroundColor: '#0d6efd',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px'
                                }}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal zapisywania filtra */}
            {showSaveFilterModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'black',
                        border: '2px solid #6f42c1',
                        borderRadius: '8px',
                        minWidth: '400px',
                        color: 'white'
                    }}>
                        <div style={{
                            backgroundColor: '#6f42c1',
                            color: 'white',
                            padding: '16px 24px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            textAlign: 'center'
                        }}>
                            💾 Zapisz filtr
                        </div>
                        <div style={{ padding: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px' }}>Nazwa filtra:</label>
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                placeholder="Wprowadź nazwę filtra..."
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #555',
                                    backgroundColor: '#333',
                                    color: 'white'
                                }}
                                autoFocus
                            />
                            
                            <div style={{ 
                                marginTop: '15px', 
                                padding: '10px', 
                                backgroundColor: '#333', 
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}>
                                <div><strong>Co zostanie zapisane:</strong></div>
                                <div style={{ color: '#ccc', marginTop: '5px' }}>
                                    • Wszystkie aktywne filtry<br/>
                                    • Zakres dat<br/>
                                    • Ustawienia sortowania
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '16px',
                            padding: '16px 24px',
                            borderTop: '1px solid #555'
                        }}>
                            <button
                                onClick={() => {
                                    setShowSaveFilterModal(false);
                                    setFilterName('');
                                }}
                                className="btn btn-sm"
                                style={{
                                    backgroundColor: '#6c757d',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px'
                                }}
                            >
                                Anuluj
                            </button>
                            <button
                                onClick={saveCurrentFilter}
                                disabled={!filterName.trim()}
                                className="btn btn-sm"
                                style={{
                                    backgroundColor: filterName.trim() ? '#6f42c1' : '#6c757d',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px',
                                    cursor: filterName.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                💾 Zapisz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal szczegółów */}
            {showDetailsModal && selectedDetails && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'black',
                        border: '2px solid #0d6efd',
                        borderRadius: '8px',
                        minWidth: '500px',
                        maxWidth: '700px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        color: 'white'
                    }}>
                        <div style={{
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            padding: '16px 24px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            textAlign: 'center'
                        }}>
                            📋 Szczegóły operacji
                        </div>
                        <div style={{ padding: '24px' }}>
                            {Object.entries(selectedDetails).map(([key, value]) => (
                                <div key={key} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #333'
                                }}>
                                    <strong style={{ 
                                        color: '#0d6efd', 
                                        minWidth: '120px',
                                        marginRight: '16px'
                                    }}>
                                        {key}:
                                    </strong>
                                    <span style={{ 
                                        wordBreak: 'break-word',
                                        textAlign: 'right',
                                        flex: 1
                                    }}>
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '-')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '16px 24px',
                            borderTop: '1px solid #555'
                        }}>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="btn btn-sm"
                                style={{
                                    backgroundColor: '#6c757d',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px'
                                }}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal akcji grupowych */}
            {showBulkActions && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'black',
                        border: '2px solid #dc3545',
                        borderRadius: '8px',
                        minWidth: '400px',
                        color: 'white'
                    }}>
                        <div style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '16px 24px',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            textAlign: 'center'
                        }}>
                            ⚡ Akcje grupowe ({selectedItems.size} elementów)
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '15px'
                            }}>
                                <button
                                    onClick={copySelectedToClipboard}
                                    className="btn"
                                    style={{
                                        backgroundColor: '#17a2b8',
                                        border: 'none',
                                        color: 'white',
                                        padding: '12px 20px',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                >
                                    📋 Kopiuj do schowka
                                </button>
                                
                                <button
                                    onClick={() => {
                                        if (window.confirm(`Czy na pewno chcesz usunąć ${selectedItems.size} zaznaczonych elementów? Ta operacja jest nieodwracalna.`)) {
                                            deleteSelectedItems();
                                        }
                                    }}
                                    className="btn"
                                    style={{
                                        backgroundColor: '#dc3545',
                                        border: 'none',
                                        color: 'white',
                                        padding: '12px 20px',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                >
                                    🗑️ Usuń zaznaczone
                                </button>
                                
                                <button
                                    onClick={() => {
                                        selectedItems.forEach(id => toggleFavorite(id));
                                        setShowBulkActions(false);
                                    }}
                                    className="btn"
                                    style={{
                                        backgroundColor: '#ffc107',
                                        border: 'none',
                                        color: 'black',
                                        padding: '12px 20px',
                                        borderRadius: '4px',
                                        width: '100%'
                                    }}
                                >
                                    ⭐ Przełącz ulubione
                                </button>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '16px 24px',
                            borderTop: '1px solid #555'
                        }}>
                            <button
                                onClick={() => setShowBulkActions(false)}
                                className="btn btn-sm"
                                style={{
                                    backgroundColor: '#6c757d',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 20px',
                                    borderRadius: '4px'
                                }}
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;