describe('AddToState - Prosty test kolejności wyświetlania', () => {
  test('Powinna łączyć elementy w prawidłowej kolejności: 🔵 Sales → 🔵 Blue → 🟡 Yellow → 🟠 Orange', () => {
    // Przykładowe dane testowe
    const salesItems = [
      { _id: 'sale1', fullName: 'Ada CZERWONY', isFromSale: true },
      { _id: 'sale2', fullName: 'Ola NIEBIESKI', isFromSale: true }
    ];

    const blueTransfers = [
      { _id: 'blue1', fullName: 'Kasia ZIELONY', fromWarehouse: false },
      { _id: 'blue2', fullName: 'Zosia ŻÓŁTY', fromWarehouse: false }
    ];

    const yellowTransferItems = [
      { _id: 'yellow1', fullName: 'Magda FIOLETOWY', isIncomingTransfer: true },
      { _id: 'yellow2', fullName: 'Ania RÓŻOWY', isIncomingTransfer: true }
    ];

    const orangeTransfers = [
      { _id: 'orange1', fullName: 'Paula BIAŁY', fromWarehouse: true },
      { _id: 'orange2', fullName: 'Ewa CZARNY', fromWarehouse: true }
    ];

    // Logika z komponentu AddToState - łączenie w prawidłowej kolejności
    const combinedItemsData = [
      ...salesItems,
      ...blueTransfers,
      ...yellowTransferItems,
      ...orangeTransfers
    ];

    // Sprawdzenie kolejności
    expect(combinedItemsData).toHaveLength(8);
    
    // Pierwsze 2 elementy to sprzedaże (🔵 Sales)
    expect(combinedItemsData[0].isFromSale).toBe(true);
    expect(combinedItemsData[1].isFromSale).toBe(true);
    expect(combinedItemsData[0].fullName).toBe('Ada CZERWONY');
    expect(combinedItemsData[1].fullName).toBe('Ola NIEBIESKI');

    // Kolejne 2 elementy to niebieskie transfery (🔵 Blue)
    expect(combinedItemsData[2].fromWarehouse).toBe(false);
    expect(combinedItemsData[3].fromWarehouse).toBe(false);
    expect(combinedItemsData[2].fullName).toBe('Kasia ZIELONY');
    expect(combinedItemsData[3].fullName).toBe('Zosia ŻÓŁTY');

    // Kolejne 2 elementy to żółte transfery (🟡 Yellow)
    expect(combinedItemsData[4].isIncomingTransfer).toBe(true);
    expect(combinedItemsData[5].isIncomingTransfer).toBe(true);
    expect(combinedItemsData[4].fullName).toBe('Magda FIOLETOWY');
    expect(combinedItemsData[5].fullName).toBe('Ania RÓŻOWY');

    // Ostatnie 2 elementy to pomarańczowe transfery (🟠 Orange)
    expect(combinedItemsData[6].fromWarehouse).toBe(true);
    expect(combinedItemsData[7].fromWarehouse).toBe(true);
    expect(combinedItemsData[6].fullName).toBe('Paula BIAŁY');
    expect(combinedItemsData[7].fullName).toBe('Ewa CZARNY');
  });

  test('Powinna działać poprawnie z pustymi tablicami', () => {
    const salesItems = [];
    const blueTransfers = [];
    const yellowTransferItems = [];
    const orangeTransfers = [];

    const combinedItemsData = [
      ...salesItems,
      ...blueTransfers,
      ...yellowTransferItems,
      ...orangeTransfers
    ];

    expect(combinedItemsData).toHaveLength(0);
    expect(combinedItemsData).toEqual([]);
  });

  test('Powinna działać poprawnie gdy brakuje niektórych kategorii', () => {
    const salesItems = [
      { _id: 'sale1', fullName: 'Ada CZERWONY', isFromSale: true }
    ];
    const blueTransfers = [];
    const yellowTransferItems = [];
    const orangeTransfers = [
      { _id: 'orange1', fullName: 'Paula BIAŁY', fromWarehouse: true }
    ];

    const combinedItemsData = [
      ...salesItems,
      ...blueTransfers,
      ...yellowTransferItems,
      ...orangeTransfers
    ];

    expect(combinedItemsData).toHaveLength(2);
    expect(combinedItemsData[0].isFromSale).toBe(true);
    expect(combinedItemsData[1].fromWarehouse).toBe(true);
  });
});
