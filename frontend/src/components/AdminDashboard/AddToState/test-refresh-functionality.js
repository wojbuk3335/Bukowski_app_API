// Quick test script for the new refresh functionality
// Run this in browser console to test

console.log('🧪 Testing new refresh functionality...');

// Test 1: Check if custom dropdown elements exist
const dropdown = document.querySelector('.user-dropdown');
console.log('Custom dropdown found:', dropdown ? '✅' : '❌');

// Test 2: Check if refresh button exists
const refreshButton = document.querySelector('button[title*="Odśwież"]');
console.log('Refresh button found:', refreshButton ? '✅' : '❌');

// Test 3: Simulate click on refresh button
if (refreshButton) {
  console.log('🔄 Simulating refresh button click...');
  refreshButton.click();
}

// Test 4: Check console for refresh messages
console.log('Look for "🔄 Manual refresh triggered" or "🎯 User selected" messages in console');

console.log('🎯 Test complete! Check above for results.');
