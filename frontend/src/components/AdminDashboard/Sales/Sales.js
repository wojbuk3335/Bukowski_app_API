import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../State/State.module.css'; // Use the same styles as State.js

const Sales = () => {
    const [sales, setSales] = useState([]); // Ensure sales is initialized as an empty array
    const [error, setError] = useState(null); // State to track errors

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get('/api/sales/get-all-sales'); // Adjust the endpoint if necessary
                if (Array.isArray(response.data)) {
                    setSales(response.data); // Set sales if the response is an array
                } else {
                    console.error('Unexpected API response format:', response.data);
                    setSales([]); // Fallback to an empty array
                }
            } catch (error) {
                console.error('Error fetching sales:', error);
                setError('Failed to fetch sales data. Please try again later.');
                setSales([]); // Fallback to an empty array
            }
        };

        fetchSales();
    }, []);

    if (error) {
        return <div className={styles.error}>{error}</div>; // Display error message if any
    }

    return (
        <div>
            <h1 className={styles.title}>Sprzedaż</h1> {/* Polish: Sales */}
            <table className={`table ${styles.table}`}>
                <caption className={styles.caption}>Tabela przedstawiająca dane sprzedaży w systemie</caption> {/* Polish: Sales data table */}
                <thead>
                    <tr>
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Lp.</th> {/* Polish: Numbering */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Pełna nazwa</th> {/* Polish: Full Name */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Data</th> {/* Polish: Date */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Kod kreskowy</th> {/* Polish: Barcode */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Rozmiar</th> {/* Polish: Size */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Punkt sprzedaży</th> {/* Polish: Selling Point */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Z</th> {/* Polish: From */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Karta</th> {/* Polish: Card */}
                        <th className={`${styles.tableHeader} ${styles.noWrap}`}>Gotówka</th> {/* Polish: Cash */}
                    </tr>
                </thead>
                <tbody>
                    {sales.map((sale, index) => (
                        <tr key={sale._id} className={styles.tableRow}>
                            <td className={styles.tableCell}>{index + 1}</td> {/* Add numbering */}
                            <td className={`${styles.tableCell} ${styles.noWrap}`}>{sale.fullName}</td> {/* Ensure single line */}
                            <td className={styles.tableCell}>{new Date(sale.timestamp).toLocaleDateString()}</td> {/* Use timestamp */}
                            <td className={styles.tableCell}>{sale.barcode}</td>
                            <td className={styles.tableCell}>
                                {sale.sizeId?.Roz_Opis || 'N/A'} {/* Display Roz_Opis from sizeId or fallback to N/A */}
                            </td>
                            <td className={`${styles.tableCell} ${styles.noWrap}`}>{sale.sellingPoint}</td> {/* Ensure single line */}
                            <td className={styles.tableCell}>{sale.from}</td>
                            <td className={styles.tableCell}>
                                {sale.card.map((c, i) => (
                                    <div key={i}>{`${c.price} ${c.currency}`}</div>
                                ))}
                            </td>
                            <td className={styles.tableCell}>
                                {sale.cash.map((c, i) => (
                                    <div key={i}>{`${c.price} ${c.currency}`}</div>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Sales;