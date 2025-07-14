#!/usr/bin/env node

/**
 * Mock Claude CLI para desenvolvimento e testes
 * Simula as respostas do Claude CLI sem usar o binário real
 */

const responses = [
    "Olá! Como posso ajudá-lo hoje?",
    "Entendi sua mensagem. Posso explicar mais sobre isso se desejar.",
    "Essa é uma pergunta interessante! Vou pensar sobre isso...",
    "Baseado no contexto da nossa conversa, posso sugerir algumas alternativas.",
    "Obrigado por compartilhar isso comigo. Há algo específico que gostaria de saber?",
    "Vou processar sua solicitação e retornar com uma resposta detalhada.",
    "Compreendo. Deixe-me elaborar uma resposta para você.",
    "Excelente pergunta! Vou explicar passo a passo.",
];

// Ler input do stdin
let input = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
    input += chunk;
    
    // Processar quando receber nova linha
    if (chunk.includes('\n')) {
        const message = input.trim();
        
        if (message) {
            // Simular delay de processamento
            setTimeout(() => {
                // Escolher resposta aleatória
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                // Simular contexto se a mensagem contém certas palavras
                let contextualResponse = response;
                if (message.toLowerCase().includes('código')) {
                    contextualResponse = "Vou ajudá-lo com código. Que linguagem você está usando?";
                } else if (message.toLowerCase().includes('erro')) {
                    contextualResponse = "Vou analisar esse erro para você. Pode me mostrar mais detalhes?";
                } else if (message.toLowerCase().includes('explicar')) {
                    contextualResponse = "Claro! Vou explicar isso de forma detalhada para você.";
                }
                
                // Enviar resposta
                console.log(contextualResponse);
                console.log(); // Linha vazia para indicar fim da resposta
                
            }, 1000 + Math.random() * 2000); // Delay de 1-3 segundos
        }
        
        input = '';
    }
});

process.stdin.on('end', () => {
    console.log("Mock Claude CLI detectou fim de stdin, mas continuando...");
    // Não sair imediatamente, aguardar SIGTERM/SIGINT explícito
});

// Handler de sinais
process.on('SIGTERM', () => {
    console.log("Mock Claude CLI recebeu SIGTERM");
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log("Mock Claude CLI recebeu SIGINT");
    process.exit(0);
});

// Indicar que está pronto
setTimeout(() => {
    console.log("Mock Claude CLI ready");
    console.log();
}, 500);