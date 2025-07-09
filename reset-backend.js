const fs = require('fs');
const path = require('path');

console.log('🔄 Resetting Trading Bot Backend...');

// Check if database file exists and delete it
const dbPath = path.join(__dirname, 'trading-bot.db');
if (fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath);
        console.log('✅ Deleted existing database file');
    } catch (error) {
        console.log('❌ Error deleting database file:', error.message);
    }
} else {
    console.log('ℹ️ No existing database file found');
}

// Check for any backup files and delete them
const backupFiles = [
    'trading-bot.db.backup',
    'trading-bot.db.old',
    'trading-bot.db.bak'
];

backupFiles.forEach(backupFile => {
    const backupPath = path.join(__dirname, backupFile);
    if (fs.existsSync(backupPath)) {
        try {
            fs.unlinkSync(backupPath);
            console.log(`✅ Deleted backup file: ${backupFile}`);
        } catch (error) {
            console.log(`❌ Error deleting backup file ${backupFile}:`, error.message);
        }
    }
});

console.log('✅ Backend reset complete!');
console.log('');
console.log('📋 Next steps:');
console.log('1. Start the backend server: node server.js');
console.log('2. Start your proxy servers: node binance-proxy.js and node kraken-proxy.js');
console.log('3. Start your web server: python -m http.server 8000');
console.log('4. Open http://localhost:8000 in your browser');
console.log('5. Clear browser localStorage by opening browser console and running:');
console.log('   localStorage.clear();');
console.log('6. Refresh the page to start fresh'); 