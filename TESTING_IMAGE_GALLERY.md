# 🧪 Guia de Teste - Sistema de Galeria de Imagens

## ✅ O que foi implementado:

### 1. **Seletor de Galeria (ImageGallerySelector)**
- ✅ Upload de imagens via Cloudinary
- ✅ Visualização de galeria por cliente
- ✅ Seleção de imagens existentes
- ✅ Categorização de imagens

### 2. **Preview Editável (ImageEditablePreview)**
- ✅ 7 posições de imagens no template
- ✅ Botões flutuantes no canto superior direito
- ✅ Clique para abrir seletor de galeria
- ✅ Imagens placeholder visíveis

### 3. **Integração no Campaigns**
- ✅ Seção "🖼️ Imagens do Pacote" expansível
- ✅ 7 seletores (Hero, Logo, Team 1-4, Location)
- ✅ Preview com overlays clicáveis
- ✅ Atualização em tempo real do email

## 🚀 Como Testar:

### Passo 1: Abrir a aplicação
```
http://localhost:5174
```

### Passo 2: Fazer login
- Acesse a página de Login
- Faça login com sua conta

### Passo 3: Ir para Campanhas
- Clique em "Nova Campanha"
- Selecione um tenant (agência)

### Passo 4: Expandir Galeria de Imagens
- Clique no accordion "🖼️ Imagens do Pacote"
- Verá 7 seções de imagens:
  - 🌄 Imagem Principal (Hero)
  - 🏢 Logo da Empresa
  - 🏨 Hospedagem (Imagem 1)
  - 🍽️ Refeições (Imagem 2)
  - 👨‍🏫 Guias (Imagem 3)
  - 🚌 Transporte (Imagem 4)
  - 📍 Imagem de Localização

### Passo 5: Testar Upload
1. Clique em "🖼️ Imagem Principal"
2. Clique em "Selecionar Imagem"
3. Na galeria, clique em "Escolher Arquivo"
4. Selecione uma imagem local
5. Clique "Upload"
6. Selecione a imagem carregada
7. A imagem deve aparecer no preview

### Passo 6: Verificar Preview
- Expanda o preview do email
- Veja o botão flutuante "✏️ Prin" (Hero)
- Clique nele para editar diretamente
- As imagens aparecem com placeholders inicialmente

### Passo 7: Testar Reutilização
- Faça upload de uma imagem
- Crie outra campanha
- Na mesma galeria do cliente, a imagem anterior deve estar disponível
- Selecione a imagem existente (sem fazer upload novamente)

## 📊 Fluxo Esperado:

```
Cliente/Tenant
    ↓
Campanha 1 → Upload Imagem A, B, C
    ↓
Firebase armazena em: /clients/{clientId}/gallery/images
    ↓
Campanha 2 → Seleciona Imagem A, D (upload novo)
    ↓
Template atualiza com as imagens selecionadas
```

## 🔍 Verificações Técnicas:

### Firebase
```
Firestore → clients/{clientId}/gallery/images
Deve conter array de ClientImage:
{
  id: "img_1701000000000_xyz123",
  url: "https://res.cloudinary.com/...",
  name: "minha-imagem.jpg",
  uploadedAt: 1701000000000,
  category: "hero"
}
```

### Cloudinary
- Imagens devem aparecer em https://cloudinary.com/console/media_library
- URLs públicas: `https://res.cloudinary.com/{cloud_name}/image/upload/...`

### Browser Console
- Sem erros de acesso à galeria
- Sem erros de upload
- Logs confirmando operações

## ❌ Possíveis Problemas:

### "Erro ao carregar galeria"
- Verificar permissões Firestore
- Verificar se o tenant está correto

### "Erro ao fazer upload"
- Verificar credenciais Cloudinary
- Verificar quota de upload
- Verificar tamanho da imagem

### "Imagem não aparece no preview"
- Aguardar alguns segundos
- Atualizar página
- Verificar URL da imagem no Firebase

## 📝 Checklist Final:

- [ ] Login funciona
- [ ] Galeria de imagens expande/contrai
- [ ] Upload de imagem funciona
- [ ] Imagem aparece na galeria
- [ ] Seleção de imagem funciona
- [ ] Preview atualiza com imagem
- [ ] Botões flutuantes aparecem
- [ ] Clique nos botões abre seletor
- [ ] Segunda campanha mostra imagens anteriores
- [ ] Email renderiza com imagens corretas

## 🎉 Sucesso!

Se tudo acima funcionar, o sistema de galeria de imagens está 100% operacional!
