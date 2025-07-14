# Deploy WhatsApp Multi no Railway

## 🚀 Passos para Deploy

### 1. Criar conta no Railway
- Acesse: https://railway.app/
- Faça login com sua conta GitHub
- Autorize o acesso aos repositórios

### 2. Configurar Firebase
- Copie o arquivo `firebase-service-account.json` para Railway
- Configure as variáveis de ambiente do Firebase

### 3. Configurar Variáveis de Ambiente
No Railway, adicione estas variáveis:

```
NODE_ENV=production
LOG_LEVEL=info
FIREBASE_DATABASE_URL=https://cotao-online-default-rtdb.firebaseio.com/
FIREBASE_PROJECT_ID=cotao-online
CLAUDE_CLI_ENABLED=true
CLAUDE_CLI_COMMAND=claude
CLAUDE_CLI_TIMEOUT=30000
CLAUDE_CLI_MAX_REQUESTS=10
CLAUDE_CLI_WINDOW_MS=60000
PORT=3000
WHATSAPP_HEADLESS=true
SESSION_SECRET=your-session-secret-here
ENCRYPTION_KEY=your-encryption-key-here
```

### 4. Deploy
- Conecte seu repositório GitHub
- Railway automaticamente detectará o projeto Node.js
- O deploy será iniciado automaticamente

## 📋 Pós-Deploy

### Logs
- Veja os logs no painel do Railway
- Verifique se o sistema inicializou corretamente

### Firebase
- Confirme que a conexão com Firebase está funcionando
- Verifique se as sessões são salvas corretamente

### WhatsApp
- Primeiro QR code será gerado automaticamente
- Escaneie no seu WhatsApp para conectar

## 🔧 Troubleshooting

### Puppeteer no Railway
- O projeto está configurado para usar Puppeteer no Railway
- Headless mode está habilitado para produção

### Logs
- Use o painel do Railway para ver logs em tempo real
- Procure por erros na inicialização

### Firebase
- Certifique-se que o arquivo de service account está correto
- Verifique as permissões do Firebase

## 🌐 Domínio
- Railway fornece um domínio automático
- Você pode configurar domínio personalizado se necessário

## 💡 Dicas
- Railway tem 500h gratuitas por mês
- O serviço reinicia automaticamente em caso de falha
- Logs ficam disponíveis no painel

## 🔄 Atualizações
- Commits no GitHub fazem deploy automático
- Não é necessário reconfigurar variáveis de ambiente