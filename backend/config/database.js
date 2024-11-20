const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,  // Include the port
    dialect: 'mysql',
    pool: {
        max: 60,            
        min: 3,             
        acquire: 30000,     
        idle: 10000         
    },
    define: {
        timestamps: false  
    }
});

module.exports = sequelize;