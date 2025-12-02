# Environment Variables - Configuração de Segurança

## 📋 Variáveis Públicas (Frontend)

Essas variáveis são expostas no frontend com prefixo `VITE_`:

```
VITE_STRIPE_PUBLISHABLE_KEY      # Chave pública do Stripe
VITE_CLOUDINARY_CLOUD_NAME       # Nome da conta Cloudinary
VITE_CLOUDINARY_UPLOAD_PRESET    # Preset de upload Cloudinary
VITE_FIREBASE_*                  # Configurações públicas Firebase
```

## 🔐 Variáveis Privadas (Backend/Vercel)

**NUNCA** use essas no frontend:

```
STRIPE_SECRET_KEY                # Chave secreta Stripe ⚠️
STRIPE_WEBHOOK_SECRET            # Webhook Stripe ⚠️
CLOUDINARY_API_SECRET            # Secret Cloudinary ⚠️
CLOUDINARY_API_KEY               # API Key Cloudinary (use com cuidado)
```

## ✅ Checklist de Segurança

- [x] `.env.local` adicionado ao `.gitignore`
- [x] `.env.*.local` adicionado ao `.gitignore`
- [x] `serviceAccount.json` adicionado ao `.gitignore`
- [x] `.env.example` criado com placeholders (sem valores reais)
- [x] Vercel configurado com variáveis sensíveis

## 🚀 Como usar no Vercel

1. **Variáveis Públicas** (Frontend):
   - Prefixo com `VITE_`
   - Seguras para expor
   - Use normalmente no código

2. **Variáveis Privadas** (Backend):
   - SEM prefixo `VITE_`
   - Acesse apenas em `/api` ou funções serverless
   - Nunca em `src/`

## 📝 Exemplo de Uso

**Frontend (seguro):**
```tsx
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
```

**Backend (seguro):**
```javascript
// /api/upload.js
const apiSecret = process.env.CLOUDINARY_API_SECRET
```

## ⚠️ Importante

Mesmo que as chaves não sejam compartilhadas publicamente:
1. Elas estão no histórico do Vercel (seguro)
2. Estão no `.gitignore` (seguro)
3. Não aparecem em commits locais (seguro)
4. Se precisar compartilhar código, use `.env.example`

**Atual Status:** ✅ **SEGURO**
