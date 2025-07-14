# 🏗️ WhatsApp Multi-Process Bridge - Arquitetura

## 📋 Visão Geral

O WhatsApp Bridge é uma solução multi-processo que permite **múltiplas conexões WhatsApp simultâneas**, cada uma com sua própria instância do Claude CLI. Cada usuário recebe um processo Node.js isolado e independente.

## 🎯 Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSO PRINCIPAL                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐│
│  │  WhatsAppBridge │  │  ProcessManager  │  │  Firebase   ││
│  │    (Core)       │  │     (Core)       │  │  Listener   ││
│  └─────────────────┘  └──────────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
           ┌────────▼───┐ ┌───▼────┐ ┌──▼─────┐
           │ Worker A   │ │Worker B│ │Worker C│
           │ (User 1)   │ │(User 2)│ │(User 3)│
           │            │ │        │ │        │
           │ WhatsApp + │ │WhatsApp│ │WhatsApp│
           │ Claude CLI │ │Claude  │ │Claude  │
           └────────────┘ └────────┘ └────────┘
```

## 📁 Estrutura de Diretórios

```
src/
├── 🎯 core/                    # Componentes principais
│   ├── WhatsAppBridge.js       # Bridge principal (orquestrador)
│   └── ProcessManager.js       # Gerenciador de processos
│
├── 👤 workers/                 # Processos de usuário
│   └── WhatsAppWorker.js       # Worker isolado (WhatsApp + Claude)
│
├── 🔧 services/               # Serviços compartilhados
│   ├── FirebaseService.js     # Integração Firebase
│   └── ClaudeCLIService.js    # Integração Claude CLI
│
├── ⚙️ constants/              # Configurações
│   └── config.js              # Constantes centralizadas
│
├── 🛠️ managers/               # Gerenciadores
│   └── SessionManager.js      # Gerenciamento de sessões
│
├── 📊 utils/                  # Utilitários
│   ├── logger.js              # Sistema de logs
│   └── RateLimiter.js         # Controle de taxa
│
└── 📋 index.js                # Ponto de entrada
```

## 🔄 Fluxo de Funcionamento

### 1. **Inicialização**
```javascript
// src/index.js
const bridge = new WhatsAppBridge();
bridge.start();
```

### 2. **Detecção de Solicitação**
```
Firebase user_sessions → status: "create_requested" → Bridge detecta
```

### 3. **Criação de Processo**
```javascript
// ProcessManager cria worker isolado
spawn('node', ['src/workers/WhatsAppWorker.js'], {
    env: { WORKER_USER_ID: userId }
});
```

### 4. **Worker Execução**
```
Worker inicia → Firebase + Claude CLI → WhatsApp Client → QR Code → Conexão
```

## 🎛️ Componentes Principais

### 🎯 WhatsAppBridge (Core)
- **Responsabilidade**: Orquestração geral do sistema
- **Funções**:
  - Monitora Firebase para solicitações
  - Coordena criação/destruição de processos
  - Gerencia lifecycle da aplicação

### 👥 ProcessManager (Core)  
- **Responsabilidade**: Gerenciamento de processos de usuário
- **Funções**:
  - Cria processos isolados via `spawn()`
  - Monitora PIDs e status
  - Cleanup graceful de processos

### 👤 WhatsAppWorker (Worker)
- **Responsabilidade**: Processo isolado por usuário
- **Funções**:
  - WhatsApp Client dedicado
  - Claude CLI dedicado  
  - Processamento de mensagens
  - Geração de QR codes

## 🔧 Configurações Centralizadas

### src/constants/config.js
```javascript
module.exports = {
    PROCESS: {
        WORKER_SCRIPT: 'src/workers/WhatsAppWorker.js',
        GRACEFUL_SHUTDOWN_TIMEOUT: 5000
    },
    WHATSAPP: {
        QR_CODE_CONFIG: { width: 512, margin: 2 },
        PUPPETEER_ARGS: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    FIREBASE: {
        COLLECTIONS: { USER_SESSIONS: 'user_sessions' },
        STATUS: { CREATE_REQUESTED: 'create_requested' }
    }
};
```

## 🔒 Isolamento e Segurança

### **Processo por Usuário**
- Cada usuário = processo Node.js separado
- Crash de um usuário não afeta outros
- Recursos isolados (memoria, CPU)

### **Sessions Independentes**
- `clientId` único por usuário: `whatsapp-bridge-${userId}`
- Diretórios `.wwebjs_auth` separados
- Contexto Claude CLI independente

### **Firebase Seguro**
- Credenciais compartilhadas (read-only workers)
- Collections isoladas por usuário
- Rate limiting por processo

## 📊 Monitoramento

### **Logs Estruturados**
```
[userId] 📱 QR Code generated for user: xxx
[userId] 🎉 WhatsApp ready for user: xxx  
[userId] 📥 Message received for user xxx
```

### **Métricas de Processo**
- PID tracking
- Status monitoring (starting, running, crashed)
- Restart counters
- Memory usage per process

## 🚀 Escalabilidade

### **Horizontal**
- Adicione quantos usuários quiser
- Cada usuário = processo isolado
- RAM: ~100-200MB por usuário
- CPU: Distribuído entre processos

### **Performance**
- Spawning rápido de processos
- Cleanup automático de recursos
- Logs otimizados por processo

## 🛡️ Recuperação de Falhas

### **Graceful Shutdown**
```javascript
// SIGTERM → 5s timeout → SIGKILL
process.kill(pid, 'SIGTERM');
setTimeout(() => process.kill(pid, 'SIGKILL'), 5000);
```

### **Process Restart**
- Detecção automática de crashes
- Restart automático com limite
- Preservação de estado Firebase

## 🔗 Integração

### **Firebase Collections**
- `user_sessions` - Status de conexão por usuário
- `sessions` - Dados de sessão WhatsApp  
- `messages` - Mensagens processadas

### **Claude CLI**
- Processo dedicado por usuário
- Context isolation
- Independent rate limiting

---

## 🤖 Claude CLI Permanente por Instância

### **Chat Permanente**
- **Claude CLI interativo** permanece ativo durante toda sessão do usuário
- **Contexto preservado** em memória do CLI entre mensagens
- **Sem reinicialização** desnecessária - economia de recursos

### **Contexto Inteligente**
```
Message 1 → Claude CLI (Context: Empty)
Message 2 → Claude CLI (Context: Message 1)
Message 3 → Claude CLI (Context: Messages 1-2)
...
Message 50 → Context Limit Reached
           ↓
     Auto Summary Generation (pelo próprio Claude)
           ↓
     New CLI Session with Summary as Context
           ↓
Message 51 → Claude CLI (Context: Summary + Message 51)
```

### **Sistema de Resumo Automático**
- **Detecção automática** de limite de contexto
- **Resumo inteligente** gerado pelo próprio Claude CLI
- **Preservação de informações importantes** em 3-4 parágrafos
- **Continuidade perfeita** da conversa

### **Sincronização Completa**
```
WhatsApp Connected    → Claude CLI Started
WhatsApp Disconnected → Claude CLI Cleanup
Process Terminated    → All Resources Freed
System Restart       → Recovery with Context
```

### **Arquitetura de Cleanup**
```
User Disconnection
       ↓
WhatsApp Client.on('disconnected')
       ↓
ClaudeCLIService.cleanup()
       ↓
Process SIGTERM → Graceful Shutdown
       ↓
Chrome Temp Cleanup + Memory Free
       ↓
No Orphaned Processes
```

### **Vantagens Principais**
- ✅ **Chat permanente** - Claude "lembra" da conversa inteira
- ✅ **Resumo inteligente** - Não perde contexto em conversas longas  
- ✅ **Zero acúmulo** - Terminais são sempre limpos após desconexão
- ✅ **Sincronização total** - WhatsApp ↔ Claude CLI sempre sincronizados
- ✅ **Recovery completo** - Contexto preservado mesmo após restart

Esta arquitetura garante **máxima escalabilidade**, **isolamento completo** e **contexto inteligente permanente** para múltiplas conexões WhatsApp simultâneas com Claude AI! 🚀