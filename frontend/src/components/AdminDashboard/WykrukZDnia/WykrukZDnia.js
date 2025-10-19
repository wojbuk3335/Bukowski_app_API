import React, { useState, useEffect } from 'react';

const WykrukZDnia = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSellingPoint, setSelectedSellingPoint] = useState('');
  const [sellingPoints, setSellingPoints] = useState([]);
  const [locations, setLocations] = useState([]); // Nowe: lista lokalizacji
  const [wykrukData, setWykrukData] = useState([]);
  const [zakopianeData, setZakopianeData] = useState({}); // dane dla wszystkich punktów wybranej lokalizacji
  const [loading, setLoading] = useState(false);

  // Ustaw dzisiejszą datę jako domyślną
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Pobierz punkty sprzedaży z API
  useEffect(() => {
    const fetchSellingPoints = async () => {
      try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        // Filtruj użytkowników - usuń tylko admin, pozostaw magazyn, dom i zwykłych użytkowników
        const filteredPoints = (data.users || []).filter(user => {
          const role = user.role?.toLowerCase();
          return role !== 'admin';
        });
        
        setSellingPoints(filteredPoints);
        
        // Zbierz wszystkie unikalne lokalizacje użytkowników (z rolą 'user')
        const userLocations = [...new Set(
          filteredPoints
            .filter(user => user.role === 'user' && user.location && user.location.trim() !== '')
            .map(user => user.location)
        )];
        
        setLocations(userLocations);
        
        // Ustaw pierwszą dostępną lokalizację jako domyślną
        if (userLocations.length > 0 && !selectedSellingPoint) {
          setSelectedSellingPoint(userLocations[0]);
        }
      } catch (error) {
        console.error('Error fetching selling points:', error);
      }
    };

    fetchSellingPoints();
  }, []);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleSellingPointChange = (e) => {
    setSelectedSellingPoint(e.target.value);
  };

  // Pobierz dane wykruku przy zmianie daty lub punktu sprzedaży
  useEffect(() => {
    if (selectedDate && selectedSellingPoint) {
      fetchWykrukData();
    }
  }, [selectedDate, selectedSellingPoint]);

  const handlePrint = () => {
    // Tworzymy specjalną stronę do drukowania
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('pl-PL');
    const selectedPointName = locations.includes(selectedSellingPoint)
      ? `${selectedSellingPoint} (wszystkie punkty)`
      : sellingPoints.find(p => p.symbol === selectedSellingPoint)?.sellingPoint || 
        sellingPoints.find(p => p.symbol === selectedSellingPoint)?.symbol || 
        selectedSellingPoint;

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wykruk z dnia ${selectedDate}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            font-size: 10px;
            line-height: 1.2;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 18px; 
            margin-bottom: 5px;
          }
          .header p { 
            margin: 2px 0; 
            color: #666; 
            font-size: 11px;
          }
          
          .print-info { 
            text-align: right; 
            font-size: 9px; 
            color: #888; 
            margin-bottom: 10px; 
          }
          
          .zakopane-container { 
            display: flex; 
            gap: 8px; 
            width: 100%;
            justify-content: space-between;
          }
          
          .zakopane-point { 
            flex: 1; 
            min-width: 0;
            max-width: 19%;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px;
            font-size: 9px;
          }
          
          th, td { 
            border: 1px solid #333; 
            padding: 3px 2px; 
            text-align: left; 
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          th { 
            background-color: #f0f0f0; 
            font-weight: bold; 
            text-align: center; 
            font-size: 8px;
            padding: 2px 1px;
          }
          
          td:nth-child(2), td:nth-child(3) { 
            text-align: center; 
            width: 15%;
          }
          
          td:nth-child(1) {
            width: 70%;
            font-size: 8px;
          }
          
          .point-title { 
            background-color: #666; 
            color: white; 
            text-align: center; 
            font-weight: bold;
            font-size: 9px;
          }
          
          .green-row { background-color: #f8f9fa; border-left: 4px solid #28a745; }
          .red-row { background-color: #f8f9fa; border-left: 4px solid #dc3545; }
          .yellow-row { background-color: #f8f9fa; border-left: 4px solid #ffc107; }
          .orange-row { background-color: #f8f9fa; border-left: 4px solid #fd7e14; }
          
          .transfer-info { 
            font-size: 7px; 
            color: #666; 
            line-height: 1;
            margin-top: 1px;
          }
          
          .legend {
            margin-top: 15px;
            font-size: 8px;
            color: #666;
            display: flex;
            justify-content: space-around;
            align-items: center;
            flex-wrap: wrap;
            gap: 5px;
          }
          
          .legend-item {
            display: flex;
            align-items: center;
            gap: 3px;
            white-space: nowrap;
          }
          
          .legend-marker {
            width: 12px;
            height: 10px;
            border: 1px solid #333;
            flex-shrink: 0;
          }
          
          .legend-green { border-left: 4px solid #28a745; background: #f8f9fa; }
          .legend-red { border-left: 4px solid #dc3545; background: #f8f9fa; }
          .legend-yellow { border-left: 4px solid #ffc107; background: #f8f9fa; }
          .legend-orange { border-left: 4px solid #fd7e14; background: #f8f9fa; }
          
          /* Dla pojedynczego punktu */
          .single-point-table {
            width: 60%;
            margin: 0 auto;
          }
          
          .single-point-table th,
          .single-point-table td {
            font-size: 10px;
            padding: 4px 6px;
          }
          
          .single-point-table td:nth-child(1) {
            width: 60%;
          }
          
          .single-point-table td:nth-child(2),
          .single-point-table td:nth-child(3) {
            width: 20%;
          }
          
          /* Dla zjednoczonej tabeli Zakopane */
          .zakopane-unified-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          
          .point-names th {
            background-color: #333;
            color: white;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
            padding: 4px 2px;
            border: 2px solid #000;
            vertical-align: middle;
            line-height: 1;
          }
          
          .column-headers th {
            background-color: #666;
            color: white;
            font-size: 7px;
            font-weight: bold;
            padding: 3px 2px;
            border: 1px solid #333;
            text-align: center;
            vertical-align: middle;
            line-height: 1;
          }
          
          .product-header {
            text-align: center !important;
            width: 15%;
            min-width: 60px;
          }
          
          .lp-header {
            text-align: center !important;
            width: 5%;
            min-width: 20px;
          }
          
          .number-header {
            text-align: center !important;
            width: 6%;
            min-width: 25px;
          }
          
          .zakopane-unified-table td {
            font-size: 6px;
            padding: 1px 2px;
            border: 1px solid #ccc;
            word-wrap: break-word;
            overflow-wrap: break-word;
            vertical-align: middle;
            height: 12px;
            line-height: 1;
          }
          
          .product-cell {
            text-align: left;
            font-weight: 500;
            width: 15%;
            padding-left: 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .lp-cell {
            text-align: center;
            font-weight: bold;
            width: 5%;
            font-size: 6px;
          }
          
          .number-cell {
            text-align: center;
            font-weight: bold;
            width: 6%;
            font-size: 7px;
          }
          
          .transfer-info {
            font-size: 5px;
            color: #666;
            line-height: 1;
          }
          
          /* Kolorowanie z grubszymi borderami dla lepszej widoczności */
          .green-cell { 
            background-color: #e8f5e8; 
            border-left: 4px solid #28a745 !important;
            color: #155724;
          }
          
          .red-cell { 
            background-color: #f8e6e7; 
            border-left: 4px solid #dc3545 !important;
            color: #721c24;
          }
          
          .yellow-cell { 
            background-color: #fff8e1; 
            border-left: 4px solid #ffc107 !important;
            color: #856404;
          }
          
          .orange-cell { 
            background-color: #fef4e8; 
            border-left: 4px solid #fd7e14 !important;
            color: #8a4a00;
          }
          
          /* Grupowanie kolumn dla każdego punktu */
          .point-group {
            border-right: 3px solid #000 !important;
          }
          
          .point-group:last-child {
            border-right: 1px solid #ccc !important;
          }
          
          /* Style dla wiersza sumy */
          .summary-row {
            background-color: #f0f0f0 !important;
            border-top: 2px solid #333 !important;
          }
          
          .summary-cell {
            font-weight: bold !important;
            border-top: 2px solid #333 !important;
            padding: 4px 3px !important;
          }
          
          .summary-label {
            text-align: center !important;
            font-size: 7px !important;
            color: #333 !important;
          }
          
          .summary-number {
            text-align: center !important;
            font-size: 8px !important;
            color: #000 !important;
            font-weight: bold !important;
          }

          @media print {
            body { 
              margin: 0 !important; 
              padding: 0 !important;
            }
            
            .zakopane-container {
              page-break-inside: avoid;
            }
            
            table {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Wykruk z dnia</h1>
          <p><strong>Punkt sprzedaży:</strong> ${selectedPointName} | <strong>Data:</strong> ${selectedDate}</p>
        </div>
        
        <div class="print-info">
          Wydrukowano: ${currentDate}
        </div>
    `;

    if (locations.includes(selectedSellingPoint) && Object.keys(zakopianeData).length > 0) {
      // Widok Zakopanego - jedna tabela
      const pointCodes = Object.keys(zakopianeData);
      let maxProducts = 0;
      
      // Znajdź maksymalną liczbę produktów
      pointCodes.forEach(pointCode => {
        const pointData = zakopianeData[pointCode];
        if (pointData.data) {
          maxProducts = Math.max(maxProducts, pointData.data.length);
        }
      });
      
      printContent += `
        <table class="zakopane-unified-table">
          <thead>
            <tr class="point-names">
              ${pointCodes.map((pointCode, index) => {
                const pointData = zakopianeData[pointCode];
                const pointName = pointData.name || pointCode;
                const isLast = index === pointCodes.length - 1;
                return `<th colspan="4" class="point-header ${isLast ? '' : 'point-group'}">${pointName}</th>`;
              }).join('')}
            </tr>
            <tr class="column-headers">
              ${pointCodes.map((pointCode, index) => {
                const isLast = index === pointCodes.length - 1;
                return `
                <th class="lp-header">Lp</th>
                <th class="product-header">Nazwa towaru</th>
                <th class="number-header">Odpisano</th>
                <th class="number-header ${isLast ? '' : 'point-group'}">Dopisano</th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
      `;
      
      // Wygeneruj wiersze
      for (let rowIndex = 0; rowIndex < maxProducts; rowIndex++) {
        printContent += '<tr>';
        
        pointCodes.forEach((pointCode, pointIndex) => {
          const pointData = zakopianeData[pointCode];
          const item = pointData.data && pointData.data[rowIndex] ? pointData.data[rowIndex] : null;
          const isLast = pointIndex === pointCodes.length - 1;
          
          let rowClass = '';
          if (item) {
            if (item.sprzedaz < 0 && item.magazyn > 0) {
              rowClass = 'green-cell';
            } else if (item.sprzedaz < 0 && item.magazyn === 0) {
              rowClass = 'red-cell';
            } else if (item.type === 'transfer' && item.magazyn > 0) {
              rowClass = 'yellow-cell';
            } else if (item.type === 'magazyn' && item.magazyn > 0) {
              rowClass = 'orange-cell';
            }
          }
          
          printContent += `
            <td class="lp-cell">${item ? rowIndex + 1 : ''}</td>
            <td class="product-cell">
              ${item ? `${item.product} ${item.size}${item.type === 'transfer' && item.from ? ` (z ${item.from})` : ''}` : ''}
            </td>
            <td class="number-cell ${item && item.sprzedaz < 0 && item.magazyn === 0 ? 'red-cell' : ''}">${item && item.sprzedaz < 0 ? item.sprzedaz : ''}</td>
            <td class="number-cell ${rowClass} ${isLast ? '' : 'point-group'}">${item && item.magazyn > 0 ? item.magazyn : ''}</td>
          `;
        });
        
        printContent += '</tr>';
      }
      
      // Dodaj wiersz z sumą
      printContent += '<tr class="summary-row">';
      pointCodes.forEach((pointCode, pointIndex) => {
        const pointData = zakopianeData[pointCode];
        const isLast = pointIndex === pointCodes.length - 1;
        
        // Oblicz sumy
        let sumSprzedaz = 0;
        let sumMagazyn = 0;
        
        if (pointData.data) {
          pointData.data.forEach(item => {
            if (item.sprzedaz < 0) sumSprzedaz += item.sprzedaz;
            if (item.magazyn > 0) sumMagazyn += item.magazyn;
          });
        }
        
        printContent += `
          <td class="summary-cell"></td>
          <td class="summary-cell summary-label">SUMA</td>
          <td class="summary-cell summary-number">${sumSprzedaz !== 0 ? sumSprzedaz : ''}</td>
          <td class="summary-cell summary-number ${isLast ? '' : 'point-group'}">${sumMagazyn !== 0 ? sumMagazyn : ''}</td>
        `;
      });
      printContent += '</tr>';
      
      printContent += '</tbody></table>';
    } else if (wykrukData.length > 0) {
      // Pojedynczy punkt
      printContent += `
        <table class="single-point-table">
          <thead>
            <tr>
              <th>Produkt</th>
              <th>Odpisano (-1)</th>
              <th>Dopisano (+1)</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      wykrukData.forEach(item => {
        let rowClass = '';
        if (item.sprzedaz < 0 && item.magazyn > 0) {
          rowClass = 'green-row';
        } else if (item.sprzedaz < 0 && item.magazyn === 0) {
          rowClass = 'red-row';
        } else if (item.type === 'transfer' && item.magazyn > 0) {
          rowClass = 'yellow-row';
        } else if (item.type === 'magazyn' && item.magazyn > 0) {
          rowClass = 'orange-row';
        }
        
        printContent += `
          <tr class="${rowClass}">
            <td>
              ${item.product} ${item.size}
              ${item.type === 'transfer' && item.from ? `<div class="transfer-info">(z punktu ${item.from})</div>` : ''}
            </td>
            <td>${item.sprzedaz < 0 ? item.sprzedaz : ''}</td>
            <td>${item.magazyn > 0 ? item.magazyn : ''}</td>
          </tr>
        `;
      });
      
      printContent += '</tbody></table>';
    } else {
      printContent += '<p style="text-align: center; color: #666;">Brak danych do wydruku</p>';
    }

    printContent += `
        <div class="legend">
          <div class="legend-item">
            <div class="legend-marker legend-green"></div>
            <span>Para: sprzedaż + uzupełnienie</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker legend-red"></div>
            <span>Tylko sprzedaż</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker legend-yellow"></div>
            <span>Transfer z innego punktu</span>
          </div>
          <div class="legend-item">
            <div class="legend-marker legend-orange"></div>
            <span>Uzupełnienie z magazynu</span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Czekamy aż strona się załaduje i automatycznie otwieramy okno drukowania
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const fetchWykrukData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/history?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        
        if (locations.includes(selectedSellingPoint)) {
          // Dla wybranej lokalizacji pobierz dane dla wszystkich punktów z tej lokalizacji
          const locationUsers = sellingPoints.filter(user => 
            user.location && user.location.toLowerCase() === selectedSellingPoint.toLowerCase() && user.role === 'user'
          );
          
          const allPointsData = {};
          
          locationUsers.forEach(user => {
            const point = user.symbol;
            // Używamy dokładnie tej samej logiki filtrowania co dla pojedynczego punktu
            const filteredHistory = (data.history || []).filter(item => {
              const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
              return itemDate === selectedDate && 
                     (item.from === point || 
                      item.to === point ||
                      // Transfer między punktami (nowa operacja)
                      (item.operation === 'Transfer między punktami' && 
                       (item.from === point || item.to === point)));
            });
            
            // Przetwórz dane dla tego punktu używając tej samej funkcji
            allPointsData[point] = {
              name: user.sellingPoint || user.symbol, // Użyj nazwy punktu z bazy danych
              data: processWykrukData(filteredHistory, point)
            };
          });
          
          setZakopianeData(allPointsData);
          setWykrukData([]);
        } else {
          // Filtruj operacje dla wybranego punktu sprzedaży i daty
          const filteredHistory = (data.history || []).filter(item => {
            const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
            return itemDate === selectedDate && 
                   (item.from === selectedSellingPoint || 
                    item.to === selectedSellingPoint ||
                    // Transfer między punktami (nowa operacja)
                    (item.operation === 'Transfer między punktami' && 
                     (item.from === selectedSellingPoint || item.to === selectedSellingPoint)));
          });

          // Grupuj operacje według produktu i rozmiaru
          const groupedData = processWykrukData(filteredHistory, selectedSellingPoint);
          setWykrukData(groupedData);
          setZakopianeData({});
        }
      } else {
        console.error('Błąd podczas pobierania danych wykruku');
        setWykrukData([]);
        setZakopianeData({});
      }
    } catch (error) {
      console.error('Błąd połączenia:', error);
      setWykrukData([]);
      setZakopianeData({});
    } finally {
      setLoading(false);
    }
  };

  const processWykrukData = (historyData, sellingPoint = selectedSellingPoint) => {
    const productMap = new Map();
    const standaloneOperations = [];

    // Zbierz wszystkie transfery wychodzące (sprzedaże)
    const transfersOut = [];
    const supplementsIn = [];

    historyData.forEach(item => {

      // Transfer WYCHODZĄCY z punktu sprzedaży (sprzedaż/transfer)
      if (((item.operation === 'Odpisano ze stanu (transfer)' || 
           item.operation === 'Odpisano ze stanu (sprzedaż)') && 
          item.from === sellingPoint) ||
          // Nowa operacja - transfer między punktami gdzie ten punkt jest źródłem
          (item.operation === 'Transfer między punktami' && item.from === sellingPoint)) {
        transfersOut.push({
          product: item.product || 'Nieznany produkt',
          size: item.size || '-',
          timestamp: item.timestamp
        });
      }
      
      // Uzupełnienie Z MAGAZYNU GŁÓWNEGO do punktu sprzedaży
      if (item.operation === 'Dodano do stanu (z magazynu)' && 
          item.to === sellingPoint && 
          (item.from === 'MAGAZYN' || item.from === 'magazyn')) {
        supplementsIn.push({
          product: item.product || 'Nieznany produkt',
          size: item.size || '-',
          timestamp: item.timestamp,
          type: 'magazyn'  // z magazynu głównego
        });
      }
      
      // Transfer PRZYCHODZĄCY z innego punktu sprzedaży
      if (((item.operation === 'Odpisano ze stanu (transfer)' && 
           item.to === sellingPoint &&
           item.from !== sellingPoint &&  // nie z tego samego punktu
           item.from !== 'MAGAZYN' && item.from !== 'magazyn' && 
           item.from !== 'SPRZEDANE') ||
          (item.operation === 'Dodano do stanu (transfer przychodzący)')) ||
          // Nowa operacja - transfer między punktami gdzie ten punkt jest celem
          (item.operation === 'Transfer między punktami' && item.to === sellingPoint)) {
        
        supplementsIn.push({
          product: item.product || 'Nieznany produkt',
          size: item.size || '-',
          timestamp: item.timestamp,
          type: 'transfer',  // z innego punktu
          from: item.from === 'nieznany' ? 'inny punkt' : item.from || 'inny punkt'
        });
      }
    });

    // Najpierw sparuj transfery z uzupełnieniami
    const used = new Set();
    const result = [];

    transfersOut.forEach(transfer => {
      const key = `${transfer.product}_${transfer.size}`;
      
      // Znajdź pasujące uzupełnienie
      const supplementIndex = supplementsIn.findIndex((supp, index) => 
        !used.has(index) && 
        supp.product === transfer.product && 
        supp.size === transfer.size
      );

      if (supplementIndex !== -1) {
        const supplement = supplementsIn[supplementIndex];
        // Para: sprzedaż + uzupełnienie
        result.push({
          product: transfer.product,
          size: transfer.size,
          sprzedaz: -1,
          magazyn: 1,
          type: supplement.type,  // 'magazyn' lub 'transfer'
          from: supplement.from   // skąd przyszło
        });
        used.add(supplementIndex);
      } else {
        // Tylko sprzedaż bez uzupełnienia
        result.push({
          product: transfer.product,
          size: transfer.size,
          sprzedaz: -1,
          magazyn: 0,
          type: null
        });
      }
    });

    // Dodaj pozostałe uzupełnienia (bez sprzedaży)
    supplementsIn.forEach((supp, index) => {
      if (!used.has(index)) {
        result.push({
          product: supp.product,
          size: supp.size,
          sprzedaz: 0,
          magazyn: 1,
          type: supp.type,  // 'magazyn' lub 'transfer'
          from: supp.from   // skąd przyszło
        });
      }
    });

    return result;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '30px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#000000',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            fontWeight: 'bold',
            fontSize: '16px',
            color: 'white',
            minWidth: '120px'
          }}>
            Wybierz datę:
          </span>
          <input
            id="dateSelect"
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            max={new Date().toISOString().split('T')[0]}
            className="form-control"
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{color: 'white', minWidth: '120px'}}>Punkt sprzedaży:</span>
          <select
            id="sellingPointSelect"
            value={selectedSellingPoint}
            onChange={handleSellingPointChange}
            className="form-select"
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              outline: 'none',
              minWidth: '200px'
            }}
          >
            {/* Opcje dla lokalizacji (wszystkie punkty) */}
            {locations.map((location) => (
              <option key={`location-${location}`} value={location}>
                {location} (wszystkie punkty)
              </option>
            ))}
            
            {/* Separator */}
            {locations.length > 0 && sellingPoints.length > 0 && (
              <option disabled>────────────────</option>
            )}
            
            {/* Pojedyncze punkty sprzedaży */}
            {sellingPoints.map((point) => (
              <option key={point._id} value={point.symbol}>
                {point.role === 'magazyn' ? 'Magazyn' : 
                 point.role === 'dom' ? 'Dom' : 
                 point.sellingPoint || point.symbol}
              </option>
            ))}
          </select>
        </div>

        {selectedSellingPoint && (locations.includes(selectedSellingPoint) ? Object.keys(zakopianeData).length > 0 : wykrukData.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Drukuj wykruk
            </button>
          </div>
        )}
      </div>

      {locations.includes(selectedSellingPoint) && Object.keys(zakopianeData).length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          {(() => {
            // Znajdź maksymalną liczbę produktów w którymkolwiek punkcie
            const pointCodes = Object.keys(zakopianeData);
            let maxProducts = 0;
            
            pointCodes.forEach(pointCode => {
              const pointData = zakopianeData[pointCode];
              if (pointData.data) {
                maxProducts = Math.max(maxProducts, pointData.data.length);
              }
            });
            
            return (
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '8px', 
                border: '1px solid #dee2e6',
                overflow: 'auto'
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '800px'
                }}>
                  <thead>
                    {/* Pierwszy rząd nagłówków - nazwy punktów */}
                    <tr style={{ backgroundColor: '#343a40', color: 'white' }}>
                      {pointCodes.map((pointCode, index) => {
                        const pointData = zakopianeData[pointCode];
                        const pointName = pointData.name || pointCode;
                        const isLast = index === pointCodes.length - 1;
                        return (
                          <th key={pointCode} style={{ 
                            padding: '12px', 
                            textAlign: 'center',
                            borderRight: isLast ? 'none' : '3px solid #000',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            minWidth: '360px'
                          }} colSpan={4}>
                            {pointName}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Drugi rząd nagłówków - nazwa towaru/sprzedaż/magazyn */}
                    <tr style={{ backgroundColor: '#495057', color: 'white' }}>
                      {pointCodes.map((pointCode, index) => {
                        const isLast = index === pointCodes.length - 1;
                        return (
                          <React.Fragment key={pointCode}>
                            <th style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderRight: '1px solid #6c757d',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              minWidth: '40px'
                            }}>
                              Lp
                            </th>
                            <th style={{ 
                              padding: '8px', 
                              textAlign: 'left',
                              borderRight: '1px solid #6c757d',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              minWidth: '160px'
                            }}>
                              Nazwa towaru
                            </th>
                            <th style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderRight: '1px solid #6c757d',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              minWidth: '60px'
                            }}>
                              Odpisano
                            </th>
                            <th style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderRight: isLast ? 'none' : '3px solid #000',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              minWidth: '60px'
                            }}>
                              Dopisano
                            </th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: maxProducts }, (_, rowIndex) => {
                      const rowBgColor = rowIndex % 2 === 0 ? '#f8f9fa' : 'white';
                      
                      return (
                        <tr key={rowIndex} style={{ backgroundColor: rowBgColor }}>
                          {pointCodes.map((pointCode, index) => {
                            const pointData = zakopianeData[pointCode];
                            const item = pointData.data && pointData.data[rowIndex] ? pointData.data[rowIndex] : null;
                            const isLast = index === pointCodes.length - 1;
                            
                            // Określ kolor tła dla sprzedaży
                            let sprzedazBgColor = rowBgColor;
                            if (item && item.sprzedaz < 0 && item.magazyn === 0) {
                              sprzedazBgColor = '#f8d7da'; // czerwone
                            }
                            
                            // Określ kolor tła dla magazynu
                            let magazynBgColor = rowBgColor;
                            if (item) {
                              if (item.sprzedaz < 0 && item.magazyn > 0) {
                                magazynBgColor = '#d4edda'; // zielone
                              } else if (item.type === 'transfer' && item.magazyn > 0) {
                                magazynBgColor = '#ffeb3b'; // żółte
                              } else if (item.type === 'magazyn' && item.magazyn > 0) {
                                magazynBgColor = '#ffd59a'; // pomarańczowe
                              }
                            }
                            
                            return (
                              <React.Fragment key={pointCode}>
                                <td style={{ 
                                  padding: '8px', 
                                  textAlign: 'center',
                                  borderBottom: '1px solid #dee2e6',
                                  borderRight: '1px solid #dee2e6',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}>
                                  {item ? rowIndex + 1 : ''}
                                </td>
                                <td style={{ 
                                  padding: '8px 12px', 
                                  borderBottom: '1px solid #dee2e6',
                                  borderRight: '1px solid #dee2e6',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {item ? `${item.product} ${item.size}` : ''}
                                </td>
                                <td style={{ 
                                  padding: '8px', 
                                  textAlign: 'center',
                                  borderBottom: '1px solid #dee2e6',
                                  borderRight: '1px solid #dee2e6',
                                  color: item && item.sprzedaz < 0 ? '#dc3545' : '#6c757d',
                                  fontWeight: item && item.sprzedaz !== 0 ? 'bold' : 'normal',
                                  fontSize: '11px',
                                  backgroundColor: sprzedazBgColor
                                }}>
                                  {item && item.sprzedaz < 0 ? item.sprzedaz : ''}
                                </td>
                                <td style={{ 
                                  padding: '8px', 
                                  textAlign: 'center',
                                  borderBottom: '1px solid #dee2e6',
                                  borderRight: isLast ? 'none' : '3px solid #000',
                                  color: item && item.magazyn > 0 ? '#28a745' : '#6c757d',
                                  fontWeight: item && item.magazyn > 0 ? 'bold' : 'normal',
                                  fontSize: '11px',
                                  backgroundColor: magazynBgColor
                                }}>
                                  {item && item.magazyn > 0 ? item.magazyn : ''}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* Wiersz z sumą */}
                    <tr style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #333' }}>
                      {pointCodes.map((pointCode, index) => {
                        const pointData = zakopianeData[pointCode];
                        const isLast = index === pointCodes.length - 1;
                        
                        // Oblicz sumy
                        let sumSprzedaz = 0;
                        let sumMagazyn = 0;
                        
                        if (pointData.data) {
                          pointData.data.forEach(item => {
                            if (item.sprzedaz < 0) sumSprzedaz += item.sprzedaz;
                            if (item.magazyn > 0) sumMagazyn += item.magazyn;
                          });
                        }
                        
                        return (
                          <React.Fragment key={pointCode}>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderTop: '2px solid #333',
                              borderBottom: '1px solid #dee2e6',
                              borderRight: '1px solid #dee2e6',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                            </td>
                            <td style={{ 
                              padding: '8px 12px', 
                              textAlign: 'center',
                              borderTop: '2px solid #333',
                              borderBottom: '1px solid #dee2e6',
                              borderRight: '1px solid #dee2e6',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#333'
                            }}>
                              SUMA
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderTop: '2px solid #333',
                              borderBottom: '1px solid #dee2e6',
                              borderRight: '1px solid #dee2e6',
                              color: '#dc3545',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {sumSprzedaz !== 0 ? sumSprzedaz : ''}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'center',
                              borderTop: '2px solid #333',
                              borderBottom: '1px solid #dee2e6',
                              borderRight: isLast ? 'none' : '3px solid #000',
                              color: '#28a745',
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {sumMagazyn !== 0 ? sumMagazyn : ''}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {selectedSellingPoint && !locations.includes(selectedSellingPoint) && (
        <div style={{ marginBottom: '30px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <p>Ładowanie danych wykruku...</p>
            </div>
          ) : wykrukData.length > 0 ? (
            <div style={{ 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              border: '1px solid #dee2e6',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#343a40', color: 'white' }}>
                  <tr>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      width: '60%'
                    }}>
                      Produkt
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      borderBottom: '2px solid #dee2e6',
                      width: '20%',
                      borderLeft: '1px solid #495057'
                    }}>
                      Odpisano (-1)
                    </th>
                    <th style={{ 
                      padding: '15px', 
                      textAlign: 'center', 
                      borderBottom: '2px solid #dee2e6',
                      width: '20%',
                      borderLeft: '1px solid #495057'
                    }}>
                      Dopisano (+1)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wykrukData.map((item, index) => {
                    // Określ kolor tła na podstawie typu operacji
                    let rowBgColor = index % 2 === 0 ? '#f8f9fa' : 'white';
                    
                    if (item.sprzedaz < 0 && item.magazyn > 0) {
                      // Para: sprzedaż + uzupełnienie = zielone tło
                      rowBgColor = '#d4edda'; // zielone tło dla par -1 | 1
                    } else if (item.sprzedaz < 0 && item.magazyn === 0) {
                      // Tylko sprzedaż bez uzupełnienia = czerwone tło
                      rowBgColor = '#f8d7da'; // czerwonawe tło dla -1 |
                    } else if (item.type === 'transfer' && item.magazyn > 0) {
                      // Transfer z innego punktu = żółte tło
                      rowBgColor = '#ffeb3b'; // intensywnie żółte tło dla transferów z innych punktów
                    } else if (item.type === 'magazyn' && item.magazyn > 0) {
                      // Manualne dobranie z magazynu = pomarańczowe tło
                      rowBgColor = '#ffd59a'; // pomarańczowe tło dla manualnych uzupełnień z magazynu
                    }
                    
                    return (
                      <tr key={index} style={{ 
                        backgroundColor: rowBgColor,
                        '&:hover': { backgroundColor: '#e9ecef' }
                      }}>
                        <td style={{ 
                          padding: '12px 15px', 
                          borderBottom: '1px solid #dee2e6',
                          fontWeight: '500'
                        }}>
                          {item.product} {item.size}
                          {item.type === 'transfer' && item.from && (
                            <small style={{ display: 'block', color: '#856404', fontWeight: 'normal' }}>
                              (z punktu {item.from})
                            </small>
                          )}
                        </td>
                        <td style={{ 
                          padding: '12px 15px', 
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          borderLeft: '1px solid #dee2e6',
                          color: item.sprzedaz < 0 ? '#dc3545' : '#6c757d',
                          fontWeight: item.sprzedaz !== 0 ? 'bold' : 'normal'
                        }}>
                          {item.sprzedaz < 0 ? item.sprzedaz : ''}
                        </td>
                        <td style={{ 
                          padding: '12px 15px', 
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6',
                          borderLeft: '1px solid #dee2e6',
                          color: item.magazyn > 0 ? '#28a745' : '#6c757d',
                          fontWeight: item.magazyn > 0 ? 'bold' : 'normal'
                        }}>
                          {item.magazyn > 0 ? item.magazyn : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              color: '#6c757d'
            }}>
              <p>Brak danych wykruku dla wybranego punktu sprzedaży i daty</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WykrukZDnia;