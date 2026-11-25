//prepara a conexão com o MySQL

require("dotenv").config(); //carrega as variaveis do env
const mysql = require("mysql2/promise"); //pacote que permite a conexão com o MySQL
const pool = mysql.createPool({ // cria uma gama de conexões que a API pode utilizar
host: process.env.DB_HOST,
port: Number(process.env.DB_PORT),
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
waitForConnections: true, //espera a conexão ficar disponível
connectionLimit: 10 //ate 10 conexões simultâneas
}); //lê tudo que é necessário do env e cria a conexão com o banco de dados

module.exports = pool;  //exporta a conexão para ser utilizada em outros arquivos da API