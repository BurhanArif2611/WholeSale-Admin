// verify-modular-api.ts
const API = require('./lib/api');

console.log('--- API Modularization Verification ---');
const exportedKeys = Object.keys(API);
console.log('Total exported members:', exportedKeys.length);

const criticalFunctions = [
  'fetchStores', 
  'fetchStore', 
  'createStore', 
  'fetchOrders', 
  'createOrder', 
  'updateOrder', 
  'fetchMaterials', 
  'fetchProfile', 
  'fetchOwnerByFirmCode',
  'resolvePrice'
];

let allPassed = true;
criticalFunctions.forEach(fn => {
  if (typeof API[fn] === 'function') {
    console.log(`✅ ${fn} is exported correctly.`);
  } else {
    console.error(`❌ ${fn} is MISSING or not a function!`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n✨ VERIFICATION SUCCESS: All critical API functions are intact.');
} else {
  console.log('\n⚠️ VERIFICATION FAILED: Some functions are missing.');
  process.exit(1);
}
