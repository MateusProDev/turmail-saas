# Configuração OAuth Google - Firebase

## Problema
Login com Google funciona em localhost mas não em produção (tela branca).

## Solução Implementada

### 1. Código Atualizado
- ✅ Adicionado `signInWithRedirect` para produção
- ✅ Adicionado `getRedirectResult` no useEffect
- ✅ Popup para localhost, Redirect para produção

### 2. Configuração Necessária no Firebase Console

#### Passo 1: Adicionar Domínio Autorizado
1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Settings** → **Authorized domains**
4. Clique em **Add domain**
5. Adicione seu domínio Vercel:
   - `seu-projeto.vercel.app`
   - Se tiver domínio customizado, adicione também: `seudominio.com`

#### Passo 2: Verificar OAuth Redirect URI
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Selecione o projeto Firebase
3. Clique no **OAuth 2.0 Client ID** (Web client - auto created by Google Service)
4. Em **Authorized redirect URIs**, adicione:
   ```
   https://seu-projeto-id.firebaseapp.com/__/auth/handler
   https://seu-projeto.vercel.app/__/auth/handler
   ```

#### Passo 3: Verificar authDomain no .env
Certifique-se que está usando o authDomain correto na Vercel:
```
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto-id.firebaseapp.com
```

### 3. Como Testar

1. Faça deploy das alterações:
```bash
git add .
git commit -m "fix: adicionar signInWithRedirect para produção"
git push
```

2. Aguarde o deploy na Vercel

3. Teste o login com Google em produção

### 4. Troubleshooting

Se ainda não funcionar:

1. **Verifique o console do navegador** (F12) - procure por erros de CORS ou OAuth

2. **Limpe o cache** do navegador ou teste em aba anônima

3. **Verifique as variáveis de ambiente** na Vercel:
   - Settings → Environment Variables
   - Certifique-se que todas as variáveis VITE_FIREBASE_* estão configuradas

4. **Teste o authDomain**:
   - Abra: `https://SEU_AUTH_DOMAIN/__/auth/handler`
   - Deve mostrar "Firebase Auth" ou similar (não erro 404)

### 5. Domínios que devem estar configurados

No Firebase Console → Authentication → Settings → Authorized domains:
- ✅ `localhost` (já vem por padrão)
- ✅ `seu-projeto-id.firebaseapp.com` (já vem por padrão)
- ⚠️ **ADICIONAR**: `seu-projeto.vercel.app`
- ⚠️ **ADICIONAR** (se tiver): seu domínio customizado

## Diferenças entre Popup e Redirect

### signInWithPopup (localhost)
- Abre janela popup
- Mantém o estado da página
- Melhor para desenvolvimento

### signInWithRedirect (produção)
- Redireciona página inteira
- Mais confiável em mobile/produção
- Evita problemas de popup bloqueado
- Funciona melhor com HTTPS

## Commit das Alterações

```bash
git add .
git commit -m "fix: usar signInWithRedirect em produção para OAuth Google"
git push
```
