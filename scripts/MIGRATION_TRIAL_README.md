# Migração de Limites do Trial

## Problema
Contas criadas antes da atualização dos planos estão com limites antigos do trial:
- ❌ 7 dias
- ❌ 350 emails total (50/dia)
- ❌ 5 campanhas
- ❌ 100 contatos

## Solução
Executar script de migração para atualizar para os novos limites:
- ✅ 14 dias
- ✅ 700 emails total (50/dia)
- ✅ Campanhas ILIMITADAS
- ✅ 1.000 contatos
- ✅ Templates ILIMITADOS

## Como Executar

### 1. Verificar Service Account
Certifique-se de que o arquivo `serviceAccount.json` está na raiz do projeto.

### 2. Executar Migração
```bash
node scripts/migrate-trial-limits.js
```

### 3. Verificar Resultado
O script mostrará:
- Total de contas trial encontradas
- Limites antigos vs novos
- Se o trial foi estendido (se ainda estiver ativo)
- Total de contas atualizadas
- Erros (se houver)

## O que o Script Faz

1. **Busca** todas as subscriptions com `planId = 'trial'`
2. **Atualiza** os limites para os novos valores
3. **Estende** o trial para 14 dias (se ainda estiver ativo)
4. **Atualiza** o tenant associado (se existir)
5. **Registra** log detalhado de cada operação

## Exemplo de Saída

```
🔄 Iniciando migração de limites do Trial...

📊 Encontradas 3 contas trial para atualizar

📧 Subscription: abc123
   Email: usuario@exemplo.com
   Limites antigos: { emailsPerDay: 50, campaigns: 5, contacts: 100 }
   ⏰ Trial estendido de 10/12/2025 para 17/12/2025
   ✅ Limites atualizados: { emailsPerDay: 50, campaigns: -1, contacts: 1000 }
   ✅ Tenant tenant_xyz atualizado

============================================================

✅ Migração concluída!
   📊 Total de contas: 3
   ✅ Atualizadas: 3
   ❌ Erros: 0

============================================================
```

## Segurança

- ✅ Não remove dados existentes
- ✅ Apenas atualiza limites
- ✅ Mantém trials expirados (apenas atualiza limites)
- ✅ Log completo de todas as operações
- ✅ Rollback manual possível via Firestore Console

## Após a Migração

### Novos Trials
Novos usuários que iniciarem trial já receberão automaticamente os novos limites (14 dias, 1k contatos, campanhas ilimitadas).

### Trials Existentes
- Se ainda ativos: ganham 14 dias a partir da criação original
- Se expirados: mantém data de expiração, mas limites são atualizados

## Verificação Manual

Para verificar se uma conta foi migrada:
1. Abra Firebase Console → Firestore
2. Navegue até `subscriptions`
3. Busque por `planId = 'trial'`
4. Verifique o campo `limits`:
   - `campaigns: -1` ✅
   - `contacts: 1000` ✅
   - `emailsPerMonth: 700` ✅
   - `templates: -1` ✅
