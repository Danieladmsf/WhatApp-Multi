# 🌊 Deploy WhatsApp Multi no Render

## 🚀 Vantagens do Render
- ✅ **750h/mês gratuito** (mais que Railway)
- ✅ Deploy automático do GitHub
- ✅ Interface simples e intuitiva
- ✅ Suporte completo para Node.js
- ✅ Health check automático
- ✅ SSL gratuito

## 📋 Passos para Deploy

### 1. 🔗 Criar conta no Render
- Acesse: https://render.com/
- Clique em "Get Started for Free"
- Faça login com sua conta GitHub
- Autorize o acesso aos repositórios

### 2. 🚀 Criar novo Web Service
- No dashboard, clique em "New +"
- Escolha "Web Service"
- Conecte seu repositório: `Danieladmsf/WhatApp-Multi`
- Branch: `main`

### 3. ⚙️ Configuração automática
O Render detectará automaticamente:
- **Runtime**: Node.js
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 10000 (configurado automaticamente)

### 4. 🔧 Configurar Variáveis de Ambiente
Na seção "Environment Variables", adicione:

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
WHATSAPP_HEADLESS=true
WHATSAPP_SESSION_NAME=whatsapp-bridge
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

### 5. 🔑 Upload do Firebase Service Account
- Vá em "Environment" → "Secret Files"
- Adicione um novo arquivo secreto:
  - **Filename**: `config/firebase/firebase-service-account.json`
  - **Contents**: Cole o conteúdo do seu arquivo JSON do Firebase

### 6. 🎯 Deploy
- Clique em "Create Web Service"
- O Render iniciará o build automaticamente
- Aguarde o deploy completar (cerca de 3-5 minutos)

## 📊 Pós-Deploy

### ✅ Verificar Status
- **Health Check**: `https://seu-app.onrender.com/health`
- **Logs**: Disponíveis no painel do Render
- **URL**: Render fornece URL automática

### 📱 Primeira Conexão WhatsApp
1. Monitore os logs no painel do Render
2. Procure por "QR Code generated"
3. O QR será salvo no Firebase
4. Escaneie no seu WhatsApp

### 🔄 Reconexão Automática
- Sistema recupera sessões após restart
- Não precisa escanear QR novamente
- Logs mostram "Successfully recovered session"

## 🛠️ Recursos Especiais

### 🌐 Health Check
- Endpoint: `/health`
- Retorna: `{"status": "ok", "service": "whatsapp-bridge"}`
- Render usa para verificar se app está funcionando

### 📊 Monitoring
- Render monitora automaticamente
- Reinicia em caso de falha
- Métricas disponíveis no dashboard

### 🔄 Auto-Deploy
- Commits no GitHub fazem deploy automático
- Sem necessidade de reconfiguração
- Rollback disponível se necessário

## 🔧 Troubleshooting

### 🐛 Problemas Comuns

**1. Puppeteer não funciona**
```bash
# Já configurado no projeto:
WHATSAPP_HEADLESS=true
```

**2. Firebase não conecta**
- Verifique se o arquivo JSON está correto
- Confirme as variáveis de ambiente
- Veja os logs para erros específicos

**3. Claude CLI não funciona**
- Verifique se está habilitado: `CLAUDE_CLI_ENABLED=true`
- Monitore logs para erros do Claude CLI

### 📋 Logs Úteis
Procure por estas mensagens nos logs:
- `✅ Firebase: Connected successfully`
- `✅ Successfully recovered session`
- `🎉 WhatsApp ready for user`
- `🤖 Claude CLI initialized`

## 💡 Dicas Importantes

### 💰 Plano Gratuito
- 750h/mês gratuito
- Reinicia automaticamente após inatividade
- Ideal para projetos pessoais

### 🚀 Performance
- Cold start: ~30 segundos
- Warm start: ~5 segundos
- Suitable para WhatsApp bot

### 🔄 Updates
- Git push → Deploy automático
- Não perde sessões WhatsApp
- Downtime mínimo

## 📞 Suporte
- Dashboard do Render tem logs detalhados
- Health check ajuda a identificar problemas
- Firebase logs para debug de sessões

## 🎉 Resultado Final
Após o deploy, você terá:
- ✅ WhatsApp Bot rodando 24/7
- ✅ Integração com Claude CLI
- ✅ Persistência no Firebase
- ✅ URL pública do Render
- ✅ Auto-restart em caso de falha