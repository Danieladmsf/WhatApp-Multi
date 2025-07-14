#!/usr/bin/env node

/**
 * Script para verificar sessões no Firebase
 * Verifica todos os documentos na coleção user_sessions e lista os status
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const FirebaseService = require('../src/services/FirebaseService');

async function checkFirebaseSessions() {
    console.log('🔍 Iniciando verificação das sessões no Firebase...\n');
    
    const firebaseService = new FirebaseService();
    
    // Aguardar inicialização do Firebase
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!firebaseService.isInitialized()) {
        console.error('❌ Erro: Firebase não foi inicializado corretamente');
        process.exit(1);
    }
    
    try {
        // Buscar todas as sessões de usuário
        const snapshot = await firebaseService.db.collection('user_sessions').get();
        
        if (snapshot.empty) {
            console.log('📭 Nenhuma sessão encontrada na coleção user_sessions');
            return;
        }
        
        const sessions = [];
        const statusCount = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const session = {
                userId: doc.id,
                status: data.status || 'sem_status',
                createdAt: data.createdAt ? data.createdAt.toDate() : null,
                updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
                ...data
            };
            
            sessions.push(session);
            
            // Contar status
            statusCount[session.status] = (statusCount[session.status] || 0) + 1;
        });
        
        // Ordenar por updatedAt (mais recente primeiro)
        sessions.sort((a, b) => {
            if (!a.updatedAt && !b.updatedAt) return 0;
            if (!a.updatedAt) return 1;
            if (!b.updatedAt) return -1;
            return b.updatedAt - a.updatedAt;
        });
        
        console.log(`📊 Total de sessões encontradas: ${sessions.length}\n`);
        
        // Exibir contagem por status
        console.log('📈 Contagem por status:');
        Object.entries(statusCount).forEach(([status, count]) => {
            const emoji = getStatusEmoji(status);
            console.log(`  ${emoji} ${status}: ${count}`);
        });
        
        // Destacar sessões conectadas
        const connectedSessions = sessions.filter(s => s.status === 'connected');
        if (connectedSessions.length > 0) {
            console.log(`\n🟢 SESSÕES CONECTADAS (${connectedSessions.length}):`);
            connectedSessions.forEach(session => {
                console.log(`  • User ID: ${session.userId}`);
                console.log(`    Status: ${session.status}`);
                console.log(`    Última atualização: ${session.updatedAt ? session.updatedAt.toLocaleString('pt-BR') : 'N/A'}`);
                console.log('');
            });
        }
        
        console.log('\n📋 TODAS AS SESSÕES:');
        console.log('─'.repeat(80));
        
        sessions.forEach((session, index) => {
            const emoji = getStatusEmoji(session.status);
            console.log(`${index + 1}. ${emoji} User ID: ${session.userId}`);
            console.log(`   Status: ${session.status}`);
            console.log(`   Criado em: ${session.createdAt ? session.createdAt.toLocaleString('pt-BR') : 'N/A'}`);
            console.log(`   Atualizado em: ${session.updatedAt ? session.updatedAt.toLocaleString('pt-BR') : 'N/A'}`);
            
            // Mostrar outros campos se existirem
            const otherFields = Object.keys(session).filter(key => 
                !['userId', 'status', 'createdAt', 'updatedAt'].includes(key)
            );
            
            if (otherFields.length > 0) {
                console.log('   Outros dados:');
                otherFields.forEach(field => {
                    const value = session[field];
                    if (value !== null && value !== undefined) {
                        console.log(`     ${field}: ${JSON.stringify(value)}`);
                    }
                });
            }
            
            console.log('');
        });
        
        // Verificar se existe discrepância com sessões locais
        console.log('🔍 Verificando sessões locais do WhatsApp...');
        const localSessionsCheck = await checkLocalSessions(connectedSessions, firebaseService);
        
        if (localSessionsCheck.length > 0) {
            console.log('\n⚠️  POSSÍVEIS INCONSISTÊNCIAS:');
            localSessionsCheck.forEach(issue => {
                console.log(`  • ${issue}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao buscar sessões:', error);
    }
}

function getStatusEmoji(status) {
    const emojiMap = {
        'connected': '🟢',
        'connecting': '🟡',
        'disconnected': '🔴',
        'create_requested': '🔵',
        'error': '❌',
        'pending': '⏳',
        'sem_status': '⚪'
    };
    
    return emojiMap[status] || '⚪';
}

async function checkLocalSessions(connectedSessions, firebaseService) {
    const issues = [];
    
    for (const session of connectedSessions) {
        try {
            const hasLocalSession = await firebaseService.checkLocalWhatsAppSession(session.userId);
            if (!hasLocalSession) {
                issues.push(`User ${session.userId} está 'connected' no Firebase mas não tem sessão local do WhatsApp`);
            }
        } catch (error) {
            issues.push(`Erro ao verificar sessão local para user ${session.userId}: ${error.message}`);
        }
    }
    
    return issues;
}

// Executar o script
if (require.main === module) {
    checkFirebaseSessions()
        .then(() => {
            console.log('✅ Verificação concluída!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Erro durante a verificação:', error);
            process.exit(1);
        });
}

module.exports = { checkFirebaseSessions };