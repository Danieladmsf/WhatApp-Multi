# 📁 Estrutura do Projeto - WhatsApp Bridge

## 🗂️ Organização dos Diretórios

```
whatsapp-bridge/
├── 📋 README.md                    # Documentação principal
├── 📦 package.json                 # Dependências e scripts
├── ⚙️ ecosystem.config.js          # Configuração PM2
│
├── 📁 src/                         # Código fonte principal
│   ├── index.js                    # Ponto de entrada da aplicação
│   ├── managers/
│   │   └── SessionManager.js       # Gerenciamento de sessões WhatsApp
│   ├── services/
│   │   ├── FirebaseService.js      # Integração Firebase
│   │   └── ClaudeCLIService.js     # Integração Claude CLI
│   ├── utils/
│   │   ├── RateLimiter.js         # Controle de taxa
│   │   └── logger.js              # Sistema de logs
│   ├── scripts/
│   │   └── cleanup.js             # Scripts de limpeza
│   └── config/
│       └── (configurações futuras)
│
├── 📁 config/                      # Arquivos de configuração
│   └── firebase/
│       ├── firebase-service-account.json
│       ├── firebase.json
│       ├── firestore.indexes.json
│       └── firestore.rules
│
├── 📁 scripts/                     # Scripts auxiliares
│   ├── deployment/                 # Scripts de deploy
│   │   ├── auto-start.sh
│   │   ├── install.sh
│   │   ├── setup-autostart.sh
│   │   └── start-service.sh
│   └── service/                    # Scripts de serviço
│       ├── logs-viewer.sh
│       ├── service-control.sh
│       ├── whatsapp-bridge-daemon.sh
│       ├── whatsapp-bridge.conf
│       └── whatsapp-bridge.service
│
├── 📁 docs/                        # Documentação
│   ├── CLAUDE_AI_INTEGRATION.md   # Documentação Claude AI
│   └── PROJECT-STRUCTURE.md       # Este arquivo
│
├── 📁 bin/                         # Executáveis
│   └── whatsapp-bridge.js          # Script executável
│
├── 📁 logs/                        # Logs da aplicação
│   ├── app.log                     # Logs combinados
│   ├── error.log                   # Logs de erro
│   ├── out.log                     # Logs de saída
│   └── (outros logs...)
│
└── 📁 node_modules/                # Dependências (auto-gerado)
```

## 📋 Descrição das Pastas

### `/src` - Código Fonte Principal
- **Propósito**: Todo o código da aplicação
- **Organização**: Por responsabilidade (managers, services, utils)
- **Padrão**: Cada pasta representa uma camada da arquitetura

### `/config` - Configurações
- **Propósito**: Arquivos de configuração sensíveis
- **Firebase**: Credenciais e regras do Firebase
- **Segurança**: Contém arquivos com informações sensíveis

### `/scripts` - Scripts Auxiliares
- **deployment/**: Scripts para instalação e deploy
- **service/**: Scripts para gerenciamento de serviços (systemd, PM2)
- **Uso**: Automação de tarefas operacionais

### `/docs` - Documentação
- **Propósito**: Documentação técnica do projeto
- **Conteúdo**: Guias, integrações, estrutura
- **Manutenção**: Sempre atualizar quando adicionar features

### `/logs` - Logs da Aplicação
- **Propósito**: Armazenar logs estruturados
- **Rotação**: Logs são rotacionados automaticamente
- **Monitoramento**: Usados para debugging e monitoramento

### `/bin` - Executáveis
- **Propósito**: Scripts executáveis do projeto
- **CLI**: Ponto de entrada para linha de comando

## 🔧 Comandos Organizados

### Desenvolvimento
```bash
npm run dev              # Desenvolvimento
npm start               # Produção
npm run test            # Testes (se implementado)
```

### Deployment
```bash
bash scripts/deployment/install.sh        # Instalação completa
bash scripts/deployment/start-service.sh  # Iniciar serviço
bash scripts/deployment/auto-start.sh     # Configurar auto-start
```

### Monitoramento
```bash
bash scripts/service/logs-viewer.sh       # Ver logs
bash scripts/service/service-control.sh   # Controlar serviços
```

### Limpeza
```bash
node src/scripts/cleanup.js              # Limpeza padrão
node src/scripts/cleanup.js force        # Limpeza forçada
```

## 🛡️ Arquivos Sensíveis

### Proteção Necessária
- `config/firebase/firebase-service-account.json` - **CRÍTICO**
- `.env` - **CRÍTICO**
- `logs/*.log` - **MODERADO**

### .gitignore Recomendado
```gitignore
# Configurações sensíveis
config/firebase/firebase-service-account.json
.env
.env.local

# Logs
logs/*.log
*.log

# Dependências
node_modules/

# Dados temporários
.wwebjs_auth/
temp/
```

## 📊 Benefícios da Organização

### ✅ Vantagens
1. **Facilita manutenção** - Código organizado por responsabilidade
2. **Segurança** - Arquivos sensíveis separados
3. **Deploy simplificado** - Scripts organizados por função
4. **Documentação centralizada** - Fácil de encontrar informações
5. **Escalabilidade** - Estrutura preparada para crescer

### 🎯 Melhores Práticas
1. **Sempre documentar** mudanças na estrutura
2. **Manter separação** entre código, config e scripts
3. **Versionar configs** não sensíveis
4. **Automatizar tarefas** repetitivas com scripts
5. **Logs organizados** para facilitar debugging

## 🔄 Próximos Passos

1. **Implementar testes** em `/tests`
2. **Adicionar monitoring** em `/monitoring`
3. **Documentar APIs** em `/docs/api`
4. **Criar templates** em `/templates`
5. **Adicionar CI/CD** em `/.github`

---

**Estrutura organizada para máxima produtividade e manutenibilidade!** 🚀