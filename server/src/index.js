const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { initDatabase, getDbType } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        console.log('🚀 Initializing RentWise Backend System...');
        await initDatabase();

        app.listen(PORT, () => {
            console.log(`\n==================================================`);
            console.log(`🏠 RENTWISE API Server is running on port ${PORT}`);
            console.log(`📊 Active Database Engine: ${getDbType()}`);
            console.log(`🌐 Base URL: http://localhost:${PORT}/api`);
            console.log(`==================================================\n`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
