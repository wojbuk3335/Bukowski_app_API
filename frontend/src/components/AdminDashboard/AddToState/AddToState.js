import React, { useState, useEffect } from 'react';

const AddToState = ({ onAdd }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);

  useEffect(() => {
    // Fetch users from API
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    // Fetch transfers from API
    const fetchTransfers = async () => {
      try {
        const response = await fetch('/api/transfer');
        const data = await response.json();
        setTransfers(data || []);
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    };

    fetchUsers();
    fetchTransfers();
  }, []);

  useEffect(() => {
    // Filter items based on selected date and user
    let filtered = Array.isArray(transfers) ? transfers : [];

    if (selectedDate) {
      filtered = filtered.filter(transfer => {
        const transferDate = new Date(transfer.date).toISOString().split('T')[0];
        return transferDate === selectedDate;
      });
    }

    if (selectedUser) {
      const selectedUserData = users.find(user => user._id === selectedUser);
      if (selectedUserData) {
        filtered = filtered.filter(transfer => 
          transfer.transfer_from === selectedUserData.symbol || 
          transfer.transfer_to === selectedUserData.symbol
        );
      }
    }

    setFilteredItems(filtered);
  }, [selectedDate, selectedUser, transfers, users]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const handleProcessAllTransfers = async () => {
    if (!Array.isArray(filteredItems) || filteredItems.length === 0) {
      alert('Brak transferów do przetworzenia');
      return;
    }

    try {
      const response = await fetch('/api/transfer/process-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transfers: filteredItems,
          selectedDate: selectedDate,
          selectedUser: selectedUser
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Przetworzono ${result.processedCount} transferów - kurtki zostały odpisane ze stanu`);
        
        // Odśwież listę transferów po przetworzeniu
        const fetchResponse = await fetch('/api/transfer');
        const data = await fetchResponse.json();
        setTransfers(data || []);
      } else {
        alert('Błąd podczas przetwarzania transferów');
      }
    } catch (error) {
      console.error('Error processing transfers:', error);
      alert('Błąd podczas przetwarzania transferów');
    }
  };

  const handleProcessSingleTransfer = async (transferId) => {
    try {
      const response = await fetch('/api/transfer/process-single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transferId: transferId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Kurtka została odpisana ze stanu');
        
        // Odśwież listę transferów
        const fetchResponse = await fetch('/api/transfer');
        const data = await fetchResponse.json();
        setTransfers(data || []);
      } else {
        alert('Błąd podczas odpisywania kurtki ze stanu');
      }
    } catch (error) {
      console.error('Error processing single transfer:', error);
      alert('Błąd podczas odpisywania kurtki ze stanu');
    }
  };

  const handleRemoveAllFromState = async () => {
    if (filteredItems.length === 0) {
      alert('Brak transferów do odpisania ze stanu');
      return;
    }

    const confirmMessage = `Czy na pewno chcesz odpisać wszystkie ${filteredItems.length} kurtek ze stanu?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      // Process each transfer to remove from state
      for (const transfer of filteredItems) {
        try {
          // Remove the product from state based on transfer data
          const response = await fetch(`/api/state/barcode/${transfer.productId}/symbol/${transfer.transfer_from}?count=1`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            successCount++;
            // Also remove the transfer record
            await fetch(`/api/transfer/${transfer._id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } else {
            errorCount++;
            console.error(`Failed to remove transfer ${transfer._id}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing transfer ${transfer._id}:`, error);
        }
      }

      // Update local state - remove all processed transfers
      setTransfers(prevTransfers => 
        prevTransfers.filter(transfer => 
          !filteredItems.some(filteredItem => filteredItem._id === transfer._id)
        )
      );

      if (successCount > 0) {
        alert(`Pomyślnie odpisano ${successCount} kurtek ze stanu${errorCount > 0 ? `. Błędów: ${errorCount}` : ''}`);
      } else {
        alert('Nie udało się odpisać żadnej kurtki ze stanu');
      }
    } catch (error) {
      console.error('Error removing all from state:', error);
      alert('Błąd podczas odpisywania kurtek ze stanu');
    }
  };

  return (
    <div>
      <form>
        <div>
          <label htmlFor="datepicker">Select Date:</label>
          <input
            id="datepicker"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
        
        <div>
          <label htmlFor="userselect">Select User:</label>
          <select
            id="userselect"
            value={selectedUser}
            onChange={handleUserChange}
          >
            <option value="">-- Select User --</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.symbol} - {user.sellingPoint || user.email}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'center' }}>
        <button 
          onClick={handleProcessAllTransfers}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          disabled={!Array.isArray(filteredItems) || filteredItems.length === 0}
        >
          Zapisz - Odpisz wszystkie kurtki ze stanu ({Array.isArray(filteredItems) ? filteredItems.length : 0})
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Transfery</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Full Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Size</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>From</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>To</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Product ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reason</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Advance Payment</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(filteredItems) && filteredItems.map((transfer) => (
              <tr key={transfer._id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.fullName}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.size}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(transfer.date).toLocaleDateString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.transfer_from}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.transfer_to}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.productId}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{transfer.reason || 'N/A'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {transfer.advancePayment} {transfer.advancePaymentCurrency}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button 
                    onClick={() => handleProcessSingleTransfer(transfer._id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Odpisz kurtkę
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!Array.isArray(filteredItems) || filteredItems.length === 0) && (
          <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
            {selectedDate || selectedUser ? 'Brak transferów dla wybranych kryteriów' : 'Brak transferów'}
          </p>
        )}
      </div>
    </div>
  );
};

export default AddToState;