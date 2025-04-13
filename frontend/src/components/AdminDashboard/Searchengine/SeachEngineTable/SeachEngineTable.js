import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

const SeachEngineTable = () => {
    const [products, setProducts] = useState([]);
    const [tableArray, setTableArray] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProducts = async () => {
        try {
            const response = await axios.get('/api/excel/goods/get-all-goods');
            const productData = response.data.goods.map((item) => ({
                fullName: item.fullName,
                plec: item.Plec,
            }));
            setProducts(productData);

            // Create a 2D array
            const columns = 14; // Number of table columns + 1 for product name
            const rows = productData.length;
            const tableArray = Array.from({ length: rows }, (_, rowIndex) => 
                Array.from({ length: columns }, (_, colIndex) => {
                    if (colIndex === 0) return productData[rowIndex].fullName;
                    if (colIndex === 1) return productData[rowIndex].plec; // Keep Plec in the array
                    return null;
                })
            );

            console.log('Generated Table Array:', tableArray);

            // Fetch data from /api/state
            const stateResponse = await axios.get('/api/state');
            const stateData = stateResponse.data;

            // Match fullName from /api/state with /api/excel/goods/get-all-goods
            stateData.forEach((stateItem) => {
                const matchedProduct = productData.find(
                    (product) => product.fullName === stateItem.fullName
                );
                if (matchedProduct) {
                    let sex = matchedProduct.plec; // Store Plec value in a temporary variable
                    if (sex === 'D') {
                        const size = stateItem.size;
                        let columnIndex;
                        switch (size) {
                            case 'XXS':
                            case '32':
                                columnIndex = 2; // Third column (index starts from 0)
                                break;
                            case 'XS':
                            case '34':
                                columnIndex = 3; // Fourth column
                                break;
                            case 'S':
                            case '36':
                                columnIndex = 4; // Fifth column
                                break;
                            case 'M':
                            case '38':
                                columnIndex = 5; // Sixth column
                                break;
                            case 'L':
                            case '40':
                                columnIndex = 6; // Seventh column
                                break;
                            case 'XL':
                            case '42':
                                columnIndex = 7; // Eighth column
                                break;
                            case '2L':
                            case '44':
                                columnIndex = 8; // Ninth column
                                break;
                            case '3L':
                            case '46':
                                columnIndex = 9; // Tenth column
                                break;
                            case '4XL':
                            case '48':
                                columnIndex = 10; // Eleventh column
                                break;
                            case '5XL':
                            case '50':
                                columnIndex = 11; // Twelfth column
                                break;
                            case '6XL':
                            case '52':
                                columnIndex = 12; // Thirteenth column
                                break;
                            case '7XL':
                            case '54':
                                columnIndex = 13; // Fourteenth column
                                break;
                            default:
                                console.log(`Unknown size: ${size}`);
                                return;
                        }
                        console.log(
                            `Placing symbol for ${matchedProduct.fullName} in column ${columnIndex}`
                        );
                        tableArray.forEach((row) => {
                            if (row[0] === matchedProduct.fullName) {
                                if (row[columnIndex]) {
                                    // If a symbol already exists, concatenate unique symbols
                                    const existingSymbols = row[columnIndex].split('/');
                                    if (!existingSymbols.includes(stateItem.symbol)) {
                                        row[columnIndex] = `${row[columnIndex]}/${stateItem.symbol}`;
                                    }
                                } else {
                                    // If no symbol exists, add the current symbol
                                    row[columnIndex] = stateItem.symbol;
                                }
                            }
                        });
                    } else if (sex === 'M') {
                        const size = stateItem.size;
                        let columnIndex;
                        switch (size) {
                            case 'XXS':
                            case '40':
                                columnIndex = 2; // Third column (index starts from 0)
                                break;
                            case 'XS':
                            case '42':
                                columnIndex = 3; // Fourth column
                                break;
                            case 'S':
                            case '44':
                                columnIndex = 4; // Fifth column
                                break;
                            case 'M':
                            case '46':
                                columnIndex = 5; // Sixth column
                                break;
                            case 'L':
                            case '48':
                                columnIndex = 6; // Seventh column
                                break;
                            case 'XL':
                            case '50':
                                columnIndex = 7; // Eighth column
                                break;
                            case '2L':
                            case '52':
                                columnIndex = 8; // Ninth column
                                break;
                            case '3L':
                            case '54':
                                columnIndex = 9; // Tenth column
                                break;
                            case '4XL':
                            case '56':
                                columnIndex = 10; // Eleventh column
                                break;
                            case '5XL':
                            case '58':
                                columnIndex = 11; // Twelfth column
                                break;
                            case '6XL':
                            case '60':
                                columnIndex = 12; // Thirteenth column
                                break;
                            case '7XL':
                            case '62':
                                columnIndex = 13; // Fourteenth column
                                break;
                            default:
                                console.log(`Unknown size: ${size}`);
                                return;
                        }
                        console.log(
                            `Placing symbol for ${matchedProduct.fullName} in column ${columnIndex}`
                        );
                        tableArray.forEach((row) => {
                            if (row[0] === matchedProduct.fullName) {
                                if (row[columnIndex]) {
                                    // If a symbol already exists, concatenate unique symbols
                                    const existingSymbols = row[columnIndex].split('/');
                                    if (!existingSymbols.includes(stateItem.symbol)) {
                                        row[columnIndex] = `${row[columnIndex]}/${stateItem.symbol}`;
                                    }
                                } else {
                                    // If no symbol exists, add the current symbol
                                    row[columnIndex] = stateItem.symbol;
                                }
                            }
                        });
                    } else if (sex === 'Dz') {
                        const size = stateItem.size;
                        let columnIndex;
                        switch (size) {
                            case '92':
                                columnIndex = 4; // Fourth column (index starts from 0)
                                break;
                            case '104':
                                columnIndex = 5; // Fifth column
                                break;
                            case '116':
                                columnIndex = 6; // Sixth column
                                break;
                            case '128':
                                columnIndex = 7; // Seventh column
                                break;
                            case '140':
                                columnIndex = 8; // Eighth column
                                break;
                            case '152':
                                columnIndex = 9; // Ninth column
                                break;
                            default:
                                console.log(`Unknown size: ${size}`);
                                return;
                        }
                        console.log(
                            `Placing symbol for ${matchedProduct.fullName} in column ${columnIndex}`
                        );
                        tableArray.forEach((row) => {
                            if (row[0] === matchedProduct.fullName) {
                                if (row[columnIndex]) {
                                    // If a symbol already exists, concatenate unique symbols
                                    const existingSymbols = row[columnIndex].split('/');
                                    if (!existingSymbols.includes(stateItem.symbol)) {
                                        row[columnIndex] = `${row[columnIndex]}/${stateItem.symbol}`;
                                    }
                                } else {
                                    // If no symbol exists, add the current symbol
                                    row[columnIndex] = stateItem.symbol;
                                }
                            }
                        });
                    }
                }
            });

            console.log('Updated Table Array:', tableArray);
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

    const filteredTableArray = tableArray.filter((row) =>
        row[0]?.toLowerCase().includes(searchQuery)
    );

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
                    style={{ maxWidth: '300px' }}
                />
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