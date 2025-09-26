import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const SeachEngineTable = () => {
    const [products, setProducts] = useState([]);
    const [tableArray, setTableArray] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [symbols, setSymbols] = useState([]); // State for unique symbols
    const [selectedSymbols, setSelectedSymbols] = useState([]); // State for selected symbols

    const fetchProducts = async () => {
        try {
            const goodsResponse = await axios.get('/api/excel/goods/get-all-goods');
            const productData = goodsResponse.data.goods.map((item) => ({
                fullName: item.fullName,
                plec: item.Plec,
            }));
            setProducts(productData);

            const stateResponse = await axios.get('/api/state');
            // Use stateResponse.data directly, no need for additional API calls
            const resolvedStateData = stateResponse.data.map((stateItem) => ({
                ...stateItem,
                fullName: stateItem.fullName, // Use fullName directly from state
                size: stateItem.size, // Use size directly from state
                sellingPoint: stateItem.sellingPoint, // Include sellingPoint
            }));

            // Extract unique symbols from state data
            const uniqueSymbols = [...new Set(resolvedStateData.map((item) => item.symbol))];
            setSymbols(uniqueSymbols);

            const columns = 14; // Number of table columns + 1 for product name
            const rows = productData.length;
            const tableArray = Array.from({ length: rows }, (_, rowIndex) =>
                Array.from({ length: columns }, (_, colIndex) => {
                    if (colIndex === 0) return productData[rowIndex].fullName;
                    if (colIndex === 1) return productData[rowIndex].plec; // Keep Plec in the array
                    return null;
                })
            );

            resolvedStateData.forEach((stateItem) => {
                const matchedProduct = productData.find(
                    (product) => product.fullName === stateItem.fullName
                );
                if (matchedProduct) {
                    const size = stateItem.size;
                    let columnIndex;
                    switch (size) {
                        case 'XXS':
                        case '32':
                            columnIndex = 2;
                            break;
                        case 'XS':
                        case '34':
                            columnIndex = 3;
                            break;
                        case 'S':
                        case '36':
                            columnIndex = 4;
                            break;
                        case 'M':
                        case '38':
                            columnIndex = 5;
                            break;
                        case 'L':
                        case '40':
                            columnIndex = 6;
                            break;
                        case 'XL':
                        case '42':
                            columnIndex = 7;
                            break;
                        case '2XL':
                        case '44':
                            columnIndex = 8;
                            break;
                        case '3XL':
                        case '46':
                            columnIndex = 9;
                            break;
                        case '4XL':
                        case '48':
                            columnIndex = 10;
                            break;
                        case '5XL':
                        case '50':
                            columnIndex = 11;
                            break;
                        case '6XL':
                        case '52':
                            columnIndex = 12;
                            break;
                        case '7XL':
                        case '54':
                            columnIndex = 13;
                            break;
                        default:
                            console.log(`Unknown size: ${size}`);
                            return;
                    }
                    tableArray.forEach((row) => {
                        if (row[0] === matchedProduct.fullName) {
                            if (row[columnIndex]) {
                                const existingSymbols = row[columnIndex].split('/');
                                if (!existingSymbols.includes(stateItem.symbol)) {
                                    row[columnIndex] = `${row[columnIndex]}/${stateItem.symbol}`;
                                }
                            } else {
                                row[columnIndex] = stateItem.symbol;
                            }
                        }
                    });
                }
            });

            setTableArray(tableArray);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const refreshComponent = async () => {
        setSearchQuery('');
        setLoading(true);
        try {
            await fetchProducts();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle symbol checkbox changes
    const handleSymbolChange = (symbol) => {
        setSelectedSymbols((prevSelected) =>
            prevSelected.includes(symbol)
                ? prevSelected.filter((s) => s !== symbol) // Remove symbol if already selected
                : [...prevSelected, symbol] // Add symbol if not selected
        );
    };

    const filteredTableArray = tableArray.map((row) => {
        const matchesSearchQuery = row[0]?.toLowerCase().includes(searchQuery);

        // Filter each cell to show only selected symbols, excluding the first column
        const filteredRow = row.map((cell, colIndex) => {
            if (colIndex === 0) return cell; // Always include the first column (product names)
            if (colIndex === 1 || !cell) return cell; // Skip Plec or empty cells
            if (selectedSymbols.length === 0) return cell; // Show all symbols if no checkboxes are selected

            const cellSymbols = cell.split('/'); // Split cell content by '/'
            const matchingSymbols = cellSymbols.filter((symbol) => selectedSymbols.includes(symbol));
            return matchingSymbols.join('/') || null; // Join matching symbols or return null if none match
        });

        // Check if the row has any visible symbols after filtering (excluding the first column)
        const hasVisibleSymbols = selectedSymbols.length === 0 || filteredRow.some((cell, colIndex) => colIndex > 1 && cell);

        return matchesSearchQuery && hasVisibleSymbols ? filteredRow : null; // Keep the row if it matches the search query and has visible symbols
    }).filter(Boolean); // Remove rows that are null

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
        <div className="container mt-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
                <h2 style={{ marginRight: '3px' }}>Wyszukiwarka</h2>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={refreshComponent}
                    style={{ marginRight: '10px' }}
                >
                    Odśwież
                </button>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Szukaj w tabeli..."
                    value={searchQuery}
                    onChange={handleSearch}
                    style={{ maxWidth: '300px', marginRight: '10px' }}
                />
                <div style={{ marginLeft: '10px' }}>
                    {symbols.map((symbol) => (
                        <div key={symbol} style={{ display: 'inline-block', marginRight: '10px' }}>
                            <input
                                type="checkbox"
                                id={`symbol-${symbol}`}
                                checked={selectedSymbols.includes(symbol)}
                                onChange={() => handleSymbolChange(symbol)}
                            />
                            <label htmlFor={`symbol-${symbol}`} style={{ marginLeft: '5px' }}>
                                Pokaż {symbol}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            <table className="table table-bordered text-center" style={{ backgroundColor: 'black' }}>
                <thead style={{ backgroundColor: '#495057' }}>
                    <tr>
                        <th>Rozmiary męskie</th>
                        <th>XXS/40</th>
                        <th
                            style={{
                                borderLeft: '3px solid orange',
                                borderRight: '3px solid orange',
                                borderTop: '3px solid orange',
                            }}
                        >
                            XS/42
                        </th>
                        <th>S/44</th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                                borderTop: '3px solid blue',
                            }}
                        >
                            M/48
                        </th>
                        <th>L/50</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                                borderTop: '3px solid white',
                            }}
                        >
                            XL/52
                        </th>
                        <th>2XL/54</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                                borderTop: '3px solid red',
                            }}
                        >
                            3XL/56
                        </th>
                        <th>4XL/58</th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                                borderTop: '3px solid green',
                            }}
                        >
                            5XL/60
                        </th>
                        <th>6XL/62</th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                                borderTop: '3px solid yellow',
                            }}
                        >
                            7XL/64
                        </th>
                    </tr>
                    <tr>
                        <th>Rozmiary damskie</th>
                        <th>XXS/32</th>
                        <th
                            style={{
                                borderLeft: '3px solid orange',
                                borderRight: '3px solid orange',
                            }}
                        >
                            XS/34
                        </th>
                        <th>S/36</th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                            }}
                        >
                            M/38
                        </th>
                        <th>L/40</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                            }}
                        >
                            XL/42
                        </th>
                        <th>2XL/44</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                            }}
                        >
                            3XL/46
                        </th>
                        <th>4XL/48</th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                            }}
                        >
                            5XL/50
                        </th>
                        <th>6XL/52</th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                            }}
                        >
                            7XL/54
                        </th>
                    </tr>
                    <tr>
                        <th>Rozmiary dziecięce</th>
                        <th></th>
                        <th style={{
                            borderLeft: '3px solid orange',
                            borderRight: '3px solid orange',
                        }}
                        ></th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid blue',
                                borderRight: '3px solid blue',
                            }}
                        >
                            104
                        </th>
                        <th>116</th>
                        <th
                            style={{
                                borderLeft: '3px solid white',
                                borderRight: '3px solid white',
                            }}
                        >128</th>
                        <th>140</th>
                        <th
                            style={{
                                borderLeft: '3px solid red',
                                borderRight: '3px solid red',
                            }}
                        >152</th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid green',
                                borderRight: '3px solid green',
                            }}
                        ></th>
                        <th></th>
                        <th
                            style={{
                                borderLeft: '3px solid yellow',
                                borderRight: '3px solid yellow',
                            }}
                        ></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredTableArray.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                colIndex === 1 ? null : ( // Skip the second column (index 1)
                                    <td
                                        key={colIndex}
                                        style={{
                                            backgroundColor: colIndex === 13 ? 'black' : '', // Set background color for column 13
                                            borderLeft: colIndex === 3 ? '3px solid orange' :
                                                        colIndex === 5 ? '3px solid blue' :
                                                        colIndex === 7 ? '3px solid white' :
                                                        colIndex === 9 ? '3px solid red' :
                                                        colIndex === 11 ? '3px solid green' :
                                                        colIndex === 13 ? '3px solid yellow' : '',
                                            borderRight: colIndex === 3 ? '3px solid orange' :
                                                         colIndex === 5 ? '3px solid blue' :
                                                         colIndex === 7 ? '3px solid white' :
                                                         colIndex === 9 ? '3px solid red' :
                                                         colIndex === 11 ? '3px solid green' :
                                                         colIndex === 13 ? '3px solid yellow' : '',
                                            borderBottom: rowIndex === tableArray.length - 1
                                                ? colIndex === 3
                                                    ? '3px solid orange' // Bottom border for column 3
                                                    : colIndex === 5
                                                    ? '3px solid blue' // Bottom border for column 5
                                                    : colIndex === 7
                                                    ? '3px solid white' // Bottom border for column 5
                                                    : colIndex === 9
                                                    ? '3px solid red' // Bottom border for column 5
                                                    : colIndex === 11
                                                    ? '3px solid green'
                                                     // Bottom border for column 5
                                                    : colIndex === 13
                                                    ? '3px solid yellow' // Bottom border for column 5 // Bottom border for column 7
                                                    : colIndex ===  ''
                                                : '', // No bottom border for other rows
                                        }}
                                    >
                                        {colIndex > 1 ? cell || '' : cell}
                                    </td>
                                )
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SeachEngineTable;