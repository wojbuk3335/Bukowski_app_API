import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker'; // Install react-datepicker if not already installed
import 'react-datepicker/dist/react-datepicker.css'; // Import styles for the date picker
import { CSVLink } from 'react-csv'; // Install react-csv if not already installed
import jsPDF from 'jspdf'; // Install jspdf if not already installed
import autoTable from 'jspdf-autotable'; // Install jspdf-autotable if not already installed
import * as XLSX from 'xlsx'; // Install xlsx if not already installed
import styles from '../State/State.module.css'; // Use the same styles as State.js

const Sales = () => {
    const [sales, setSales] = useState([]); // Ensure sales is initialized as an empty array
    const [filteredSales, setFilteredSales] = useState([]); // State for filtered sales
    const [error, setError] = useState(null); // State to track errors
    const [startDate, setStartDate] = useState(null); // Start date for date range filter
    const [endDate, setEndDate] = useState(null); // End date for date range filter
    const [searchQuery, setSearchQuery] = useState(''); // Search query for the search bar
    const [columnFilters, setColumnFilters] = useState({}); // Filters for individual columns
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // State for sorting configuration

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('/api/sales/get-all-sales'); // Adjust the endpoint if necessary
                if (Array.isArray(response.data)) {
                    setSales(response.data); // Set sales if the response is an array
                    setFilteredSales(response.data); // Initialize filtered sales
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setSales([]); // Fallback to an empty array
                    setFilteredSales([]);
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                setError('Failed to fetch sales data. Please try again later.');
                setSales([]); // Fallback to an empty array
                setFilteredSales([]);
            }
        };

        fetchSales();
    }, []);

    useEffect(() => {
        // Apply all filters (date range, search query, and column filters)
        let filtered = [...sales];

        // Filter by date range
        if (startDate && endDate) {
            filtered = filtered.filter((sale) => {
                const saleDate = new Date(sale.timestamp);
                return saleDate >= startDate && saleDate <= endDate;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((sale) =>
                Object.values(sale).some((value) =>
                    String(value).toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Filter by column filters
        Object.keys(columnFilters).forEach((key) => {
            if (columnFilters[key]) {
                filtered = filtered.filter((sale) => {
                    if (key === 'sizeId') {
                        // Handle filtering for sizeId.Roz_Opis
                        return sale.sizeId?.Roz_Opis?.toLowerCase().includes(columnFilters[key].toLowerCase());
                    }
                    return String(sale[key]).toLowerCase().includes(columnFilters[key].toLowerCase());
                });
            }
        });

        setFilteredSales(filtered);
    }, [sales, startDate, endDate, searchQuery, columnFilters]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedSales = React.useMemo(() => {
        if (!sortConfig.key) return filteredSales;
        return [...filteredSales].sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredSales, sortConfig]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text('Sales Data', 20, 10);
        autoTable(doc, {
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],
            body: filteredSales.map((sale, index) => [
                index + 1,
                sale.fullName,
                new Date(sale.timestamp).toLocaleDateString(),
                sale.barcode,
                sale.sizeId || 'N/A', // Use plain string value of sizeId
                sale.sellingPoint,
                sale.from,
                sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            ]),
        });
        doc.save('sales_data.pdf');
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(
            filteredSales.map((sale, index) => ({
                Lp: index + 1,
                'Pełna nazwa': sale.fullName,
                Data: new Date(sale.timestamp).toLocaleDateString(),
                'Kod kreskowy': sale.barcode,
                Rozmiar: sale.sizeId || 'N/A', // Use plain string value of sizeId
                'Punkt sprzedaży': sale.sellingPoint,
                Skąd: sale.from,
                Karta: sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                Gotówka: sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Data');
        XLSX.writeFile(workbook, 'sales_data.xlsx');
    };

    if (error) {
        return <div className={styles.error}>{error}</div>; // Display error message if any
    }

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const calculateSummary = (sales, key) => {
        const summary = {};
        sales.forEach((sale) => {
            sale[key].forEach((entry) => {
                const { price, currency } = entry;
                if (!summary[currency]) {
                    summary[currency] = 0;
                }
                summary[currency] += price;
            });
        });
        return summary;
    };

    const cardSummary = calculateSummary(filteredSales, 'card');
    const cashSummary = calculateSummary(filteredSales, 'cash');

    const handleExportFullPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(8); // Set smaller font size for the title
        doc.text('Sales Data with Summary', 20, 10);

        // Export table data
        autoTable(doc, {
            head: [['Lp.', 'Pełna nazwa', 'Data', 'Kod kreskowy', 'Rozmiar', 'Punkt sprzedaży', 'Skąd', 'Karta', 'Gotówka']],
            body: filteredSales.map((sale, index) => [
                index + 1,
                sale.fullName,
                new Date(sale.timestamp).toLocaleDateString(),
                sale.barcode,
                sale.sizeId || 'N/A', // Use plain string value of sizeId
                sale.sellingPoint,
                sale.from,
                sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
            ]),
        });

        // Add summary row
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10, // Start below the previous table
            head: [['Typ', 'Waluta', 'Suma']],
            body: [
                ...Object.entries(cardSummary).map(([currency, total]) => ['Karta', currency, total.toFixed(2)]),
                ...Object.entries(cashSummary).map(([currency, total]) => ['Gotówka', currency, total.toFixed(2)]),
            ],
        });

        doc.save('sales_data_with_summary.pdf');
    };

    const handleRemoveAllData = () => {
        const confirmationWord = 'REMOVE';
        const userInput = prompt(`To confirm removing all data, type "${confirmationWord}"`);
        if (userInput === confirmationWord) {
            setSales([]); // Clear all sales data
            setFilteredSales([]); // Clear filtered sales data
            alert('All data has been removed.');
        } else {
            alert('Data removal canceled.');
        }
    };

    const uniqueSellingPoints = [...new Set(sales.map((sale) => sale.sellingPoint))]; // Get unique selling points

    const handleDropdownFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    return (
        <div>
            <h1 className={styles.title}>Sprzedaż</h1> 
            <div className="d-flex flex-column align-items-center mb-3">
                <div className="d-flex justify-content-center mb-3">
                    <div className="me-3">
                        <label>Data początkowa:</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            className="form-control"
                            placeholderText="Wybierz datę początkową"
                        />
                    </div>
                    <div>
                        <label>Data końcowa:</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate}
                            className="form-control"
                            placeholderText="Wybierz datę końcową"
                        />
                    </div>
                </div>
                <div style={{ width: '200px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Wyszukiwarka"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="mb-3">
                <label>Punkt sprzedaży:</label> 
                <select
                    className="form-select"
                    onChange={(e) => handleDropdownFilterChange('sellingPoint', e.target.value)}
                >
                    <option value="">Wszystkie</option>
                    {uniqueSellingPoints.map((point, index) => (
                        <option key={index} value={point}>
                            {point}
                        </option>
                    ))}
                </select>
            </div>
            <div className="d-flex justify-content-center mb-3">
                <button className="btn btn-primary me-2" onClick={handleExportPDF}>
                    Eksportuj PDF (Tylko Dane)
                </button>
                <button className="btn btn-success me-2" onClick={handleExportExcel}>
                    Eksportuj Excel
                </button>
                <CSVLink
                    data={filteredSales.map((sale, index) => ({
                        Lp: index + 1,
                        'Pełna nazwa': sale.fullName,
                        Data: new Date(sale.timestamp).toLocaleDateString(),
                        'Kod kreskowy': sale.barcode,
                        Rozmiar: sale.sizeId || 'N/A', // Use plain string value of sizeId
                        'Punkt sprzedaży': sale.sellingPoint,
                        Skąd: sale.from,
                        Karta: sale.card.map((c) => `${c.price} ${c.currency}`).join(', '),
                        Gotówka: sale.cash.map((c) => `${c.price} ${c.currency}`).join(', '),
                    }))}
                    filename="sales_data.csv"
                    className="btn btn-info me-2"
                >
                    Eksportuj CSV
                </CSVLink>
                <button className="btn btn-warning" onClick={handleExportFullPDF}>
                    Eksportuj PDF (Dane + Podsumowanie)
                </button>
            </div>
            <div className="d-flex justify-content-center mb-3">
                <button className="btn btn-danger" onClick={handleRemoveAllData}>
                    Usuń Wszystkie Dane
                </button>
            </div>
            <div className={styles.tableContainer}>
                <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
                    <caption className={styles.caption}>Tabela przedstawiająca dane sprzedaży w systemie</caption>
                    <thead>
                        <tr>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('lp')}>
                                Lp. {sortConfig.key === 'lp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('lp', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('fullName')}>
                                Pełna nazwa {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('fullName', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('timestamp')}>
                                Data {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('timestamp', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('barcode')}>
                                Kod kreskowy {sortConfig.key === 'barcode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('barcode', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sizeId')}>
                                Rozmiar {sortConfig.key === 'sizeId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('sizeId', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sellingPoint')}>
                                Punkt sprzedaży {sortConfig.key === 'sellingPoint' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('sellingPoint', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('from')}>
                                Skąd {sortConfig.key === 'from' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('from', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('card')}>
                                Karta {sortConfig.key === 'card' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('card', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('cash')}>
                                Gotówka {sortConfig.key === 'cash' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('cash', e.target.value)}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSales.map((sale, index) => (
                            <tr key={sale._id} className={styles.tableRow}>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{index + 1}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.fullName}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{new Date(sale.timestamp).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.barcode}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.sizeId}</td> 
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.sellingPoint}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{sale.from}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {sale.card.map((c, i) => (
                                        <div key={i}>{`${c.price} ${c.currency}`}</div>
                                    ))}
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    {sale.cash.map((c, i) => (
                                        <div key={i}>{`${c.price} ${c.currency}`}</div>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7"></td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Karta:</strong>
                                {Object.entries(cardSummary).map(([currency, total], index) => (
                                    <div key={index}>
                                        {total.toFixed(2)} {currency}
                                    </div>
                                ))}
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <strong>Gotówka:</strong>
                                {Object.entries(cashSummary).map(([currency, total], index) => (
                                    <div key={index}>
                                        {total.toFixed(2)} {currency}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Sales;