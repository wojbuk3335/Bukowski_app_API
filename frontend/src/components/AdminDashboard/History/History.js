import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './History.module.css';
import tableStyles from '../History/History.module.css';

const History = () => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [operationFilter, setOperationFilter] = useState(''); // State for filtering by "Operacja"
    const [fromFilter, setFromFilter] = useState(''); // State for filtering by "Skąd"
    const [toFilter, setToFilter] = useState(''); // State for filtering by "Dokąd"
    const [productFilter, setProductFilter] = useState(''); // State for filtering by "Produkt"
    const [userFilter, setUserFilter] = useState(''); // State for filtering by "User"
    const [collectionFilter, setCollectionFilter] = useState(''); // State for filtering by "Kolekcja"
    const [dateFilter, setDateFilter] = useState(''); // State for filtering by "Czas"

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/history');
                setHistoryData(response.data);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handleRemoveHistory = async () => {
        if (window.confirm('Czy na pewno chcesz usunąć historię?')) {
            try {
                await axios.delete('/api/history/remove');
                setHistoryData([]); // Clear the history data in the state
                alert('Historia została usunięta!'); // Notify the user about the success
            } catch (error) {
                console.error('Error clearing history:', error);
                alert('Failed to clear history.'); // Notify the user about the failure
            }
        }
    };

    // Extract unique values for the "Operacja", "Skąd", "Dokąd", and "Produkt" columns
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']; // Define size order

    const sortByNameAndSize = (items) => {
        return items.sort((a, b) => {
            const [nameA, sizeA] = a.split(' ');
            const [nameB, sizeB] = b.split(' ');

            if (nameA === nameB) {
                const indexA = sizeOrder.indexOf(sizeA);
                const indexB = sizeOrder.indexOf(sizeB);

                return (indexA !== -1 ? indexA : Infinity) - (indexB !== -1 ? indexB : Infinity);
            }

            return nameA.localeCompare(nameB);
        });
    };

    const uniqueOperations = sortByNameAndSize([...new Set(historyData.map((item) => item.operation))]);
    const uniqueFromValues = sortByNameAndSize([...new Set(historyData.map((item) => item.from))]);
    const uniqueToValues = sortByNameAndSize([...new Set(historyData.map((item) => item.to))]);
    const uniqueProducts = sortByNameAndSize([...new Set(historyData.map((item) => item.details))]);
    const uniqueUsers = [...new Set(historyData.map((item) => item.userloggedinId?.username || localStorage.getItem('AdminEmail')))];
    const uniqueCollections = [...new Set(historyData.map((item) => item.collectionName))];

    const handleOperationFilterChange = (event) => {
        setOperationFilter(event.target.value); // Update the filter state
    };

    const handleFromFilterChange = (event) => {
        setFromFilter(event.target.value); // Update the "Skąd" filter state
    };

    const handleToFilterChange = (event) => {
        setToFilter(event.target.value); // Update the "Dokąd" filter state
    };

    const handleProductFilterChange = (event) => {
        setProductFilter(event.target.value); // Update the "Produkt" filter state
    };

    const handleUserFilterChange = (event) => {
        setUserFilter(event.target.value); // Update the "User" filter state
    };

    const handleCollectionFilterChange = (event) => {
        setCollectionFilter(event.target.value); // Update the "Kolekcja" filter state
    };

    const handleDateFilterChange = (event) => {
        setDateFilter(event.target.value); // Update the "Czas" filter state
    };

    const filteredHistoryData = historyData.filter((item) =>
        (operationFilter ? item.operation === operationFilter : true) &&
        (fromFilter ? item.from === fromFilter : true) &&
        (toFilter ? item.to === toFilter : true) &&
        (productFilter ? item.details === productFilter : true) &&
        (userFilter ? (item.userloggedinId?.username || localStorage.getItem('AdminEmail')) === userFilter : true) &&
        (collectionFilter ? item.collectionName === collectionFilter : true) &&
        (dateFilter ? new Date(item.timestamp).toLocaleDateString() === new Date(dateFilter).toLocaleDateString() : true) // Apply filter for "Czas"
    );

    useEffect(() => {
        const adjustSelectWidth = () => {
            const operations = historyData.map((item) => item.operation);
            const longestOperation = operations.reduce((a, b) => (a.length > b.length ? a : b), '');
            const tempElement = document.createElement('span');
            tempElement.style.visibility = 'hidden';
            tempElement.style.whiteSpace = 'nowrap';
            tempElement.style.fontSize = '14px';
            tempElement.textContent = longestOperation;
            document.body.appendChild(tempElement);
            const width = tempElement.offsetWidth + 20; // Add padding
            document.body.removeChild(tempElement);
            return width;
        };

        const selectElement = document.querySelector('.form-select');
        if (selectElement) {
            selectElement.style.width = `${adjustSelectWidth()}px`;
        }
    }, [historyData]);

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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px' }}>
                <h1 className={tableStyles.title} style={{ marginRight: '10px' }}>Historia</h1>
                <button onClick={handleRemoveHistory} className="btn btn-danger">
                    Wyczyść Historię
                </button>
            </div>
            <div className={tableStyles.tableContainer} style={{ width: '100%' }}>
                <table className={`${tableStyles.table} ${tableStyles.responsiveTable}`}>
                    <thead>
                        <tr>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }}>Lp.</th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Kolekcja
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={collectionFilter}
                                        onChange={handleCollectionFilterChange}
                                        style={{
                                            maxWidth: '140px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueCollections.map((collection) => (
                                            <option key={collection} value={collection}>
                                                {collection}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Operacja
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={operationFilter}
                                        onChange={handleOperationFilterChange}
                                        style={{
                                            maxWidth: '180px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueOperations.map((operation) => (
                                            <option key={operation} value={operation}>
                                                {operation}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Skąd
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={fromFilter}
                                        onChange={handleFromFilterChange}
                                        style={{
                                            maxWidth: '140px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueFromValues.map((from) => (
                                            <option key={from} value={from}>
                                                {from}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Dokąd
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={toFilter}
                                        onChange={handleToFilterChange}
                                        style={{
                                            maxWidth: '140px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueToValues.map((to) => (
                                            <option key={to} value={to}>
                                                {to}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Czas
                                    <input
                                        type="date"
                                        className="form-control form-control-sm mt-1 date-picker"
                                        value={dateFilter}
                                        onChange={handleDateFilterChange}
                                        onClick={(e) => e.target.showPicker()} // Ensure the calendar popup opens when clicked
                                        style={{
                                            maxWidth: '140px',
                                            width: '100%',
                                            textAlign: 'center',
                                            cursor: 'pointer', // Add pointer cursor on hover
                                        }}
                                    />
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Użytkownik
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={userFilter}
                                        onChange={handleUserFilterChange}
                                        style={{
                                            maxWidth: '140px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueUsers.map((user) => (
                                            <option key={user} value={user}>
                                                {user}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                            <th className={tableStyles.tableHeader} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
                                    Produkt
                                    <select
                                        className="form-select form-select-sm mt-1"
                                        value={productFilter}
                                        onChange={handleProductFilterChange}
                                        style={{
                                            maxWidth: '180px',
                                            width: '100%',
                                            whiteSpace: 'nowrap',
                                            textAlign: 'center',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        <option value="">Wszystkie</option>
                                        {uniqueProducts.map((product) => (
                                            <option key={product} value={product}>
                                                {product}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistoryData.map((item, index) => (
                            <tr key={item._id}>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '50px', width: '50px', textAlign: 'center' }} data-label="Lp.">{index + 1}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Kolekcja">{item.collectionName}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }} data-label="Operacja">{item.operation}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Skąd">
                                    {item.from === "" ? "-" : item.from} {/* Replace empty values with "-" */}
                                </td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Dokąd">
                                    {item.to === "" ? "-" : item.to} {/* Replace empty values with "-" */}
                                </td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Czas">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '150px', width: '150px', textAlign: 'center' }} data-label="Użytkownik">{item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}</td>
                                <td className={tableStyles.tableCell} style={{ maxWidth: '200px', width: '200px', textAlign: 'center' }} data-label="Produkt">{item.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default History;