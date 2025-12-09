# 🤖 Configuração do Chat IA com Gemini

## O que é?

O **Analista IA** é um chat interativo que analisa suas campanhas em tempo real e responde perguntas sobre performance, métricas e recomendações personalizadas.

## Como Funciona?

1. **Analisa seus dados reais**: campanhas, métricas, segmentação, horários
2. **Responde conversacionalmente**: como um consultor de marketing
3. **Dá recomendações acionáveis**: baseadas em benchmarks da indústria

## Configuração

### 1. Obter API Key do Gemini (GRATUITO)

1. Acesse: https://makersuite.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Get API Key" ou "Create API Key"
4. Copie a chave (começa com `AIzaSy...`)

### 2. Adicionar ao Projeto

Crie um arquivo `.env` na raiz do projeto:

```bash
VITE_GEMINI_API_KEY=AIzaSy...sua-chave-aqui
```

### 3. Pronto!

O chat IA já está integrado na página de **Relatórios**.

## Recursos

### ✅ O que o Chat IA pode fazer:

- **Analisar taxa de abertura e cliques**
  - _"Como está minha taxa de abertura?"_
  - _"Por que minha taxa de cliques está baixa?"_

- **Recomendar melhores horários**
  - _"Qual o melhor horário para enviar?"_
  - _"Quando minha audiência mais engaja?"_

- **Analisar assuntos que convertem**
  - _"Quais assuntos funcionam melhor?"_
  - _"Como melhorar meus títulos?"_

- **Identificar top campanhas**
  - _"Mostre minha melhor campanha"_
  - _"O que deu certo nas minhas campanhas?"_

- **Segmentar audiência**
  - _"Como está minha segmentação?"_
  - _"Quantos contatos engajados tenho?"_

- **Dar recomendações personalizadas**
  - _"Como melhorar meu engajamento?"_
  - _"O que devo fazer para crescer?"_

### 🎯 Exemplos de Perguntas:

```
"Como está minha taxa de abertura?"
"Qual o melhor horário para enviar?"
"Como melhorar meu engajamento?"
"Quais assuntos funcionam melhor?"
"Mostre minha melhor campanha"
"Quantos contatos tenho engajados?"
"Por que minha taxa de cliques é baixa?"
"Como posso melhorar meus resultados?"
```

## Tecnologia

- **Google Gemini 1.5 Flash**: Modelo de IA gratuito e rápido
- **Contexto em tempo real**: Usa dados direto do Firestore
- **Fallback inteligente**: Se API não funcionar, usa sistema de regras

## Limites

### Gemini Free Tier:
- ✅ **60 requisições por minuto**
- ✅ **1500 requisições por dia**
- ✅ **100% gratuito**

Mais que suficiente para uso em produção!

## Alternativas

Se quiser usar outra IA, é fácil adaptar:

### OpenAI (ChatGPT)
```typescript
// Substitua no AIAnalystChat.tsx
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [...]
})
```

### Claude (Anthropic)
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
})

const response = await anthropic.messages.create({
  model: 'claude-3-haiku-20240307',
  messages: [...]
})
```

## Segurança

⚠️ **IMPORTANTE**: Nunca commite a API key no repositório!

Adicione ao `.gitignore`:
```
.env
.env.local
```

Para deploy (Vercel/Netlify), adicione a variável de ambiente no painel de configurações.

## Custos

- **Gemini**: 100% Gratuito (60 req/min)
- **OpenAI**: ~$0.0005 por mensagem (GPT-3.5)
- **Claude**: ~$0.00025 por mensagem (Haiku)

**Recomendado**: Comece com Gemini (gratuito) e avalie se precisa de algo mais avançado.

## Troubleshooting

### "API Key inválida"
- Verifique se copiou a chave correta
- Certifique-se que está no `.env` com o prefixo `VITE_`
- Reinicie o servidor de desenvolvimento

### "Erro ao chamar IA"
- O sistema automaticamente usa fallback com respostas baseadas em regras
- Verifique o console para mais detalhes
- Confirme que tem internet

### "Respostas genéricas demais"
- Isso acontece quando usa o fallback (sem API key)
- Configure a API key do Gemini para respostas mais inteligentes

## Exemplo de Conversa

```
Usuário: Como está minha taxa de abertura?

IA: 🎯 Sua taxa de abertura está em 24.5%, acima da média 
de 18-22%! Isso é excelente! 

Seus assuntos estão funcionando bem, especialmente 
quando você usa personalização (nome do destinatário). 
Continue usando assuntos diretos e com senso de urgência.

Quer saber quais assuntos específicos tiveram melhor 
performance?

---

Usuário: Sim, quais assuntos funcionaram melhor?

IA: 📧 **Seus padrões vencedores:**

1. ✨ **Personalização** (+32% vs média)
   - 8 campanhas usaram
   - Taxa de abertura: 31.2%

2. ⚡ **Urgência** (+18% vs média)  
   - 5 campanhas usaram
   - Taxa de abertura: 26.8%

3. 🔢 **Números** (+12% vs média)
   - 3 campanhas usaram  
   - Taxa de abertura: 24.1%

💡 **Recomendação**: Combine personalização + urgência 
para máxima eficácia. Ex: "João, últimas horas para 
aproveitar 50% OFF!"
```

## Próximas Melhorias

- [ ] Gerar campanhas automaticamente baseadas em análises
- [ ] Sugerir listas de segmentação
- [ ] Prever melhor horário para cada contato
- [ ] Análise de sentimento dos assuntos
- [ ] A/B testing automático

---

**Desenvolvido com ❤️ para Turmail SaaS**
