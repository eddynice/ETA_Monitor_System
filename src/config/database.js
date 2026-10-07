const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fortecho_eta",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("MySQL database connection successful.");

        connection.release();

        return true;
    } catch (error) {
        console.error(
            "MySQL database connection failed:",
            error.message
        );

        return false;
    }
}

module.exports = {
    pool,
    testDatabaseConnection
};