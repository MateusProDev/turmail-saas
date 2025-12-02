# 🚀 Deploy das Regras Firestore - Galeria de Imagens

## Problema Resolvido:
As regras Firestore foram atualizadas para permitir leitura/escrita na galeria de imagens dos clientes.

## Novas Regras Adicionadas:

```firestore
// Image Gallery: allow tenant members to read/write images for their tenant
// Path: /clients/{tenantId}/gallery/{docId}
match /clients/{tenantId}/gallery/{docId} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/tenants/$(tenantId)/members/$(request.auth.uid));
}
```

## Como Fazer Deploy:

### Opção 1: Usar Firebase Console (Recomendado)

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá para **Firestore Database** → **Rules**
4. Copie o conteúdo de `firestore.rules` deste repositório
5. Cole na editor do Firebase Console
6. Clique em **Publish**

### Opção 2: Usar Firebase CLI (Local)

```bash
# Fazer login
npx firebase login

# Fazer deploy das regras
npx firebase deploy --only firestore:rules
```

### Opção 3: GitHub Actions (CI/CD)

Adicionar ao workflow do repositório para deploy automático.

## ✅ O que as novas regras permitem:

| Operação | Permissão | Motivo |
|----------|-----------|--------|
| Ler galeria | ✅ | Se é membro do tenant |
| Fazer upload | ✅ | Se é membro do tenant |
| Deletar imagem | ✅ | Se é membro do tenant |
| Atualizar imagem | ✅ | Se é membro do tenant |
| Não-membro ler | ❌ | Segurança - apenas membros |

## 📝 Estrutura no Firestore:

```
/clients
  /{tenantId}
    /gallery
      /images (documento com array de imagens)
        - id: string
        - url: string (Cloudinary)
        - name: string
        - uploadedAt: timestamp
        - category: string
```

## 🔐 Segurança:

- ✅ Apenas membros do tenant podem acessar
- ✅ Sem permissões públicas
- ✅ Permissões por tenant isoladas
- ✅ Admin do Firebase pode auditar

## 🧪 Testar Após Deploy:

1. Recarregue a aplicação
2. Tente fazer upload de imagem
3. Verifique se aparece mensagem de sucesso
4. Vá para Firebase Console → Firestore → collection "clients" → verifique se os dados aparecem

## ❌ Se ainda der erro:

1. Verifique se está logado no Firebase
2. Verifique se é membro do tenant
3. Verifique a URL no Firestore (deve estar em `/clients/{tenantId}`)
4. Limpe cache do navegador (Ctrl+Shift+Delete)
5. Reabra a aplicação

---

**Status:** Regras atualizadas e prontas para deploy! 🎉
