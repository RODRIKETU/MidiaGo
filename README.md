# MidiaGo

MidiaGo é uma plataforma de streaming e gerenciamento de mídia focada no meio empresarial, com uma interface minimalista e recursos de segurança para proteção do conteúdo. A aplicação permite o upload de vídeos, definição de níveis de acesso (público ou privado) e streaming seguro do conteúdo através de uma API documentada.

## Tecnologias

*   **Backend:** Node.js, Express.js
*   **Banco de Dados:** MySQL / MariaDB (via `mysql2`)
*   **Upload de Arquivos:** Multer
*   **Autenticação:** JSON Web Tokens (JWT) e Bcrypt para senhas
*   **Frontend:** HTML5, Vanilla CSS (com variáveis CSS e modo escuro) e Vanilla JavaScript
*   **Documentação da API:** Swagger (`swagger-jsdoc` e `swagger-ui-express`)

## Pré-requisitos

*   Node.js (versão 18+ recomendada)
*   MySQL ou MariaDB rodando localmente (ou acesso a um banco de dados remoto)
*   Git (opcional, para controle de versão)

## Instalação e Configuração

### 1. Clonando o repositório

Se você clonou este repositório via Git, entre no diretório da aplicação:

```bash
cd MidiaGo
```

### 2. Instalação de Dependências

Instale as dependências do projeto através do NPM:

```bash
npm install
```

### 3. Configuração do Banco de Dados

Crie ou edite o arquivo `.env` na raiz do projeto contendo suas credenciais do banco de dados MySQL/MariaDB e outras configurações essenciais.

Exemplo de `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
# Coloque a senha do seu banco de dados
DB_PASSWORD=sua_senha_aqui 
DB_NAME=midiago
JWT_SECRET=sua_chave_secreta_aqui
```

### 4. Inicialização do Banco de Dados

Após configurar o arquivo `.env`, execute o script de inicialização do banco. Ele criará o banco de dados `midiago`, a estrutura das tabelas `users` e `media`, e irá inserir os usuários padrões.

```bash
npm run init-db
```

**Usuários Padrões Criados:**
*   **Usuário (Superadmin):** `superadmin` / **Senha:** `123`
*   **Usuário (Comum):** `usuario` / **Senha:** `123`

### 5. Executando a Aplicação

Para iniciar o servidor em ambiente de desenvolvimento (com recarregamento automático utilizando o `nodemon`), execute:

```bash
npm run dev
```

O servidor será iniciado na porta especificada no seu arquivo `.env` (padrão: 3000).

Para rodar em ambiente de produção sem o nodemon, utilize:
```bash
npm start
```

## Acessando o Sistema

*   **Painel Administrativo (Frontend):** Abra o navegador e acesse `http://localhost:3000`. Você verá a tela de login. Use as credenciais inseridas pelo script (`superadmin` / `123`) para entrar.
*   **Documentação da API (Swagger):** Acesse `http://localhost:3000/api-docs` para explorar e testar os endpoints expostos pela aplicação, tais como relatórios de usuário, listagem da mídia e consumo do player de vídeo.

## Sobre o Consumo de Mídias (Privadas vs Públicas)

O MidiaGo implementa uma barreira de acesso simples e forte:
*   Mídias cadastradas como **Públicas** podem ser consumidas apenas usando a URL do stream gerada.
*   Mídias marcadas como **Privadas** retornam erro `403 Forbidden` a menos que um JWT ou um **Token Pessoal** autêntico seja passado, tornando a incorporação em outros aplicativos corporativos fácil e segura (utilize o Header `x-personal-token` ou parâmetro `token`). O *Token Pessoal* pode ser gerado acessando o menu de Perfil dentro do próprio Dashboard.

---
Desenvolvido como projeto prático baseado em uma arquitetura EAD base.
