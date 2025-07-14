# 🚀 Deploy Guide - WhatsApp Multi

## 📋 Opções de Deploy

### 1. 🌊 **Render** (Recomendado)
- **Plano gratuito**: 750h/mês
- **Recursos**: 512MB RAM, 0.1 CPU
- **Ideal para**: Desenvolvimento e testes (1-10 usuários)

**Passos:**
1. Acesse: https://render.com/
2. Conecte repositório GitHub
3. Configure variáveis de ambiente
4. Deploy automático

### 2. 🚀 **Railway**
- **Plano gratuito**: 500h/mês  
- **Recursos**: 512MB RAM, 0.1 CPU
- **Ideal para**: Desenvolvimento (1-5 usuários)

**Passos:**
1. Acesse: https://railway.app/
2. Conecte repositório GitHub
3. Configure variáveis de ambiente
4. Deploy automático

### 3. 🏗️ **VPS/Cloud** (Produção)
- **Recomendado**: DigitalOcean, AWS EC2
- **Recursos mínimos**: 4GB RAM, 2 CPUs
- **Ideal para**: Produção (50+ usuários)

## ⚙️ Variáveis de Ambiente Obrigatórias

```env
NODE_ENV=production
LOG_LEVEL=info
FIREBASE_DATABASE_URL=sua-url-firebase
FIREBASE_PROJECT_ID=seu-projeto-id
CLAUDE_CLI_ENABLED=true
WHATSAPP_HEADLESS=true
PORT=3000
```

## 🔑 Firebase Setup

1. Faça upload do arquivo `config/firebase/firebase-service-account.json`
2. Configure as variáveis de ambiente do Firebase
3. Verifique as regras do Firestore

## 📊 Capacidade por Plataforma

| Plataforma | RAM | CPU | Usuários | Custo |
|------------|-----|-----|----------|-------|
| Render Free | 512MB | 0.1 | 1-10 | $0 |
| Railway Free | 512MB | 0.1 | 1-5 | $0 |
| DigitalOcean | 4GB | 2 | 50-100 | $20/mês |
| AWS EC2 | 4GB+ | 2+ | 100+ | $15-30/mês |

## 🛠️ Troubleshooting

### Puppeteer Issues
- Certifique-se que `WHATSAPP_HEADLESS=true`
- Verifique se há recursos suficientes

### Firebase Connection
- Valide o arquivo service account JSON
- Confirme as variáveis de ambiente
- Verifique permissões do Firestore

### Claude CLI
- Verifique se `CLAUDE_CLI_ENABLED=true`
- Confirme instalação do Claude CLI no ambiente