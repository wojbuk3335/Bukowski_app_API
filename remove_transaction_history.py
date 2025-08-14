#!/usr/bin/env python3
import re

# Wczytaj plik
with open('frontend/src/components/AdminDashboard/AddToState/AddToState.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Usuń wszystkie linie zawierające słowa związane z transaction history
lines_to_remove = [
    'TransactionReportModal',
    'transactionHistory', 
    'showHistoryModal',
    'historyModalRef',
    'historySearchTerm',
    'filteredHistory',
    'expandedTransactions',
    'lastTransaction',
    'showTransactionReport',
    'selectedTransactionForReport',
    'isTransactionInProgress',
    'lastTransactionDetails',
    'loadTransactionHistory',
    'saveTransactionToDatabase',
    'deactivateTransactionInDatabase',
    'handleDeleteAllHistory',
    'performDeleteAllHistory',
    'handleUndoTransaction',
    'performUndoTransaction',
    'handleUndoSingleItem',
    'performUndoSingleItem',
    'showUndoOptions'
]

# Usuń linie zawierające te słowa kluczowe
lines = content.split('\n')
filtered_lines = []
skip_next = False

for i, line in enumerate(lines):
    should_skip = False
    
    # Sprawdź czy linia zawiera któreś ze słów kluczowych
    for keyword in lines_to_remove:
        if keyword in line:
            should_skip = True
            break
    
    if not should_skip:
        filtered_lines.append(line)

# Zapisz plik
with open('frontend/src/components/AdminDashboard/AddToState/AddToState.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(filtered_lines))

print("Usunięto wszystkie linie zawierające słowa kluczowe związane z transaction history")
