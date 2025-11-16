import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DateRangePicker, defaultStaticRanges as originalStaticRanges, defaultInputRanges as originalInputRanges } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { pl } from 'date-fns/locale';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Spinner, FormGroup, Label } from 'reactstrap';
import styles from '../Warehouse/Warehouse.module.css';

const Cudzich = () => {
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateRange, setDateRange] = useState([
        {
            startDate: null,
            endDate: null,
            key: 'selection'
        }
    ]);
    const [balance, setBalance] = useState(0);
    
    // Report modal states
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportDateRange, setReportDateRange] = useState([
        {
            startDate: null,
            endDate: null,
            key: 'selection'
        }
    ]);
    
    // Report filters
    const [selectedFiltersForReport, setSelectedFiltersForReport] = useState([]);
    const [reportTransactionTypes, setReportTransactionTypes] = useState([]);
    const [selectedProductForReport, setSelectedProductForReport] = useState(null);
    const [selectedSizeForReport, setSelectedSizeForReport] = useState(null);
    const [reportProductName, setReportProductName] = useState('');
    const [reportSize, setReportSize] = useState('');
    
    // Options for selects
    const [productOptions, setProductOptions] = useState([]);
    const [sizeOptions, setSizeOptions] = useState([]);
    
    // Transaction type options for filter
    const transactionTypeOptions = [
        { value: 'odbior', label: 'Odbiór' },
        { value: 'zwrot', label: 'Zwrot' },
        { value: 'wplata', label: 'Wpłata' },
        { value: 'wyplata', label: 'Wypłata' }
    ];

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

    // Format transaction type for display
    const formatTransactionType = (type) => {
        const typeMap = {
            'odbior': 'Odbiór',
            'zwrot': 'Zwrot',
            'wplata': 'Wpłata',
            'wyplata': 'Wypłata'
        };
        return typeMap[type] || type;
    };

    // Get transaction type color
    const getTransactionTypeColor = (type) => {
        const colorMap = {
            'odbior': '#51cf66', // green
            'zwrot': '#ff6b6b', // red
            'wplata': '#339af0', // blue
            'wyplata': '#ffa94d'  // orange
        };
        return colorMap[type] || '#ffffff';
    };

    // Fetch transactions data on component mount
    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);
                const response = await axios.get('/api/cudzich/transactions');
                if (Array.isArray(response.data)) {
                    setTransactions(response.data);
                    setFilteredTransactions(response.data);
                } else {
                    console.error('Transactions data is not an array:', response.data);
                    setTransactions([]);
                    setFilteredTransactions([]);
                }
            } catch (error) {
                console.error('Error fetching transactions:', error);
                setError('Błąd podczas pobierania transakcji. Spróbuj ponownie później.');
                setTransactions([]);
                setFilteredTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        const fetchBalance = async () => {
            try {
                const response = await axios.get('/api/cudzich/balance');
                setBalance(response.data.balance || 0);
            } catch (error) {
                console.error('Error fetching balance:', error);
            }
        };
        
        fetchTransactions();
        fetchBalance();
        
        // Auto refresh data every 30 seconds
        const interval = setInterval(() => {
            fetchTransactions();
            fetchBalance();
        }, 30000);
        
        return () => {
            clearInterval(interval);
        };
    }, []);

    // Generate options for selects based on transactions data
    useEffect(() => {
        if (transactions.length > 0) {
            // Generate unique product names
            const uniqueProducts = [...new Set(
                transactions
                    .filter(t => t.productName && t.productName.trim())
                    .map(t => t.productName.trim())
            )].sort();
            
            const productOpts = uniqueProducts.map(name => ({
                value: name,
                label: name
            }));
            setProductOptions(productOpts);
            
            // Generate unique sizes
            const uniqueSizes = [...new Set(
                transactions
                    .filter(t => t.size && t.size.trim())
                    .map(t => t.size.trim())
            )].sort();
            
            const sizeOpts = uniqueSizes.map(size => ({
                value: size,
                label: size
            }));
            setSizeOptions(sizeOpts);
        }
    }, [transactions]);

    // Filter transactions based on various criteria
    useEffect(() => {
        let filtered = [...transactions];
        
        // Filter by date range
        if (startDate && endDate) {
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter((transaction) => {
                if (!transaction.date) {
                    return false;
                }
                
                let transactionDate;
                if (transaction.date instanceof Date) {
                    transactionDate = transaction.date;
                } else if (typeof transaction.date === 'string') {
                    transactionDate = new Date(transaction.date);
                } else {
                    return false;
                }
                
                if (isNaN(transactionDate)) {
                    return false;
                }
                
                const transactionDateStartOfDay = new Date(transactionDate);
                transactionDateStartOfDay.setHours(0, 0, 0, 0);
                
                return transactionDateStartOfDay >= startOfDay && transactionDateStartOfDay <= endOfDay;
            });
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((transaction) =>
                Object.values(transaction)
                    .join(' ')
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
            );
        }

        // Apply column filters
        Object.keys(columnFilters).forEach((key) => {
            if (columnFilters[key]) {
                filtered = filtered.filter((transaction) =>
                    String(transaction[key] || '')
                        .toLowerCase()
                        .includes(columnFilters[key].toLowerCase())
                );
            }
        });

        setFilteredTransactions(filtered);
    }, [transactions, startDate, endDate, searchQuery, columnFilters]);

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

    // Calculate analytics
    const getTransactionAnalytics = () => {
        if (!filteredTransactions || filteredTransactions.length === 0) {
            return {
                totalTransactions: 0,
                transactionsByType: {},
                totalValue: 0,
                netBalance: 0
            };
        }

        const analytics = {
            totalTransactions: filteredTransactions.length,
            transactionsByType: {},
            totalValue: 0,
            netBalance: 0
        };

        filteredTransactions.forEach((transaction) => {
            // Count by type
            const type = transaction.type;
            if (!analytics.transactionsByType[type]) {
                analytics.transactionsByType[type] = 0;
            }
            analytics.transactionsByType[type]++;

            // Calculate total value and balance
            const price = transaction.price || 0;
            analytics.totalValue += Math.abs(price);

            // Calculate net balance (odbiór and wpłata add, zwrot and wypłata subtract)
            if (type === 'odbior' || type === 'wplata') {
                analytics.netBalance += price;
            } else if (type === 'zwrot' || type === 'wyplata') {
                analytics.netBalance -= price;
            }
        });

        return analytics;
    };

    // Custom static ranges for DateRangePicker
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

    // Export functions
    const handleExportPDF = () => {
        const doc = new jsPDF('portrait');
        const analytics = getTransactionAnalytics();
        
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
        
        // Set font
        doc.setFont('helvetica', 'normal');
        
        // Header
        const pageWidth = doc.internal.pageSize.width;
        
        doc.setFontSize(18);
        doc.text(convertPolishChars('Raport Transakcji Cudzich'), pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(convertPolishChars(`Data raportu: ${new Date().toLocaleDateString('pl-PL')}`), pageWidth / 2, 35, { align: 'center' });
        doc.text(convertPolishChars(`Okres: ${startDate ? startDate.toLocaleDateString('pl-PL') : 'Wszystkie'} - ${endDate ? endDate.toLocaleDateString('pl-PL') : 'Wszystkie'}`), pageWidth / 2, 45, { align: 'center' });
        doc.text(convertPolishChars(`Saldo: ${balance.toFixed(2)} PLN`), pageWidth / 2, 55, { align: 'center' });
        
        // Prepare data for table
        const printData = filteredTransactions.map((transaction, index) => [
            index + 1,
            convertPolishChars(formatTransactionType(transaction.type)),
            convertPolishChars(transaction.productName || '-'),
            convertPolishChars(transaction.size || '-'),
            convertPolishChars(`${transaction.price || 0} PLN`),
            convertPolishChars(formatDate(transaction.date)),
            convertPolishChars(transaction.notes || '-')
        ]);

        // Table with data
        autoTable(doc, {
            head: [[
                convertPolishChars('Lp.'), 
                convertPolishChars('Typ'), 
                convertPolishChars('Produkt'), 
                convertPolishChars('Rozmiar'), 
                convertPolishChars('Cena'), 
                convertPolishChars('Data'), 
                convertPolishChars('Uwagi')
            ]],
            body: printData,
            startY: 70,
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                font: 'helvetica',
                fontStyle: 'normal',
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
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 35, halign: 'center' },
                6: { cellWidth: 30, halign: 'center' }
            },
            theme: 'striped',
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // Open PDF in new window
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        
        printWindow.addEventListener('load', () => {
            printWindow.print();
        });
    };

    const handleExportExcel = () => {
        const excelData = filteredTransactions.map((transaction, index) => ({
            'Lp.': index + 1,
            'Typ': formatTransactionType(transaction.type),
            'Produkt': transaction.productName || '-',
            'Rozmiar': transaction.size || '-',
            'Cena': `${transaction.price || 0} PLN`,
            'Data': formatDate(transaction.date),
            'Uwagi': transaction.notes || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transakcje Cudzich');
        XLSX.writeFile(workbook, 'transakcje_cudzich.xlsx');
    };

    // Handle report modal
    const handleCudzichReport = () => {
        setIsReportModalOpen(true);
    };

    // Generate Cudzich report
    const generateCudzichReport = async () => {
        setReportLoading(true);
        try {
            let startDate = reportDateRange[0].startDate;
            let endDate = reportDateRange[0].endDate;
            
            // If no dates selected, use all available data
            if (!startDate || !endDate) {
                // Use the earliest and latest dates from transactions, or default range
                if (transactions.length > 0) {
                    const dates = transactions.map(t => new Date(t.date)).filter(d => !isNaN(d));
                    if (dates.length > 0) {
                        startDate = new Date(Math.min(...dates));
                        endDate = new Date(Math.max(...dates));
                    } else {
                        // If no valid dates, use current month
                        const now = new Date();
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    }
                } else {
                    // If no transactions, use current month
                    const now = new Date();
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                }
            }
            
            // Filter transactions based on report criteria
            let filteredReportData = [...transactions];
            
            // Filter by date range
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            filteredReportData = filteredReportData.filter((transaction) => {
                if (!transaction.date) return false;
                
                const transactionDate = new Date(transaction.date);
                if (isNaN(transactionDate)) return false;
                
                const transactionDateStartOfDay = new Date(transactionDate);
                transactionDateStartOfDay.setHours(0, 0, 0, 0);
                
                return transactionDateStartOfDay >= startOfDay && transactionDateStartOfDay <= endOfDay;
            });
            
            // Apply filters based on selected filter options
            const selectedFilters = selectedFiltersForReport.map(f => f.value);
            
            // Filter by transaction types (only if filter is selected)
            if (selectedFilters.includes('transactionType') && reportTransactionTypes.length > 0) {
                const selectedTypes = reportTransactionTypes.map(t => t.value);
                filteredReportData = filteredReportData.filter(transaction => 
                    selectedTypes.includes(transaction.type)
                );
            }
            
            // Filter by product name (if filter is selected)
            if ((selectedFilters.includes('productName') || selectedFilters.includes('specific')) && selectedProductForReport) {
                filteredReportData = filteredReportData.filter(transaction =>
                    transaction.productName && 
                    transaction.productName === selectedProductForReport.value
                );
            }
            
            // Filter by size (if filter is selected)
            if ((selectedFilters.includes('size') || selectedFilters.includes('specific')) && selectedSizeForReport) {
                filteredReportData = filteredReportData.filter(transaction =>
                    transaction.size && 
                    transaction.size === selectedSizeForReport.value
                );
            }
            
            // Generate PDF report
            generateCudzichReportPDF(filteredReportData, startDate, endDate);
            
        } catch (error) {
            console.error('Error generating Cudzich report:', error);
            alert('Błąd podczas generowania raportu: ' + (error.message || 'Nieznany błąd'));
        } finally {
            setReportLoading(false);
        }
    };

    // Generate PDF report for Cudzich transactions
    const generateCudzichReportPDF = (data, startDate, endDate) => {
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
        const titleText = convertPolishChars('Raport Transakcji Cudzich');
        const titleWidth = doc.getTextWidth(titleText);
        doc.text(titleText, (pageWidth - titleWidth) / 2, 20);
        
        // Date range - centered
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const periodText = convertPolishChars(`Okres: ${startDate.toLocaleDateString('pl-PL')} - ${endDate.toLocaleDateString('pl-PL')}`);
        const periodWidth = doc.getTextWidth(periodText);
        doc.text(periodText, (pageWidth - periodWidth) / 2, 35);
        
        // Filters info - centered
        let filtersInfo = [];
        if (reportTransactionTypes.length > 0) {
            const types = reportTransactionTypes.map(t => t.label).join(', ');
            filtersInfo.push(`Typy: ${types}`);
        }
        if (selectedProductForReport) {
            filtersInfo.push(`Produkt: ${selectedProductForReport.label}`);
        }
        if (selectedSizeForReport) {
            filtersInfo.push(`Rozmiar: ${selectedSizeForReport.label}`);
        }
        
        if (filtersInfo.length > 0) {
            const filtersText = convertPolishChars(filtersInfo.join(' | '));
            const filtersWidth = doc.getTextWidth(filtersText);
            doc.text(filtersText, (pageWidth - filtersWidth) / 2, 50);
        }
        
        // Calculate totals
        const analytics = {
            totalTransactions: data.length,
            totalValue: 0,
            netBalance: 0,
            byType: {}
        };
        
        data.forEach(transaction => {
            const price = transaction.price || 0;
            analytics.totalValue += Math.abs(price);
            
            if (transaction.type === 'odbior' || transaction.type === 'wplata') {
                analytics.netBalance += price;
            } else if (transaction.type === 'zwrot' || transaction.type === 'wyplata') {
                analytics.netBalance -= price;
            }
            
            if (!analytics.byType[transaction.type]) {
                analytics.byType[transaction.type] = { count: 0, amount: 0 };
            }
            analytics.byType[transaction.type].count++;
            analytics.byType[transaction.type].amount += price;
        });
        
        // Summary section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const summaryY = filtersInfo.length > 0 ? 65 : 50;
        doc.text(convertPolishChars(`Podsumowanie: ${analytics.totalTransactions} transakcji | Saldo: ${analytics.netBalance.toFixed(2)} PLN`), pageWidth / 2, summaryY, { align: 'center' });
        
        // Prepare data for table
        const printData = data.map((transaction, index) => [
            index + 1,
            convertPolishChars(formatTransactionType(transaction.type)),
            convertPolishChars(transaction.productName || '-'),
            convertPolishChars(transaction.size || '-'),
            convertPolishChars(`${(transaction.type === 'odbior' || transaction.type === 'wplata') ? '+' : '-'}${transaction.price || 0} PLN`),
            convertPolishChars(formatDate(transaction.date)),
            convertPolishChars(transaction.notes || '-')
        ]);

        // Table with data
        autoTable(doc, {
            head: [[
                convertPolishChars('Lp.'), 
                convertPolishChars('Typ'), 
                convertPolishChars('Produkt'), 
                convertPolishChars('Rozmiar'), 
                convertPolishChars('Kwota'), 
                convertPolishChars('Data'), 
                convertPolishChars('Uwagi')
            ]],
            body: printData,
            startY: summaryY + 15,
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                overflow: 'linebreak',
                font: 'helvetica',
                fontStyle: 'normal',
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
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 35, halign: 'center' },
                6: { cellWidth: 30, halign: 'center' }
            },
            theme: 'striped',
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // Open PDF in new window for printing
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        
        printWindow.addEventListener('load', () => {
            printWindow.print();
        });
        
        // Close modal after generating report
        setIsReportModalOpen(false);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }

        const sortedTransactions = [...filteredTransactions].sort((a, b) => {
            if (key === 'date') {
                const dateA = new Date(a[key]);
                const dateB = new Date(b[key]);
                if (direction === 'asc') {
                    return dateA - dateB;
                } else {
                    return dateB - dateA;
                }
            }
            
            let valueA = a[key] || '';
            let valueB = b[key] || '';
            
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

        setFilteredTransactions(sortedTransactions);
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

    const handleColumnFilterChange = (key, value) => {
        setColumnFilters((prevFilters) => ({
            ...prevFilters,
            [key]: value,
        }));
    };

    const analytics = getTransactionAnalytics();

    const csvData = filteredTransactions.map((transaction, index) => ({
        'Lp.': index + 1,
        'Typ': formatTransactionType(transaction.type),
        'Produkt': transaction.productName || '-',
        'Rozmiar': transaction.size || '-',
        'Cena': `${transaction.price || 0} PLN`,
        'Data': formatDate(transaction.date),
        'Uwagi': transaction.notes || '-'
    }));

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                <div className="spinner-border text-light" role="status">
                    <span className="sr-only">Ładowanie...</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with balance */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 style={{ color: 'white' }}>Transakcje Cudzich</h2>
                <div className="text-end">
                    <h4 style={{ color: balance >= 0 ? '#51cf66' : '#ff6b6b', margin: 0 }}>
                        Saldo: {balance.toFixed(2)} PLN
                    </h4>
                    <small style={{ color: '#ccc' }}>
                        Łącznie transakcji: {analytics.totalTransactions}
                    </small>
                </div>
            </div>

            {/* Controls */}
            <div className="d-flex justify-content-center align-items-center mb-3">
                <Button color="success" className="me-2 btn btn-sm" onClick={handleExportExcel}>Export to Excel</Button>
                <Button color="primary" className="me-2 btn btn-sm">
                    <CSVLink data={csvData} filename="transakcje_cudzich.csv" style={{color: 'inherit', textDecoration: 'none'}}>
                        Export to CSV
                    </CSVLink>
                </Button>
                <Button color="danger" className="me-2 btn btn-sm" onClick={handleExportPDF}>Export to PDF</Button>
                <Button color="warning" className="btn btn-sm" onClick={handleCudzichReport}>Drukuj raport</Button>
                <div className="d-flex align-items-center date-picker-container ms-3" style={{ position: 'relative' }}>
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
                                staticRanges={customStaticRanges}
                                inputRanges={customInputRanges}
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

            {/* Transactions table */}
            <div className={styles.tableContainer}>
                <table className={`table ${styles.table} ${styles.responsiveTable} text-center`}>
                    <caption className={styles.caption}>Tabela przedstawiająca transakcje Cudzich</caption>
                    <thead>
                        <tr>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                Lp.
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                                Typ {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('type', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('productName')} style={{ cursor: 'pointer' }}>
                                Produkt {sortConfig.key === 'productName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    placeholder="Filter"
                                    onChange={(e) => handleColumnFilterChange('productName', e.target.value)}
                                />
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                                Rozmiar {sortConfig.key === 'size' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>
                                Cena {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`} onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                                Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className={`${styles.tableHeader} ${styles.noWrap}`}>
                                Uwagi
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((transaction, index) => (
                                <tr key={transaction._id || index}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <span style={{ 
                                            color: getTransactionTypeColor(transaction.type),
                                            fontWeight: 'bold'
                                        }}>
                                            {formatTransactionType(transaction.type)}
                                        </span>
                                    </td>
                                    <td>{transaction.productName || '-'}</td>
                                    <td>{transaction.size || '-'}</td>
                                    <td style={{ 
                                        color: (transaction.type === 'odbior' || transaction.type === 'wplata') ? '#51cf66' : '#ff6b6b',
                                        fontWeight: 'bold'
                                    }}>
                                        {(transaction.type === 'odbior' || transaction.type === 'wplata') ? '+' : '-'}
                                        {transaction.price || 0} PLN
                                    </td>
                                    <td>{formatDate(transaction.date)}</td>
                                    <td>{transaction.notes || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center">
                                    {error ? error : 'Brak transakcji'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan="7" className="text-center">
                                <strong>Saldo końcowe: </strong>
                                <span style={{ 
                                    color: balance >= 0 ? '#51cf66' : '#ff6b6b',
                                    fontWeight: 'bold',
                                    fontSize: '1.1em'
                                }}>
                                    {balance.toFixed(2)} PLN
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Report Modal */}
            <Modal isOpen={isReportModalOpen} toggle={() => setIsReportModalOpen(!isReportModalOpen)} size="lg">
                <ModalHeader toggle={() => setIsReportModalOpen(!isReportModalOpen)}>
                    Raport Transakcji Cudzich
                </ModalHeader>
                <ModalBody>
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
                    
                    <FormGroup>
                        <Label for="filterSelect">Wybierz filtry:</Label>
                        <Select
                            isMulti
                            value={selectedFiltersForReport}
                            onChange={setSelectedFiltersForReport}
                            options={[
                                { value: 'all', label: 'Wszystkie transakcje' },
                                { value: 'transactionType', label: 'Filtruj według typu transakcji' },
                                { value: 'productName', label: 'Filtruj według nazwy produktu' },
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
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'transactionType') && (
                        <FormGroup>
                            <Label for="transactionTypeSelect">Wybierz typ transakcji:</Label>
                            <Select
                                isMulti
                                value={reportTransactionTypes}
                                onChange={setReportTransactionTypes}
                                options={transactionTypeOptions}
                                placeholder="Wybierz typy transakcji..."
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
                    )}
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'productName') && (
                        <FormGroup>
                            <Label for="productNameSelect">Wybierz nazwę produktu:</Label>
                            <Select
                                value={selectedProductForReport}
                                onChange={setSelectedProductForReport}
                                options={productOptions}
                                placeholder="Wybierz nazwę produktu..."
                                isClearable
                                isSearchable
                                openMenuOnClick={true}
                                openMenuOnFocus={true}
                                blurInputOnSelect={false}
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
                    
                    {selectedFiltersForReport.some(filter => filter.value === 'size') && (
                        <FormGroup>
                            <Label for="sizeSelect">Wybierz rozmiar:</Label>
                            <Select
                                value={selectedSizeForReport}
                                onChange={setSelectedSizeForReport}
                                options={sizeOptions}
                                placeholder="Wybierz rozmiar..."
                                isClearable
                                isSearchable
                                openMenuOnClick={true}
                                openMenuOnFocus={true}
                                blurInputOnSelect={false}
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
                            <Label for="specificProductSelect">Konkretny produkt:</Label>
                            <div className="row">
                                <div className="col-md-6">
                                    <Select
                                        value={selectedProductForReport}
                                        onChange={setSelectedProductForReport}
                                        options={productOptions}
                                        placeholder="Wybierz produkt..."
                                        isClearable
                                        isSearchable
                                        openMenuOnClick={true}
                                        openMenuOnFocus={true}
                                        blurInputOnSelect={false}
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
                                </div>
                                <div className="col-md-6">
                                    <Select
                                        value={selectedSizeForReport}
                                        onChange={setSelectedSizeForReport}
                                        options={sizeOptions}
                                        placeholder="Wybierz rozmiar..."
                                        isClearable
                                        isSearchable
                                        openMenuOnClick={true}
                                        openMenuOnFocus={true}
                                        blurInputOnSelect={false}
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
                                </div>
                            </div>
                        </FormGroup>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="primary" 
                        onClick={generateCudzichReport}
                        disabled={reportLoading}
                    >
                        {reportLoading ? <Spinner size="sm" /> : 'Drukuj raport'}
                    </Button>
                    <Button 
                        color="secondary" 
                        onClick={() => setIsReportModalOpen(false)}
                    >
                        Anuluj
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Cudzich;