# 📱 WhatsApp Bridge - Multi-AI Integration

🤖 **Bridge inteligente entre WhatsApp e Claude AI usando Claude CLI**

## ✨ Características

- 🔗 **Integração WhatsApp**: Conecta diretamente ao WhatsApp Web
- 🤖 **Claude CLI**: Usa Claude Code CLI para respostas inteligentes
- 🔥 **Firebase**: Armazenamento de mensagens e sessões
- 🛡️ **Rate Limiting**: Controle de taxa de requisições
- 📊 **Monitoramento**: Logs detalhados e métricas
- 🔄 **Auto-restart**: Reinício automático em falhas
- 🛠️ **Scripts**: Automação completa de deploy e manutenção

## 🚀 Instalação Rápida

### 1. Clone e Configure
```bash
git clone <your-repo-url>
cd WhatApp-Multi
bash scripts/deployment/install.sh
```

### 2. Verificar Claude CLI
```bash
# Verificar se Claude CLI está funcionando
npm run verify-claude
```

### 3. Teste e Execute
```bash
# Verificar Claude CLI
npm run verify-claude

# Iniciar aplicação
npm start
```

## 📋 Pré-requisitos

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Claude CLI** instalado
- **Projeto Firebase** configurado

## ⚙️ Configuração

### Variáveis de Ambiente (.env)
```env
# WhatsApp Bridge Configuration
NODE_ENV=production
LOG_LEVEL=info

# Firebase Configuration
FIREBASE_DATABASE_URL=https://cotao-online-default-rtdb.firebaseio.com/
FIREBASE_PROJECT_ID=cotao-online

# Claude CLI Configuration (Ready to use)

# Claude CLI Configuration
CLAUDE_CLI_ENABLED=true
CLAUDE_CLI_COMMAND=claude
CLAUDE_CLI_TIMEOUT=30000
CLAUDE_CLI_MAX_REQUESTS=10
CLAUDE_CLI_WINDOW_MS=60000
```

### Firebase Setup
1. Coloque seu arquivo de credenciais em:
   ```
   config/firebase/firebase-service-account.json
   ```

## 🎯 Como Usar

### Comandos Básicos
```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Verificar Claude CLI
npm run verify-claude

# Ver status dos serviços
npm run check-services

# Limpeza
npm run cleanup
```

### Scripts de Gerenciamento
```bash
# Controle de serviços
bash scripts/service/service-control.sh [start|stop|restart|status]

# Ver logs
bash scripts/service/logs-viewer.sh

# Instalação completa
bash scripts/deployment/install.sh

# Configurar auto-start
bash scripts/deployment/setup-autostart.sh
```

## 🔧 Funcionalidades

### 🤖 Claude AI Integration
- **Claude CLI**: Interface otimizada para código
- **Rate Limiting**: 10 requests/minuto (configurável)
- **Context Support**: Mantém contexto da conversa
- **Error Handling**: Respostas de fallback

### 📱 WhatsApp Features
- **QR Code**: Escaneie para conectar
- **Auto-response**: Resposta automática com IA
- **Message Storage**: Todas mensagens salvas no Firebase
- **Session Management**: Gerenciamento de sessões ativo

### 🔥 Firebase Integration
- **Firestore**: Armazenamento de mensagens
- **Authentication**: Regras de segurança
- **Real-time**: Sincronização em tempo real

## 📊 Monitoramento

### Logs
```bash
# Ver logs da aplicação
tail -f logs/app.log

# Ver logs de erro
tail -f logs/error.log

# Ver logs em tempo real
bash scripts/service/logs-viewer.sh -f
```

### Health Checks
- Verificação automática do Claude CLI
- Monitoramento de rate limits
- Status do Firebase
- Métricas de performance

## 🛠️ Estrutura do Projeto

```
whatsapp-bridge/
├── 📋 README.md                    # Esta documentação
├── 📦 package.json                 # Dependências e scripts
├── ⚙️ ecosystem.config.js          # Configuração PM2
│
├── 📁 src/                         # Código fonte principal
│   ├── index.js                    # Ponto de entrada
│   ├── managers/
│   │   └── SessionManager.js       # Gerenciamento de sessões
│   ├── services/
│   │   ├── FirebaseService.js      # Integração Firebase
│   │   └── ClaudeCLIService.js     # Integração Claude CLI
│   ├── utils/
│   │   ├── RateLimiter.js         # Controle de taxa
│   │   └── logger.js              # Sistema de logs
│   └── scripts/
│       └── cleanup.js             # Scripts de limpeza
│
├── 📁 config/                      # Configurações
│   └── firebase/                   # Firebase configs
│
├── 📁 scripts/                     # Scripts auxiliares
│   ├── deployment/                 # Scripts de deploy
│   └── service/                    # Scripts de serviço
│
├── 📁 docs/                        # Documentação
│   ├── CLAUDE_CODE_CLI_INTEGRATION.md
│   ├── PROJECT-STRUCTURE.md
│   ├── ARCHITECTURE.md             # Arquitetura do sistema
│   ├── CHANGELOG.md                # Histórico de mudanças
│   └── DEPLOY.md                   # Guia de deploy
│
├── 📁 bin/                         # Executáveis
├── 📁 logs/                        # Logs da aplicação
└── 📁 node_modules/                # Dependências
```

## 🔒 Segurança

### Arquivos Sensíveis
- `config/firebase/firebase-service-account.json` - **CRÍTICO**
- `.env` - **CRÍTICO**
- `logs/*.log` - **MODERADO**

### Configurações de Segurança
- Claude CLI com autenticação integrada
- Rate limiting para prevenir abuso
- Regras do Firestore configuradas
- Logs não contêm informações sensíveis

## 🚨 Troubleshooting

### Problemas Comuns

#### "claude: command not found"
```bash
# Instalar Claude CLI
npm install -g @anthropic-ai/claude-code

# Verificar instalação
which claude
claude --version
```

#### "Claude CLI authentication failed"
```bash
# Verificar Claude CLI
npm run verify-claude

# Reinstalar se necessário
npm install -g @anthropic-ai/claude-code
```

#### WhatsApp não conecta
- Certifique-se que não há outra sessão ativa
- Delete a pasta `.wwebjs_auth` se necessário
- Verifique os logs: `tail -f logs/app.log`

#### Firebase errors
- Verifique o arquivo de credenciais
- Confirme as regras do Firestore
- Teste a conectividade

### Debug Mode
```bash
# Habilitar logs detalhados
export LOG_LEVEL=debug
npm start
```

### Scripts de Verificação
```bash
# Verificar todos os componentes
bash scripts/verify-claude-cli.sh

# Status dos serviços
bash scripts/service/service-control.sh status
```

## 📚 Documentação

- **[Claude CLI Integration](docs/CLAUDE_CODE_CLI_INTEGRATION.md)** - Guia completo do Claude CLI
- **[Project Structure](docs/PROJECT-STRUCTURE.md)** - Estrutura detalhada do projeto
- **[Deploy Guide](docs/DEPLOY.md)** - Guia completo de deploy
- **[Architecture](docs/ARCHITECTURE.md)** - Arquitetura do sistema
- **[Changelog](docs/CHANGELOG.md)** - Histórico de mudanças

## 🔄 Deploy em Produção

### Com PM2
```bash
# Instalar e configurar
bash scripts/deployment/install.sh
bash scripts/deployment/setup-autostart.sh

# Iniciar serviço
bash scripts/deployment/start-service.sh
```

### Com Systemd
```bash
# Copiar arquivo de serviço
sudo cp scripts/service/whatsapp-bridge.service /etc/systemd/system/

# Habilitar e iniciar
sudo systemctl enable whatsapp-bridge
sudo systemctl start whatsapp-bridge
```

## 📈 Performance

### Otimizações Implementadas
- Rate limiting inteligente
- Context management otimizado
- Logs rotativos automáticos
- Memory management

### Métricas Típicas
- **Tempo de resposta**: 2-5 segundos
- **Rate limit**: 10 req/min (configurável)
- **Memory usage**: ~100-200MB
- **CPU usage**: Baixo (<5%)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Add nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: Abra uma issue no GitHub
- **Documentação**: Verifique a pasta `docs/`
- **Logs**: Sempre inclua logs ao reportar problemas

---

**🤖 WhatsApp Bridge - Conectando conversas com inteligência artificial!**