import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Button, Modal, ModalHeader, ModalBody, FormGroup, Label, ModalFooter, Spinner } from 'reactstrap';
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
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState([
        {
            startDate: null,
            endDate: null,
            key: 'selection'
        }
    ]);

    // Sales report modal states
    const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState(false);
    const [salesReportDateRange, setSalesReportDateRange] = useState([{ startDate: new Date(), endDate: new Date(), key: 'selection' }]);
    const [selectedFiltersForSalesReport, setSelectedFiltersForSalesReport] = useState([]);
    const [selectedProductForSalesReport, setSelectedProductForSalesReport] = useState(null);
    const [selectedCategoryForSalesReport, setSelectedCategoryForSalesReport] = useState(null);
    const [selectedManufacturerForSalesReport, setSelectedManufacturerForSalesReport] = useState(null);
    const [selectedSizeForSalesReport, setSelectedSizeForSalesReport] = useState(null);
    const [selectedSellingPointForSalesReport, setSelectedSellingPointForSalesReport] = useState(null);
    const [salesReportLoading, setSalesReportLoading] = useState(false);
    
    // Data for dropdowns (same as Warehouse)
    const [goods, setGoods] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [availableSizes, setAvailableSizes] = useState([]);

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

    // Fetch data for report dropdowns
    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // Fetch goods for product dropdown
                const goodsResponse = await axios.get('/api/excel/goods/get-all-goods');
                if (Array.isArray(goodsResponse.data.goods)) {
                    setGoods(goodsResponse.data.goods);
                }

                // Fetch manufacturers
                const manufacturersResponse = await axios.get('/api/excel/manufacturers');
                if (Array.isArray(manufacturersResponse.data.manufacturers)) {
                    setManufacturers(manufacturersResponse.data.manufacturers);
                }

                // Fetch sizes
                const sizesResponse = await axios.get('/api/excel/size/get-all-sizes');
                if (Array.isArray(sizesResponse.data.sizes)) {
                    const formattedSizes = sizesResponse.data.sizes.map(size => ({
                        value: size._id,
                        label: size.Roz_Opis
                    }));
                    setAvailableSizes(formattedSizes);
                }
            } catch (error) {
                console.error('Error fetching report data:', error);
            }
        };

        fetchReportData();
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
                // For dropdown filters (size, sellingPoint) use exact match
                if (key === 'size' || key === 'sellingPoint') {
                    filtered = filtered.filter((sale) =>
                        String(sale[key] || '').toLowerCase() === columnFilters[key].toLowerCase()
                    );
                } else {
                    // For text filters use includes
                    filtered = filtered.filter((sale) =>
                        String(sale[key] || '')
                            .toLowerCase()
                            .includes(columnFilters[key].toLowerCase())
                    );
                }
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

    // Close date picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDatePicker && !event.target.closest('.date-picker-container')) {
                setShowDatePicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker]);

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

    // Custom static ranges dla DateRangePicker (skopiowane z Warehouse)
    const customStaticRanges = originalStaticRanges.map((range) => {
        if (range.label === 'Today') {
            return { ...range, label: 'Dzisiaj' };
        }
        if (range.label === 'Yesterday') {
            return { ...range, label: 'Wczoraj' };
        }
        if (range.label === 'This Week') {
            return { ...range, label: 'Ten tydzień' };
        }
        if (range.label === 'Last Week') {
            return { ...range, label: 'Poprzedni tydzień' };
        }
        if (range.label === 'This Month') {
            return { ...range, label: 'Ten miesiąc' };
        }
        if (range.label === 'Last Month') {
            return { ...range, label: 'Poprzedni miesiąc' };
        }
        return range;
    });

    const customInputRanges = originalInputRanges.map((range) => {
        if (range.label === 'days up to today') {
            return { ...range, label: 'dni do dzisiaj' };
        }
        if (range.label === 'days starting today') {
            return { ...range, label: 'dni od dzisiaj' };
        }
        return range;
    });

    // Toggle modal functions
    const toggleSalesReportModal = () => setIsSalesReportModalOpen(!isSalesReportModalOpen);

    // Handle sales report button click
    const handleSalesReport = () => {
        setIsSalesReportModalOpen(true);
    };

    // Generate sales report function
    const generateSalesReport = async () => {
        setSalesReportLoading(true);
        try {
            const startDate = salesReportDateRange[0].startDate;
            const endDate = salesReportDateRange[0].endDate;
            
            if (!startDate || !endDate) {
                alert('Proszę wybrać zakres dat');
                setSalesReportLoading(false);
                return;
            }
            
            await generateSalesReportPDF(startDate, endDate);
        } catch (error) {
            console.error('Error generating sales report:', error);
            alert('Błąd podczas generowania raportu sprzedaży');
        } finally {
            setSalesReportLoading(false);
        }
    };

    // Generate sales report PDF
    const generateSalesReportPDF = async (startDate, endDate) => {
        // Tu będzie logika generowania PDF raportu sprzedaży z filtrami
        console.log('Generowanie raportu sprzedaży:', { startDate, endDate, selectedFiltersForSalesReport });
        
        // Zamknij modal po wygenerowaniu
        setIsSalesReportModalOpen(false);
        
        // Wywołaj funkcję z właściwymi datami
        handleExportFullPDF(startDate, endDate);
    };

    const analytics = getSalesAnalytics();

    const handleExportFullPDF = (reportStartDate = null, reportEndDate = null) => {
        // Tworzymy dokument PDF w orientacji portrait (pionowa)
        const doc = new jsPDF('portrait');
        const analytics = getSalesAnalytics();
        
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
        
        // Ustaw czcionkę
        doc.setFont('helvetica', 'normal');
        
        // Nagłówek - wycentrowany
        const pageWidth = doc.internal.pageSize.width;
        
        doc.setFontSize(18);
        doc.text(convertPolishChars('Raport Sprzedaży'), pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(convertPolishChars(`Data raportu: ${new Date().toLocaleDateString('pl-PL')}`), pageWidth / 2, 35, { align: 'center' });
        doc.text(convertPolishChars(`Okres: ${reportStartDate ? reportStartDate.toLocaleDateString('pl-PL') : 'Wszystkie'} - ${reportEndDate ? reportEndDate.toLocaleDateString('pl-PL') : 'Wszystkie'}`), pageWidth / 2, 45, { align: 'center' });
        
        // Przygotuj tekst filtrów - zawsze zaczynaj od "Wszystkie produkty"
        const filtersList = ['Wszystkie produkty'];
        
        // Dodaj filtry które zostały wybrane
        if (selectedFiltersForSalesReport && selectedFiltersForSalesReport.length > 0) {
            selectedFiltersForSalesReport.forEach(filter => {
                switch(filter.value) {
                    case 'product':
                        if (selectedProductForSalesReport) {
                            filtersList.push(selectedProductForSalesReport.label);
                        }
                        break;
                    case 'category':
                        if (selectedCategoryForSalesReport) {
                            filtersList.push(selectedCategoryForSalesReport.label);
                        }
                        break;
                    case 'manufacturer':
                        if (selectedManufacturerForSalesReport) {
                            filtersList.push(selectedManufacturerForSalesReport.label || selectedManufacturerForSalesReport.Prod_Opis);
                        }
                        break;
                    case 'size':
                        if (selectedSizeForSalesReport) {
                            filtersList.push(selectedSizeForSalesReport.label);
                        }
                        break;
                    case 'sellingPoint':
                        if (selectedSellingPointForSalesReport) {
                            filtersList.push(selectedSellingPointForSalesReport.label);
                        }
                        break;
                }
            });
        }
        
        // Wyświetl filtry
        const filterText = convertPolishChars(`Filtry: ${filtersList.join(', ')}`);
        doc.text(filterText, pageWidth / 2, 55, { align: 'center' });
        
        // Pozycja startowa tabeli (z uwzględnieniem filtrów)
        let yPosition = 70;
        
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
                convertPolishChars(sale.fullName || ''),
                convertPolishChars(sale.date ? new Date(sale.date).toLocaleDateString('pl-PL') : ''),
                convertPolishChars(sale.sellingPoint || ''),
                convertPolishChars(sale.size || ''),
                convertPolishChars(sale.barcode || ''),
                convertPolishChars(allPayments.length > 0 ? allPayments.join(', ') : 'Brak platnosci')
            ];
        });

        // Tabela z danymi - wycentrowana (dostosowana do orientacji pionowej)
        const tableWidth = 15 + 35 + 20 + 30 + 20 + 35 + 30; // Suma szerokości kolumn = 185
        const leftMargin = (pageWidth - tableWidth) / 2; // Wycentrowanie

        autoTable(doc, {
            head: [[
                convertPolishChars('Lp.'), 
                convertPolishChars('Pełna nazwa'), 
                convertPolishChars('Data'), 
                convertPolishChars('Punkt sprzedaży'), 
                convertPolishChars('Rozmiar'), 
                convertPolishChars('Kod kreskowy'), 
                convertPolishChars('Płatności')
            ]],
            body: printData,
            startY: yPosition + 5,
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                font: 'helvetica',
                fontStyle: 'normal',
                textColor: [0, 0, 0],
                charset: 'unicode'
            },
            headStyles: { 
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' }, // Lp.
                1: { cellWidth: 35, halign: 'center' }, // Pełna nazwa
                2: { cellWidth: 20, halign: 'center' }, // Data (bez godzin)
                3: { cellWidth: 30, halign: 'center' }, // Punkt sprzedaży
                4: { cellWidth: 20, halign: 'center' }, // Rozmiar
                5: { cellWidth: 35, halign: 'center' }, // Kod kreskowy (szerszy)
                6: { cellWidth: 30, halign: 'center' } // Płatności
            },
            margin: { left: leftMargin, right: leftMargin },
            tableWidth: 'auto',
            pageBreak: 'auto',
            theme: 'striped',
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // Sekcja podsumowania - hierarchia produktów
        const finalY = doc.lastAutoTable.finalY || yPosition + 50;
        let summaryY = finalY + 20;

        // Sprawdź czy jest wystarczająco miejsca na sekcję podsumowania
        const pageHeight = doc.internal.pageSize.height;
        const remainingSpace = pageHeight - summaryY;
        
        // Jeśli mało miejsca (mniej niż 80mm), przejdź na nową stronę
        if (remainingSpace < 80) {
            doc.addPage();
            summaryY = 20;
        }

        // Przygotuj statystyki produktów
        const productStats = {};
        filteredSales.forEach(sale => {
            const productName = sale.fullName || 'Nieznany produkt';
            if (!productStats[productName]) {
                productStats[productName] = {
                    name: productName,
                    count: 0,
                    revenue: 0
                };
            }
            productStats[productName].count++;
            
            // Oblicz przychód z tej sprzedaży
            let saleRevenue = 0;
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0) {
                        saleRevenue += cash.price;
                    }
                });
            }
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0) {
                        saleRevenue += card.price;
                    }
                });
            }
            productStats[productName].revenue += saleRevenue;
        });

        // Sortuj produkty według liczby sprzedaży (malejąco)
        const sortedProducts = Object.values(productStats)
            .sort((a, b) => b.count - a.count);

        // Nagłówek sekcji podsumowania
        doc.setFontSize(14);
        doc.text(convertPolishChars('PODSUMOWANIE SPRZEDAZY'), pageWidth / 2, summaryY, { align: 'center' });
        summaryY += 15;

        doc.setFontSize(12);
        doc.text(convertPolishChars('Hierarchia produktow (od najlepszego do najgorszego):'), pageWidth / 2, summaryY, { align: 'center' });
        summaryY += 10;

        // Tabela z hierarchią produktów
        const hierarchyTableData = sortedProducts.map((product, index) => [
            index + 1,
            convertPolishChars(product.name),
            product.count,
            `${product.revenue.toFixed(2)} PLN`
        ]);

        const hierarchyTableWidth = 20 + 60 + 25 + 35; // Suma szerokości kolumn = 140
        const hierarchyLeftMargin = (pageWidth - hierarchyTableWidth) / 2;

        autoTable(doc, {
            head: [[
                convertPolishChars('Pozycja'),
                convertPolishChars('Nazwa produktu'),
                convertPolishChars('Ilosc sprzedana'),
                convertPolishChars('Przychod')
            ]],
            body: hierarchyTableData,
            startY: summaryY,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: 'linebreak',
                font: 'helvetica',
                fontStyle: 'normal',
                textColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [52, 152, 219],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' }, // Pozycja
                1: { cellWidth: 60, halign: 'center' }, // Nazwa produktu
                2: { cellWidth: 25, halign: 'center' }, // Ilość sprzedana
                3: { cellWidth: 35, halign: 'center' }  // Przychód
            },
            margin: { left: hierarchyLeftMargin, right: hierarchyLeftMargin },
            tableWidth: 'auto',
            theme: 'grid',
            alternateRowStyles: { fillColor: [240, 248, 255] },
            pageBreak: 'auto',
            showHead: 'everyPage'
        });

        // Sekcja hierarchii punktów sprzedaży
        const storesFinalY = doc.lastAutoTable.finalY || summaryY + 100;
        let storesY = storesFinalY + 15;

        // Sprawdź czy jest wystarczająco miejsca na tabelę punktów sprzedaży
        const storesRemainingSpace = pageHeight - storesY;
        
        // Jeśli mało miejsca (mniej niż 60mm), przejdź na nową stronę
        if (storesRemainingSpace < 60) {
            doc.addPage();
            storesY = 20;
        }

        // Przygotuj statystyki punktów sprzedaży
        const storeStats = {};
        filteredSales.forEach(sale => {
            const storeName = sale.sellingPoint || 'Nieznany punkt sprzedazy';
            if (!storeStats[storeName]) {
                storeStats[storeName] = {
                    name: storeName,
                    count: 0,
                    revenue: 0
                };
            }
            storeStats[storeName].count++;
            
            // Oblicz przychód z tej sprzedaży
            let saleRevenue = 0;
            if (sale.cash && Array.isArray(sale.cash)) {
                sale.cash.forEach(cash => {
                    if (cash.price && cash.price > 0) {
                        saleRevenue += cash.price;
                    }
                });
            }
            if (sale.card && Array.isArray(sale.card)) {
                sale.card.forEach(card => {
                    if (card.price && card.price > 0) {
                        saleRevenue += card.price;
                    }
                });
            }
            storeStats[storeName].revenue += saleRevenue;
        });

        // Sortuj punkty sprzedaży według liczby sprzedaży (malejąco)
        const sortedStores = Object.values(storeStats)
            .sort((a, b) => b.count - a.count);

        // Nagłówek sekcji punktów sprzedaży
        doc.setFontSize(12);
        doc.text(convertPolishChars('Hierarchia punktow sprzedazy (od najlepszego do najgorszego):'), pageWidth / 2, storesY, { align: 'center' });
        storesY += 8;

        // Tabela z hierarchią punktów sprzedaży
        const storesTableData = sortedStores.map((store, index) => [
            index + 1,
            convertPolishChars(store.name),
            store.count,
            `${store.revenue.toFixed(2)} PLN`
        ]);

        autoTable(doc, {
            head: [[
                convertPolishChars('Pozycja'),
                convertPolishChars('Punkt sprzedazy'),
                convertPolishChars('Ilosc sprzedana'),
                convertPolishChars('Przychod')
            ]],
            body: storesTableData,
            startY: storesY,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: 'linebreak',
                font: 'helvetica',
                fontStyle: 'normal',
                textColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [46, 204, 113],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' }, // Pozycja
                1: { cellWidth: 60, halign: 'center' }, // Punkt sprzedaży
                2: { cellWidth: 25, halign: 'center' }, // Ilość sprzedana
                3: { cellWidth: 35, halign: 'center' }  // Przychód
            },
            margin: { left: hierarchyLeftMargin, right: hierarchyLeftMargin },
            tableWidth: 'auto',
            theme: 'grid',
            alternateRowStyles: { fillColor: [232, 245, 233] },
            pageBreak: 'auto',
            showHead: 'everyPage'
        });

        // Otwórz PDF w nowym oknie i od razu wyświetl dialog drukowania
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        
        printWindow.addEventListener('load', () => {
            printWindow.print();
        });
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
        if (value === '') {
            // If "Wszystkie" is selected, remove the filter
            setColumnFilters((prevFilters) => {
                const newFilters = { ...prevFilters };
                delete newFilters[key];
                return newFilters;
            });
        } else {
            setColumnFilters((prevFilters) => ({
                ...prevFilters,
                [key]: value,
            }));
        }
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

    const handleDateRangeChange = (ranges) => {
        const { startDate, endDate } = ranges.selection;
        setDateRange([ranges.selection]);
        setStartDate(startDate);
        setEndDate(endDate);
    };

    const toggleDatePicker = () => {
        setShowDatePicker(!showDatePicker);
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
            <div className="d-flex justify-content-center align-items-center mb-3">
                <CSVLink data={csvData} filename="sprzedaz.csv" className="btn btn-primary me-2">
                    Eksportuj CSV
                </CSVLink>
                <button className="btn btn-warning me-2" onClick={handleExportFullPDF}>
                    Eksportuj PDF (Dane + Podsumowanie)
                </button>
                <button className="btn btn-success me-2" onClick={handleSalesReport}>
                    Drukuj Raport
                </button>
                <button className="btn btn-info me-3" onClick={handleExportExcel}>
                    Eksportuj Excel
                </button>
                <div className="d-flex align-items-center date-picker-container" style={{ position: 'relative' }}>
                    <div style={{ width: '200px' }} className="me-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Wyszukaj..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        className="btn btn-outline-secondary" 
                        onClick={toggleDatePicker}
                        style={{ minWidth: '40px' }}
                        title={`Wybierz zakres dat ${startDate && endDate ? `(${startDate.toLocaleDateString('pl-PL')} - ${endDate.toLocaleDateString('pl-PL')})` : ''}`}
                    >
                        📅
                    </button>
                    {showDatePicker && (
                        <div style={{
                            position: 'absolute',
                            top: '45px',
                            right: '0',
                            zIndex: 1000,
                            backgroundColor: 'white',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                            <DateRangePicker
                                ranges={dateRange}
                                onChange={handleDateRangeChange}
                                locale={pl}
                                dateDisplayFormat="dd/MM/yyyy"
                                showSelectionPreview={true}
                                moveRangeOnFirstSelection={false}
                                months={2}
                                direction="horizontal"
                            />
                            <div className="p-2 text-center border-top" style={{ backgroundColor: '#000', color: '#fff' }}>
                                <button 
                                    className="btn btn-sm btn-success me-2"
                                    onClick={() => {
                                        setStartDate(null);
                                        setEndDate(null);
                                        setDateRange([{
                                            startDate: null,
                                            endDate: null,
                                            key: 'selection'
                                        }]);
                                    }}
                                >
                                    Wyczyść
                                </button>
                                <button 
                                    className="btn btn-sm btn-light"
                                    onClick={() => setShowDatePicker(false)}
                                >
                                    Zamknij
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div id="sales-report-content" className={styles.tableContainer}>
                <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
                    <caption className={styles.caption}>Tabela przedstawiająca dane sprzedaży w systemie</caption>
                    <thead>
                        <tr>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('lp')} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                Lp. {sortConfig.key === 'lp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`}>
                                <span onClick={() => handleSort('sellingPoint')} style={{ cursor: 'pointer' }}>
                                    Punkt sprzedaży {sortConfig.key === 'sellingPoint' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </span>
                                <select
                                    className="form-control form-control-sm mt-1"
                                    value={columnFilters.sellingPoint || ''}
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`}>
                                <span onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                                    Rozmiar {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </span>
                                <select
                                    className="form-control form-control-sm mt-1"
                                    value={columnFilters.size || ''}
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
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('payments')} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
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

            {/* Sales Report Modal */}
            <Modal isOpen={isSalesReportModalOpen} toggle={toggleSalesReportModal} size="lg">
                <ModalHeader toggle={toggleSalesReportModal}>
                    Raport Sprzedaży
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="salesReportDateRange">Zakres dat:</Label>
                        <DateRangePicker
                            ranges={salesReportDateRange}
                            onChange={(ranges) => setSalesReportDateRange([ranges.selection])}
                            locale={pl}
                            rangeColors={['#3d91ff']}
                            staticRanges={customStaticRanges}
                            inputRanges={customInputRanges}
                        />
                    </FormGroup>
                    
                    <FormGroup>
                        <Label for="salesFilterSelect">Wybierz filtry:</Label>
                        <Select
                            isMulti
                            value={selectedFiltersForSalesReport}
                            onChange={setSelectedFiltersForSalesReport}
                            options={[
                                { value: 'all', label: 'Wszystkie produkty' },
                                { value: 'category', label: 'Filtruj według kategorii' },
                                { value: 'manufacturer', label: 'Filtruj według grupy' },
                                { value: 'size', label: 'Filtruj według rozmiaru' },
                                { value: 'sellingPoint', label: 'Filtruj według punktu sprzedaży' },
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
                    
                    {selectedFiltersForSalesReport.some(filter => filter.value === 'category') && (
                        <FormGroup>
                            <Label for="salesCategorySelect">Wybierz kategorię:</Label>
                            <Select
                                value={selectedCategoryForSalesReport}
                                onChange={setSelectedCategoryForSalesReport}
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
                    
                    {selectedFiltersForSalesReport.some(filter => filter.value === 'sellingPoint') && (
                        <FormGroup>
                            <Label for="salesSellingPointSelect">Wybierz punkt sprzedaży:</Label>
                            <Select
                                value={selectedSellingPointForSalesReport}
                                onChange={setSelectedSellingPointForSalesReport}
                                options={getUniqueValues('sellingPoint').map(point => ({
                                    value: point,
                                    label: point
                                }))}
                                placeholder="Wybierz punkt sprzedaży..."
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
                    
                    {selectedFiltersForSalesReport.some(filter => filter.value === 'manufacturer') && (
                        <FormGroup>
                            <Label for="salesManufacturerSelect">Wybierz grupę:</Label>
                            <Select
                                value={selectedManufacturerForSalesReport}
                                onChange={setSelectedManufacturerForSalesReport}
                                options={manufacturers.map(manufacturer => ({
                                    value: manufacturer._id,
                                    label: manufacturer.Prod_Opis || manufacturer.Prod_Kod
                                }))}
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
                    
                    {selectedFiltersForSalesReport.some(filter => filter.value === 'size') && (
                        <FormGroup>
                            <Label for="salesSizeSelect">Wybierz rozmiar:</Label>
                            <Select
                                value={selectedSizeForSalesReport}
                                onChange={setSelectedSizeForSalesReport}
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
                    
                    {selectedFiltersForSalesReport.some(filter => filter.value === 'specific') && (
                        <FormGroup>
                            <Label for="salesProductSelect">Wybierz produkt:</Label>
                            <Select
                                value={selectedProductForSalesReport}
                                onChange={setSelectedProductForSalesReport}
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
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="primary" 
                        onClick={generateSalesReport}
                        disabled={salesReportLoading}
                    >
                        {salesReportLoading ? <Spinner size="sm" /> : 'Drukuj raport'}
                    </Button>
                    <Button color="secondary" onClick={toggleSalesReportModal}>
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Sales;