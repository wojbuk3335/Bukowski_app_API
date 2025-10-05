import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import styles from '../Warehouse/Warehouse.module.css';

// Register Polish locale for DatePicker
registerLocale('pl', pl);

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [dateFilter, setDateFilter] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Format date function
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Fetch sales data on component mount
    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('/api/sales');
                if (Array.isArray(response.data)) {
                    setSales(response.data);
                    setFilteredSales(response.data);
                } else {
                    console.error('Sales data is not an array:', response.data);
                    setSales([]);
                    setFilteredSales([]);
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                setError('Failed to fetch sales data. Please try again later.');
                setSales([]);
                setFilteredSales([]);
            }
        };
        fetchSales();
    }, []);

    useEffect(() => {
        let filtered = [...sales];
        
        // Filter by date range
        if (startDate && endDate) {
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter((sale) => {
                if (!sale.date) {
                    return false;
                }
                
                let saleDate;
                if (sale.date instanceof Date) {
                    saleDate = sale.date;
                } else if (typeof sale.date === 'string') {
                    // Handle ISO string format like "2025-10-05T07:53:51.205Z"
                    saleDate = new Date(sale.date);
                } else {
                    return false;
                }
                
                if (isNaN(saleDate)) {
                    return false;
                }
                
                // Set sale date to start of day for comparison
                const saleDateStartOfDay = new Date(saleDate);
                saleDateStartOfDay.setHours(0, 0, 0, 0);
                
                const isInRange = saleDateStartOfDay >= startOfDay && saleDateStartOfDay <= endOfDay;
                
                return isInRange;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((sale) =>
                Object.values(sale)
                    .join(' ')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            );
        }

        // Apply column filters
        Object.keys(columnFilters).forEach((key) => {
            if (columnFilters[key]) {
                filtered = filtered.filter((sale) =>
                    String(sale[key] || '')
                        .toLowerCase()
                        .includes(columnFilters[key].toLowerCase())
                );
            }
        });

        // Filter by date picker
        if (dateFilter) {
            const selectedDate = new Date(dateFilter);
            selectedDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);

            filtered = filtered.filter((sale) => {
                if (!sale.date) return false;
                
                let saleDate;
                if (sale.date instanceof Date) {
                    saleDate = sale.date;
                } else if (typeof sale.date === 'string') {
                    saleDate = new Date(sale.date);
                } else {
                    return false;
                }
                
                if (isNaN(saleDate)) return false;
                
                saleDate.setHours(0, 0, 0, 0);
                return saleDate.getTime() === selectedDate.getTime();
            });
        }

        setFilteredSales(filtered);
    }, [sales, startDate, endDate, searchQuery, columnFilters, dateFilter]);

    // Analytics function
    const getSalesAnalytics = () => {
        if (!filteredSales || filteredSales.length === 0) {
            return {
                totalSales: 0,
                totalRevenue: {},
                salesByDate: {},
                salesBySellingPoint: {},
                topSellingProducts: {},
                averageOrderValue: {}
            };
        }

        const analytics = {
            totalSales: filteredSales.length,
            totalRevenue: {},
            salesByDate: {},
            salesBySellingPoint: {},
            topSellingProducts: {},
            averageOrderValue: {}
        };

        filteredSales.forEach((sale) => {
            // Calculate total revenue by currency - używamy cash i card
            // Płatności gotówkowe
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0 && cash.currency) {
                        if (!analytics.totalRevenue[cash.currency]) {
                            analytics.totalRevenue[cash.currency] = 0;
                        }
                        analytics.totalRevenue[cash.currency] += cash.price;
                    }
                });
            }
            
            // Płatności kartą
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0 && card.currency) {
                        if (!analytics.totalRevenue[card.currency]) {
                            analytics.totalRevenue[card.currency] = 0;
                        }
                        analytics.totalRevenue[card.currency] += card.price;
                    }
                });
            }

            // Sales by date
            const saleDate = new Date(sale.date).toLocaleDateString();
            if (!analytics.salesByDate[saleDate]) {
                analytics.salesByDate[saleDate] = { count: 0, revenue: {} };
            }
            analytics.salesByDate[saleDate].count++;

            // Sales by selling point
            if (sale.sellingPoint) {
                if (!analytics.salesBySellingPoint[sale.sellingPoint]) {
                    analytics.salesBySellingPoint[sale.sellingPoint] = { count: 0, revenue: {} };
                }
                analytics.salesBySellingPoint[sale.sellingPoint].count++;
            }

            // Top selling products
            if (sale.fullName) {
                if (!analytics.topSellingProducts[sale.fullName]) {
                    analytics.topSellingProducts[sale.fullName] = { count: 0, revenue: {} };
                }
                analytics.topSellingProducts[sale.fullName].count++;
            }
        });

        // Calculate average order value
        Object.keys(analytics.totalRevenue).forEach(currency => {
            analytics.averageOrderValue[currency] = analytics.totalSales > 0 
                ? (analytics.totalRevenue[currency] / analytics.totalSales)
                : 0;
        });

        return analytics;
    };

    const analytics = getSalesAnalytics();

    const handleExportFullPDF = () => {
        // Tworzymy dokument PDF w orientacji landscape
        const doc = new jsPDF('landscape');
        const analytics = getSalesAnalytics();
        
        // Ustaw polską czcionkę i encoding
        doc.setFont('helvetica');
        
        // Nagłówek
        doc.setFontSize(18);
        doc.text('Raport Sprzedazy', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Data raportu: ${new Date().toLocaleDateString('pl-PL')}`, 20, 35);
        doc.text(`Okres: ${startDate ? startDate.toLocaleDateString('pl-PL') : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString('pl-PL') : 'Wszystkie'}`, 20, 45);
        
        // Sekcja podsumowania
        let yPosition = 60;
        doc.setFontSize(12);
        doc.text('Podsumowanie:', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(9);
        doc.text(`Laczna liczba sprzedazy: ${analytics.totalSales}`, 25, yPosition);
        yPosition += 8;
        
        Object.entries(analytics.totalRevenue).forEach(([currency, amount]) => {
            doc.text(`Przychod (${currency}): ${amount.toFixed(2)}`, 25, yPosition);
            yPosition += 8;
        });
        
        yPosition += 10;
        
        // Przygotuj dane do tabeli - takie same jak w handlePrintReport
        const printData = filteredSales.map((sale, index) => {
            const allPayments = [];
            
            // Dodaj płatności gotówkowe
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0 && cash.currency) {
                        allPayments.push(`${cash.price} ${cash.currency} (Gotowka)`);
                    }
                });
            }
            
            // Dodaj płatności kartą
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0 && card.currency) {
                        allPayments.push(`${card.price} ${card.currency} (Karta)`);
                    }
                });
            }
            
            return [
                index + 1,
                sale.fullName || '',
                formatDate(sale.date) || '',
                sale.sellingPoint || '',
                sale.size || '',
                sale.barcode || '',
                allPayments.length > 0 ? allPayments.join(', ') : 'Brak platnosci'
            ];
        });

        // Tabela z danymi
        autoTable(doc, {
            head: [['Lp.', 'Pelna nazwa', 'Data', 'Punkt sprzedazy', 'Rozmiar', 'Kod kreskowy', 'Platnosci']],
            body: printData,
            startY: yPosition + 5,
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                font: 'helvetica',
                textColor: [0, 0, 0]
            },
            headStyles: { 
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' }, // Lp.
                1: { cellWidth: 50 }, // Pełna nazwa
                2: { cellWidth: 35 }, // Data
                3: { cellWidth: 40 }, // Punkt sprzedaży
                4: { cellWidth: 25, halign: 'center' }, // Rozmiar
                5: { cellWidth: 35 }, // Kod kreskowy
                6: { cellWidth: 50 } // Płatności
            },
            margin: { left: 15, right: 15 },
            tableWidth: 'auto',
            pageBreak: 'auto',
            theme: 'striped',
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save('raport_sprzedazy.pdf');
    };

    const handlePrintReport = () => {
        const analytics = getSalesAnalytics();
        
        // Przygotuj dane do drukowania
        const printData = filteredSales.map((sale, index) => {
            const allPayments = [];
            
            // Dodaj płatności gotówkowe
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0 && cash.currency) {
                        allPayments.push(`${cash.price} ${cash.currency} (Gotówka)`);
                    }
                });
            }
            
            // Dodaj płatności kartą
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0 && card.currency) {
                        allPayments.push(`${card.price} ${card.currency} (Karta)`);
                    }
                });
            }
            
            return {
                lp: index + 1,
                fullName: sale.fullName || '',
                date: formatDate(sale.date) || '',
                sellingPoint: sale.sellingPoint || '',
                size: sale.size || '',
                barcode: sale.barcode || '',
                payments: allPayments.length > 0 ? allPayments.join(', ') : 'Brak płatności'
            };
        });

        const newWin = window.open('', '_blank');
        newWin.document.write(`
            <html>
                <head>
                    <title>Raport Sprzedaży</title>
                    <style>
                        @page { 
                            size: A4 landscape; 
                            margin: 1cm; 
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            font-size: 10px;
                            margin: 0;
                            padding: 0;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        .summary {
                            margin-bottom: 20px;
                            background-color: #f9f9f9;
                            padding: 10px;
                            border-radius: 5px;
                        }
                        .summary h3 {
                            margin-top: 0;
                        }
                        table { 
                            border-collapse: collapse; 
                            width: 100%; 
                            font-size: 8px;
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 4px; 
                            text-align: left;
                            vertical-align: top;
                            word-wrap: break-word;
                        }
                        th { 
                            background-color: #2980b9; 
                            color: white;
                            font-weight: bold;
                        }
                        .number { text-align: center; }
                        .payments { max-width: 150px; }
                        .barcode { max-width: 100px; }
                        @media print {
                            body { print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Raport Sprzedaży</h1>
                        <p><strong>Data raportu:</strong> ${new Date().toLocaleDateString('pl-PL')}</p>
                        <p><strong>Okres:</strong> ${startDate ? startDate.toLocaleDateString('pl-PL') : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString('pl-PL') : 'Wszystkie'}</p>
                    </div>
                    
                    <div class="summary">
                        <h3>Podsumowanie:</h3>
                        <p><strong>Łączna liczba sprzedaży:</strong> ${analytics.totalSales}</p>
                        ${Object.entries(analytics.totalRevenue).map(([currency, amount]) => 
                            `<p><strong>Przychód (${currency}):</strong> ${amount.toFixed(2)}</p>`
                        ).join('')}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th class="number">Lp.</th>
                                <th>Pełna nazwa</th>
                                <th>Data</th>
                                <th>Punkt sprzedaży</th>
                                <th>Rozmiar</th>
                                <th class="barcode">Kod kreskowy</th>
                                <th class="payments">Płatności</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData.map(item => `
                                <tr>
                                    <td class="number">${item.lp}</td>
                                    <td>${item.fullName}</td>
                                    <td>${item.date}</td>
                                    <td>${item.sellingPoint}</td>
                                    <td>${item.size}</td>
                                    <td class="barcode">${item.barcode}</td>
                                    <td class="payments">${item.payments}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        newWin.document.close();
        
        // Uruchom drukowanie po załadowaniu
        setTimeout(() => {
            newWin.print();
        }, 500);
    };

    const handleExportExcel = () => {
        const excelData = filteredSales.map((sale, index) => {
            const allPayments = [];
            
            // Dodaj płatności gotówkowe
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0 && cash.currency) {
                        allPayments.push(`${cash.price} ${cash.currency} (Gotówka)`);
                    }
                });
            }
            
            // Dodaj płatności kartą
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0 && card.currency) {
                        allPayments.push(`${card.price} ${card.currency} (Karta)`);
                    }
                });
            }
            
            return {
                'Lp.': index + 1,
                'Pełna nazwa': sale.fullName || '',
                'Data': formatDate(sale.date) || '',
                'Punkt sprzedaży': sale.sellingPoint || '',
                'Rozmiar': sale.size || '',
                'Kod kreskowy': sale.barcode || '',
                'Płatności': allPayments.length > 0 ? allPayments.join(', ') : 'Brak płatności'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sprzedaż');
        XLSX.writeFile(workbook, 'sprzedaz.xlsx');
    };

    const handleDropdownFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }

        const sortedSales = [...filteredSales].sort((a, b) => {
            // Specjalna obsługa sortowania dla numeru porządkowego
            if (key === 'lp') {
                // Sortowanie po oryginalnej kolejności lub odwrócenie
                const indexA = sales.indexOf(a);
                const indexB = sales.indexOf(b);
                if (direction === 'asc') {
                    return indexA - indexB;
                } else {
                    return indexB - indexA;
                }
            }
            
            // Specjalna obsługa sortowania dat
            if (key === 'date') {
                const dateA = new Date(a[key]);
                const dateB = new Date(b[key]);
                if (direction === 'asc') {
                    return dateA - dateB;
                } else {
                    return dateB - dateA;
                }
            }
            
            // Standardowe sortowanie dla innych pól
            let valueA = a[key] || '';
            let valueB = b[key] || '';
            
            // Konwersja na string dla porównania
            if (typeof valueA === 'string') {
                valueA = valueA.toLowerCase();
            }
            if (typeof valueB === 'string') {
                valueB = valueB.toLowerCase();
            }
            
            if (valueA < valueB) {
                return direction === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        setFilteredSales(sortedSales);
        setSortConfig({ key, direction });
    };

    const getUniqueValues = (key) => {
        return [...new Set(sales.map((sale) => sale[key]).filter(Boolean))];
    };

    const csvData = filteredSales.map((sale, index) => ({
        'Lp.': index + 1,
        'Pełna nazwa': sale.fullName || '',
        'Data': formatDate(sale.date) || '',
        'Punkt sprzedaży': sale.sellingPoint || '',
        'Rozmiar': sale.size || '',
        'Kod kreskowy': sale.barcode || '',
        'Płatności': sale.payments ? sale.payments.map(p => `${p.price} ${p.currency}`).join(', ') : ''
    }));

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
                            locale="pl"
                            dateFormat="dd/MM/yyyy"
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
                            locale="pl"
                            dateFormat="dd/MM/yyyy"
                        />
                    </div>
                </div>
                <div style={{ width: '200px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Wyszukaj..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="d-flex justify-content-center mb-3">
                <CSVLink data={csvData} filename="sprzedaz.csv" className="btn btn-primary me-2">
                    Eksportuj CSV
                </CSVLink>
                <button className="btn btn-warning me-2" onClick={handleExportFullPDF}>
                    Eksportuj PDF (Dane + Podsumowanie)
                </button>
                <button className="btn btn-success me-2" onClick={handlePrintReport}>
                    Drukuj Raport
                </button>
                <button className="btn btn-info" onClick={handleExportExcel}>
                    Eksportuj Excel
                </button>
            </div>

            <div id="sales-report-content" className={styles.tableContainer}>
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')}>
                                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <DatePicker
                                    selected={dateFilter}
                                    onChange={(date) => setDateFilter(date)}
                                    className="form-control form-control-sm mt-1"
                                    placeholderText="Wybierz datę"
                                    dateFormat="dd.MM.yyyy"
                                    locale="pl"
                                    isClearable
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('sellingPoint')}>
                                Punkt sprzedaży {sortConfig.key === 'sellingPoint' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <select
                                    className="form-control form-control-sm mt-1"
                                    onChange={(e) => handleDropdownFilterChange('sellingPoint', e.target.value)}
                                >
                                    <option value="">Wszystkie</option>
                                    {getUniqueValues('sellingPoint').map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('size')}>
                                Rozmiar {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <select
                                    className="form-control form-control-sm mt-1"
                                    onChange={(e) => handleDropdownFilterChange('size', e.target.value)}
                                >
                                    <option value="">Wszystkie</option>
                                    {getUniqueValues('size').map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('payments')}>
                                Płatności {sortConfig.key === 'payments' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length > 0 ? (
                            filteredSales.map((sale, index) => (
                                <tr key={sale._id || index}>
                                    <td>{index + 1}</td>
                                    <td>{sale.fullName}</td>
                                    <td>{formatDate(sale.date)}</td>
                                    <td>{sale.sellingPoint}</td>
                                    <td>{sale.size}</td>
                                    <td>{sale.barcode}</td>
                                    <td>
                                        {(() => {
                                            const allPayments = [];
                                            
                                            // Dodaj płatności gotówkowe
                                            if (sale.cash && Array.isArray(sale.cash)) {
                                                sale.cash.forEach(cash => {
                                                    if (cash.price && cash.price > 0 && cash.currency) {
                                                        allPayments.push(`${cash.price} ${cash.currency} (Gotówka)`);
                                                    }
                                                });
                                            }
                                            
                                            // Dodaj płatności kartą
                                            if (sale.card && Array.isArray(sale.card)) {
                                                sale.card.forEach(card => {
                                                    if (card.price && card.price > 0 && card.currency) {
                                                        allPayments.push(`${card.price} ${card.currency} (Karta)`);
                                                    }
                                                });
                                            }
                                            
                                            return allPayments.length > 0 
                                                ? allPayments.map((payment, i) => (
                                                    <div key={i}>{payment}</div>
                                                  ))
                                                : 'Brak płatności';
                                        })()}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">
                                    {error ? error : 'Brak danych sprzedaży'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7" className="text-center">
                                <strong>Łączne przychody: </strong>
                                {Object.entries(analytics.totalRevenue).map((item, index) => (
                                    <div key={index}>
                                        {item[1].toFixed(2)} {item[0]}
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