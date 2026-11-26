# EcoColeta

Aplicação web para cadastrar e acompanhar coletas de resíduos. O sistema possui uma interface web, uma API em Node.js e um banco de dados MySQL.

## Tecnologias

- HTML, CSS e JavaScript
- Node.js e Express
- MySQL e `mysql2`
- `cors` e `dotenv`

## Pré-requisitos

Antes de iniciar, instale:

- Node.js e npm
- MySQL Server e MySQL Workbench
- Visual Studio Code
- Extensão **Live Server** no VS Code

## 1. Baixar o projeto

Clone o repositório:

```powershell
git clone https://github.com/Milena5569/ecocoleta.git
cd ecocoleta
```

Se você já tem o projeto no computador, abra a pasta do projeto no VS Code e continue na próxima etapa.

## 2. Criar o banco e a tabela

1. Inicie o serviço MySQL Server.
2. Abra o MySQL Workbench e conecte-se ao servidor local.
3. Abra uma aba de consulta SQL e execute:

```sql
CREATE DATABASE IF NOT EXISTS ecocoleta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

4. No Workbench, abra e execute o arquivo `backend/sql/schema.sql`. Ele cria a tabela `coletas` e suas regras de validação.

## 3. Configurar as variáveis locais

No PowerShell, na pasta principal do projeto, execute:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Abra `backend/.env` no VS Code e informe a senha configurada para o usuário MySQL local. Exemplo:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_local
DB_NAME=ecocoleta
FRONTEND_URL=http://127.0.0.1:5500
```

Troque `sua_senha_local` pela sua senha do MySQL. O arquivo `.env` contém configurações privadas e não deve ser enviado ao GitHub.

## 4. Instalar as dependências e iniciar a API

No terminal do VS Code, entre na pasta `backend`:

```powershell
cd .\backend
npm.cmd install
npm.cmd run dev
```

Mantenha esse terminal aberto enquanto estiver usando o sistema. Para conferir a API, acesse:

```text
http://localhost:3000/api/health
```

A resposta esperada é:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## 5. Abrir o front-end

Com a API em execução:

1. No VS Code, localize `frontend/index.html`.
2. Clique com o botão direito no arquivo e escolha **Open with Live Server**.
3. O site será aberto em um endereço parecido com:

```text
http://127.0.0.1:5500/frontend/index.html
```

Abra o site pelo Live Server, e não diretamente pelo caminho `file:///...`. A origem do Live Server deve corresponder ao valor `FRONTEND_URL` configurado no `backend/.env`.

## 6. Usar o sistema

Na interface, é possível cadastrar coletas, consultar a tabela, editar e excluir registros, aplicar filtros e acompanhar os indicadores e gráficos do painel.

Os registros são armazenados no MySQL. Para conferir a lista retornada pela API, acesse:

```text
http://localhost:3000/api/coletas
```

## 7. Encerrar a API

No terminal em que a API está rodando, pressione **Ctrl+C**.

## Observação para PowerShell

Neste projeto, os comandos de npm estão escritos como `npm.cmd` para funcionar no PowerShell do Windows quando a execução de scripts do sistema estiver restrita. Em outros terminais, como Prompt de Comando, use `npm` no lugar de `npm.cmd`.


## Diferenciais

### Filtro de período do painel

O painel permite selecionar um mês inicial e um mês final. O intervalo inclui os dois meses escolhidos e atualiza os indicadores, o cartão “Precisa de atenção” e os gráficos.

Dentro do período selecionado:

- **Coletas** contabiliza todos os registros, independentemente do status.
- **Realizadas** exibe a quantidade e o percentual sobre o total do período.
- **Agendadas** contabiliza as coletas agendadas e mostra o selo de atenção quando houver alguma.
- **Peso destinado**, o gráfico mensal e a composição por resíduo consideram somente coletas realizadas.
- O cartão **Precisa de atenção** lista coletas agendadas com data passada dentro do período.

O sistema informa quando o mês inicial é posterior ao mês final. Ao limpar o período, os indicadores voltam a considerar todos os registros e o gráfico mensal retorna à exibição dos últimos seis meses.

### Cartão “Precisa de atenção”

O Painel exibe um cartão de destaque em azul-escuro quando existem coletas com status **Agendada** cuja data já passou. O cartão lista o cliente e a data de cada coleta pendente. Ele fica oculto quando não há registros nessa situação e, quando um período é selecionado no painel, considera apenas as coletas dentro do intervalo escolhido.

Favicon em SVG com a inicial e as cores da identidade visual do EcoColeta, exibido na aba do navegador.


