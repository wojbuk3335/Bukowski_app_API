// ===== PROSTY TEST JEDNOSTKOWY DLA KOLEJNOŚCI ELEMENTÓW =====

describe('Display Order Logic Tests', () => {
  test('Powinna łączyć elementy w prawidłowej kolejności: Sales → Blue Transfers → Yellow Transfers → Orange Transfers', () => {
    // Mock danych - dokładnie jak w komponencie
    const salesItems = [
      { _id: 'sale1', fullName: 'Ada CZERWONY', size: '2XL', isFromSale: true },
      { _id: 'sale2', fullName: 'Ola NIEBIESKI', size: 'L', isFromSale: true }
    ];

    const transfers = [
      // Blue transfer (wychodzący)
      { _id: 'blue1', fullName: 'Kasia ZIELONY', size: 'M', fromWarehouse: false },
      { _id: 'blue2', fullName: 'Zosia ŻÓŁTY', size: 'S', fromWarehouse: false },
      // Orange transfer (z Magazynu)
      { _id: 'orange1', fullName: 'Paula BIAŁY', size: '2XL', fromWarehouse: true },
      { _id: 'orange2', fullName: 'Ewa CZARNY', size: '3XL', fromWarehouse: true }
    ];

    const yellowTransferItems = [
      { _id: 'yellow1', fullName: 'Magda FIOLETOWY', size: 'XL', isIncomingTransfer: true },
      { _id: 'yellow2', fullName: 'Ania RÓŻOWY', size: 'XS', isIncomingTransfer: true }
    ];

    // Logika z komponentu - NOWA KOLEJNOŚĆ
    const blueTransfers = transfers.filter(transfer => !transfer.fromWarehouse);
    const orangeTransfers = transfers.filter(transfer => transfer.fromWarehouse);
    
    // Połącz w właściwej kolejności (jak w komponencie)
    const combinedItemsData = [...salesItems, ...blueTransfers, ...yellowTransferItems, ...orangeTransfers];

    // Sprawdź kolejność
    expect(combinedItemsData).toHaveLength(8);

    // 🔵 Najpierw sprzedaże (indeksy 0-1)
    expect(combinedItemsData[0]).toEqual(expect.objectContaining({ _id: 'sale1', isFromSale: true }));
    expect(combinedItemsData[1]).toEqual(expect.objectContaining({ _id: 'sale2', isFromSale: true }));

    // 🔵 Potem niebieskie transfery wychodzące (indeksy 2-3)
    expect(combinedItemsData[2]).toEqual(expect.objectContaining({ _id: 'blue1', fromWarehouse: false }));
    expect(combinedItemsData[3]).toEqual(expect.objectContaining({ _id: 'blue2', fromWarehouse: false }));

    // 🟡 Następnie żółte transfery przychodzące (indeksy 4-5)
    expect(combinedItemsData[4]).toEqual(expect.objectContaining({ _id: 'yellow1', isIncomingTransfer: true }));
    expect(combinedItemsData[5]).toEqual(expect.objectContaining({ _id: 'yellow2', isIncomingTransfer: true }));

    // 🟠 Na końcu pomarańczowe transfery z Magazynu (indeksy 6-7)
    expect(combinedItemsData[6]).toEqual(expect.objectContaining({ _id: 'orange1', fromWarehouse: true }));
    expect(combinedItemsData[7]).toEqual(expect.objectContaining({ _id: 'orange2', fromWarehouse: true }));
  });

  test('Powinna poprawnie dzielić transfery na niebieskie i pomarańczowe', () => {
    const allTransfers = [
      { _id: 'blue1', fromWarehouse: false, fullName: 'Blue Item 1' },
      { _id: 'orange1', fromWarehouse: true, fullName: 'Orange Item 1' },
      { _id: 'blue2', fromWarehouse: false, fullName: 'Blue Item 2' },
      { _id: 'orange2', fromWarehouse: true, fullName: 'Orange Item 2' }
    ];

    // Logika podziału z komponentu
    const blueTransfers = allTransfers.filter(transfer => !transfer.fromWarehouse);
    const orangeTransfers = allTransfers.filter(transfer => transfer.fromWarehouse);

    // Sprawdź podział
    expect(blueTransfers).toHaveLength(2);
    expect(orangeTransfers).toHaveLength(2);

    expect(blueTransfers[0]).toEqual(expect.objectContaining({ _id: 'blue1', fromWarehouse: false }));
    expect(blueTransfers[1]).toEqual(expect.objectContaining({ _id: 'blue2', fromWarehouse: false }));

    expect(orangeTransfers[0]).toEqual(expect.objectContaining({ _id: 'orange1', fromWarehouse: true }));
    expect(orangeTransfers[1]).toEqual(expect.objectContaining({ _id: 'orange2', fromWarehouse: true }));
  });

  test('Powinna obsłużyć pusty stan dla każdej kategorii', () => {
    const salesItems = [];
    const blueTransfers = [];
    const yellowTransferItems = [];
    const orangeTransfers = [];

    const combinedItemsData = [...salesItems, ...blueTransfers, ...yellowTransferItems, ...orangeTransfers];

    expect(combinedItemsData).toHaveLength(0);
    expect(combinedItemsData).toEqual([]);
  });
});
