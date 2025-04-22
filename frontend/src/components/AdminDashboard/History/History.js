import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './History.module.css';
import tableStyles from '../History/History.module.css';

const History = () => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

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
                            <th className={tableStyles.tableHeader}>Lp.</th>
                            <th className={tableStyles.tableHeader}>Kolekcja</th>
                            <th className={tableStyles.tableHeader}>Operacja</th>
                            <th className={tableStyles.tableHeader}>Czas</th>
                            <th className={tableStyles.tableHeader}>Użytkownik</th>
                            <th className={tableStyles.tableHeader}>Szczegóły</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historyData.map((item, index) => (
                            <tr key={item._id}>
                                <td className={tableStyles.tableCell} data-label="Lp.">{index + 1}</td>
                                <td className={tableStyles.tableCell} data-label="Kolekcja">{item.collectionName}</td>
                                <td className={tableStyles.tableCell} data-label="Operacja">{item.operation}</td>
                                <td className={tableStyles.tableCell} data-label="Czas">{new Date(item.timestamp).toLocaleString()}</td>
                                <td className={tableStyles.tableCell} data-label="Użytkownik">{item.userloggedinId ? item.userloggedinId.username : localStorage.getItem('AdminEmail')}</td>
                                <td className={tableStyles.tableCell} data-label="Szczegóły">{item.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default History;