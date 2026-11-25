require("dotenv").config(); //carrega as variáveis de ambiente do arquivo .env

const coletasRoutes = require("./routes/coletas.routes"); //importa as rotas relacionadas às coletas, que são definidas no arquivo coletas.routes.js e serão utilizadas para gerenciar as requisições HTTP relacionadas às coletas na API
const express = require("express"); //importa o framework Express, que é utilizado para criar o servidor web e gerenciar as rotas da API
const cors = require("cors"); //importa o middleware CORS, que permite que a API seja acessada por diferentes origens (domínios) e evita problemas de segurança relacionados a requisições cross-origin
const database = require("./config/database"); //importa a configuração do banco de dados, que é definida no arquivo database.js e contém as informações necessárias para estabelecer a conexão com o banco de dados MySQL utilizado pela API 

const app = express(); //cria uma instância do aplicativo Express, que será utilizada para definir as rotas, middlewares e configurações da API

app.use(cors({ 
    origin: process.env.FRONTEND_URL //define a origem permitida para acessar a API, que é especificada na variável de ambiente FRONTEND_URL e garante que apenas o frontend autorizado possa fazer requisições para a API
})); 

app.use(express.json()); //configura o middleware para interpretar o corpo das requisições como JSON, permitindo que a API receba e processe dados enviados no formato JSON
app.use("/api/coletas", coletasRoutes); //define a rota base "/api/coletas" para as rotas relacionadas às coletas, que são gerenciadas pelo roteador importado do arquivo coletas.routes.js. Isso significa que todas as requisições para "/api/coletas" serão tratadas pelas rotas definidas nesse arquivo

app.get("/api/health", async (req, res) => { //rota para verificar a saúde da API e a conexão com o banco de dados, respondendo com informações sobre o status da API e do banco de dados
try {
await database.query("SELECT 1"); //executa uma consulta simples no banco de dados para verificar se a conexão está funcionando corretamente. Se a consulta for bem-sucedida, significa que o banco de dados está acessível e a API está saudável

res.json({
status: "ok",
database: "connected"
});
} catch (error) {
console.error("Falha ao conectar ao banco:", error.message); //registra no console uma mensagem de erro caso a conexão com o banco de dados falhe, permitindo que os desenvolvedores identifiquem e solucionem problemas relacionados à conexão com o banco de dados

res.status(500).json({
status: "error",
database: "disconnected" //indica que a conexão com o banco de dados falhou, retornando um status HTTP 500 (Internal Server Error) e uma mensagem informando que o banco de dados está desconectado
});
}
});

const port = process.env.PORT || 3000;
app.use("/api", (req, res) => {
    res.status(404).json({
    message: "Endpoint da API não encontrado."
});
}); //define um middleware para lidar com requisições para endpoints da API que não foram encontrados, retornando um status HTTP 404 (Not Found) e uma mensagem informando que o endpoint solicitado não existe. Isso ajuda a fornecer feedback adequado aos clientes da API quando eles tentam acessar rotas inválidas ou inexistentes

app.use((error, req, res, next) => {
    console.error("Erro na API:", error.message);

    res.status(500).json({
    message: "Ocorreu um erro interno. Tente novamente."
});
}); //define um middleware de tratamento de erros para capturar e lidar com erros que ocorrem durante o processamento das requisições na API. Ele registra a mensagem de erro no console e retorna uma resposta HTTP 500 (Internal Server Error) com uma mensagem genérica informando que ocorreu um erro interno, garantindo que os clientes da API recebam feedback adequado em caso de falhas inesperadas    

app.listen(port, () => {
console.log(`API disponível em http://localhost:${port}`);
}); //inicia o servidor Express na porta especificada (definida na variável de ambiente PORT ou padrão 3000) e exibe uma mensagem no console indicando que a API está disponível e pronta para receber requisições. Isso permite que os desenvolvedores saibam que o servidor foi iniciado com sucesso e está acessível no endereço fornecido