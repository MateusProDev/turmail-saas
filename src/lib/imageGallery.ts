import { db } from './firebase'
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { uploadImage } from './cloudinary'

export interface ClientImage {
  id: string
  url: string
  name: string
  uploadedAt: number
  category?: 'hero' | 'team' | 'location' | 'general'
}

/**
 * Obter galeria de imagens do cliente
 */
export async function getClientImageGallery(clientId: string): Promise<ClientImage[]> {
  try {
    const docRef = doc(db, 'clients', clientId, 'gallery', 'images')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.images || []
    }
    return []
  } catch (error) {
    console.error('Erro ao buscar galeria de imagens:', error)
    return []
  }
}

/**
 * Fazer upload de imagem e adicionar à galeria do cliente
 */
export async function uploadClientImage(
  clientId: string,
  file: File,
  category: 'hero' | 'team' | 'location' | 'general' = 'general',
  name: string = file.name
): Promise<ClientImage> {
  try {
    // Upload para Cloudinary
    const cloudinaryResponse = await uploadImage(file)
    
    if (!cloudinaryResponse.secure_url && !cloudinaryResponse.url) {
      throw new Error('Falha ao obter URL do Cloudinary')
    }

    // Usar secure_url e transformar para otimizar para emails
    let imageUrl = cloudinaryResponse.secure_url || cloudinaryResponse.url
    
    // Transformar URL para otimizar para email:
    // - Redimensionar para max 600px de largura
    // - Comprimir qualidade para 85%
    // - Formato automático (webp para navegadores modernos, jpg fallback)
    // Exemplo: https://res.cloudinary.com/ddq2asu2s/image/upload/w_600,q_85,f_auto/...
    if (imageUrl.includes('cloudinary.com')) {
      imageUrl = imageUrl.replace(
        /\/image\/upload\//,
        '/image/upload/w_600,q_85,f_jpg/' // Força jpg para melhor compatibilidade com email
      )
    }

    // Criar objeto da imagemq
    const newImage: ClientImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: imageUrl,
      name: name,
      uploadedAt: Date.now(),
      category: category,
    }

    // Salvar no Firebase
    const docRef = doc(db, 'clients', clientId, 'gallery', 'images')
    await setDoc(docRef, {
      images: arrayUnion(newImage)
    }, { merge: true })

    return newImage
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error)
    throw error
  }
}

/**
 * Remover imagem da galeria do cliente
 */
export async function removeClientImage(clientId: string, imageId: string): Promise<void> {
  try {
    const gallery = await getClientImageGallery(clientId)
    const imageToRemove = gallery.find(img => img.id === imageId)
    
    if (!imageToRemove) {
      throw new Error('Imagem não encontrada')
    }

    const docRef = doc(db, 'clients', clientId, 'gallery', 'images')
    await setDoc(docRef, {
      images: arrayRemove(imageToRemove)
    }, { merge: true })
  } catch (error) {
    console.error('Erro ao remover imagem:', error)
    throw error
  }
}

/**
 * Obter imagens por categoria
 */
export async function getImagesByCategory(
  clientId: string,
  category: 'hero' | 'team' | 'location' | 'general'
): Promise<ClientImage[]> {
  try {
    const gallery = await getClientImageGallery(clientId)
    return gallery.filter(img => img.category === category)
  } catch (error) {
    console.error('Erro ao filtrar imagens por categoria:', error)
    return []
  }
}

/**
 * Atualizar categoria da imagem
 */
export async function updateImageCategory(
  clientId: string,
  imageId: string,
  newCategory: 'hero' | 'team' | 'location' | 'general'
): Promise<void> {
  try {
    const gallery = await getClientImageGallery(clientId)
    const imageIndex = gallery.findIndex(img => img.id === imageId)
    
    if (imageIndex === -1) {
      throw new Error('Imagem não encontrada')
    }

    const oldImage = gallery[imageIndex]
    const updatedImage = { ...oldImage, category: newCategory }

    const docRef = doc(db, 'clients', clientId, 'gallery', 'images')
    await setDoc(docRef, {
      images: arrayRemove(oldImage)
    }, { merge: true })

    await setDoc(docRef, {
      images: arrayUnion(updatedImage)
    }, { merge: true })
  } catch (error) {
    console.error('Erro ao atualizar categoria da imagem:', error)
    throw error
  }
}
