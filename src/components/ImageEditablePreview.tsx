import { useState, useEffect, useRef } from 'react'
import { ImageGallerySelector } from './ImageGallerySelector'
import DOMPurify from 'dompurify'

export interface EditableImageConfig {
  type: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location'
  imageUrl: string
  onImageSelect: (url: string) => void
  label: string
  category: 'hero' | 'team' | 'location' | 'general'
}

interface ImageEditablePreviewProps {
  clientId: string
  previewHtml: string
  imageConfigs: EditableImageConfig[]
  onHtmlChange?: (html: string) => void // Callback para sincronizar edições de volta
}

export function ImageEditablePreview({ 
  clientId, 
  previewHtml, 
  imageConfigs,
  onHtmlChange
}: ImageEditablePreviewProps) {
  const [selectedImage, setSelectedImage] = useState<'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null>(null)
  const [processedHtml, setProcessedHtml] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  const currentConfig = selectedImage ? imageConfigs.find(c => c.type === selectedImage) : null

  // Mapeia IDs de fotos Unsplash para tipos de imagem
  const templateImageMap: { [key: string]: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' } = {
    // Unsplash URLs from templates (hero images)
    'photo-1506905925346-21bda4d32df4': 'hero',
    'photo-1476514525535-07fb3b4ae5f1': 'hero',
    'photo-1530789253388-582c481c54b0': 'hero',
    'photo-1682687220742-aba13b6e50ba': 'hero',
    'photo-1540541338287-41700207dee6': 'hero',
    
    // Team/content images
    'photo-1566073771259-6a8506099945': 'team1',
    'photo-1551882547-ff40c63fe5fa': 'team1',
    'photo-1520250497591-112f2f40a3f4': 'team1',
    'photo-1542314831-068cd1dbfeeb': 'team1',
    'photo-1571896349842-33c89424de2d': 'team1',
    
    'photo-1414235077428-338989a2e8c0': 'team2',
    'photo-1517248135467-4c7edcad34c4': 'team2',
    'photo-1559339352-11d035aa65de': 'team2',
    'photo-1600585154340-be6161a56a0c': 'team2',
    'photo-1578474846511-04ba529f0b88': 'team2',
    
    'photo-1476900543704-4312b78632f8': 'team3',
    'photo-1527004013197-933c4bb611b3': 'team3',
    'photo-1500835556837-99ac94a94552': 'team3',
    'photo-1507003211169-0a1dd7228f2d': 'team3',
    'photo-1469474968028-56623f02e42e': 'team3',
    
    'photo-1544620347-c4fd4a3d5957': 'team4',
    'photo-1449965408869-eaa3f722e40d': 'team4',
    'photo-1464037866556-6812c9d1c72e': 'team4',
    'photo-1485463611174-f302f6a5c1c9': 'team4',
    
    // Location images
    'photo-1559827260-dc66d52bef19': 'location',
    'photo-1469854523086-cc02fe5d8800': 'location',
    'photo-1488646953014-85cb44e25828': 'location',
    'photo-1523906834658-6e24ef2386f9': 'location',
    'photo-1506929562872-bb421503ef21': 'location',
    
    // Logo images
    'photo-1499678329028-101435549a4e': 'logo',
    'photo-1527192491265-7e15c55b1ed2': 'logo',
    'photo-1486406146926-c627a92ad1ab': 'logo',
    'photo-1568992687947-868a62a9f521': 'logo',
    'photo-1560179707-f14e90ef3623': 'logo'
  }

  // Processa o HTML adicionando interatividade às imagens
  useEffect(() => {
    console.log('🔄 Processando HTML, tamanho original:', previewHtml.length)
    let html = previewHtml
    let replacementCount = 0

    // Substitui cada imagem por uma versão editável com overlay
    html = html.replace(
      /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (_match, beforeSrc, srcUrl, afterSrc) => {
        replacementCount++
        console.log(`📸 Processando imagem ${replacementCount}: ${srcUrl.substring(0, 80)}...`)
        
        // Identifica o tipo de imagem pela URL
        let imageType: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null = null
        
        // Verifica se é uma foto do Unsplash
        for (const [photoId, type] of Object.entries(templateImageMap)) {
          if (srcUrl.includes(photoId)) {
            imageType = type
            console.log(`  ✅ Identificada como ${type} (Unsplash)`)
            break
          }
        }
        
        // Se não encontrou, verifica contra as configurações atuais
        if (!imageType) {
          for (const config of imageConfigs) {
            if (config.imageUrl && (srcUrl === config.imageUrl || srcUrl.includes(config.imageUrl))) {
              imageType = config.type
              console.log(`  ✅ Identificada como ${config.type} (Config)`)
              break
            }
          }
        }

        // Se encontrou o tipo, usa a imagem do usuário se disponível
        if (imageType) {
          const config = imageConfigs.find(c => c.type === imageType)
          if (config?.imageUrl) {
            console.log(`  🔄 Substituindo por imagem do usuário: ${config.imageUrl.substring(0, 60)}...`)
            srcUrl = config.imageUrl
          }
        }

        // Se não identificou o tipo, retorna a imagem normal
        if (!imageType) {
          console.log(`  ⚠️ Tipo não identificado, mantendo imagem original`)
          return `<img${beforeSrc}src="${srcUrl}"${afterSrc}>`
        }

        return `
          <div 
            class="editable-image-wrapper" 
            data-image-type="${imageType}"
            contenteditable="false"
            style="position: relative; display: inline-block; width: 100%; cursor: pointer;"
          >
            <img${beforeSrc}src="${srcUrl}"${afterSrc} style="display: block; width: 100%; height: auto; transition: opacity 0.2s;" />
            <div class="edit-overlay" style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s;
              pointer-events: none;
            ">
              <span style="
                background: white;
                color: #4f1337;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 14px;
              ">✏️ Editar Imagem</span>
            </div>
          </div>
        `
      }
    )

    console.log(`📸 Total de substituições: ${replacementCount}`)
    console.log('📸 Tamanho HTML processado:', html.length)
    setProcessedHtml(html)
  }, [previewHtml, imageConfigs])

  // Atualiza o conteúdo do preview APENAS na primeira vez
  useEffect(() => {
    if (previewRef.current && processedHtml && !previewRef.current.innerHTML) {
      console.log('📸 Inserindo HTML inicial no preview, tamanho:', processedHtml.length)
      console.log('📸 Primeira imagem no HTML:', processedHtml.match(/<img[^>]*src=["']([^"']+)["']/)?.[1])
      previewRef.current.innerHTML = DOMPurify.sanitize(processedHtml)
      
      // Adiciona event listeners após inserir o HTML
      setupImageListeners()
      
      // Log para debug
      const imgs = previewRef.current.querySelectorAll('img')
      console.log(`📸 Total de imagens renderizadas: ${imgs.length}`)
      imgs.forEach((img, i) => console.log(`  Imagem ${i + 1}: ${img.src.substring(0, 80)}...`))
    }
  }, [processedHtml])

  // Reaplica listeners quando processedHtml muda (nova imagem selecionada)
  useEffect(() => {
    if (previewRef.current && previewRef.current.innerHTML) {
      setupImageListeners()
    }
  }, [imageConfigs])

  // Função para configurar event listeners nas imagens
  const setupImageListeners = () => {
    if (!previewRef.current) return

    const wrappers = previewRef.current.querySelectorAll('.editable-image-wrapper')
    
    wrappers.forEach(wrapper => {
      const htmlWrapper = wrapper as HTMLElement
      const imageType = htmlWrapper.dataset.imageType
      const overlay = htmlWrapper.querySelector('.edit-overlay') as HTMLElement
      const img = htmlWrapper.querySelector('img') as HTMLImageElement

      // Remove listeners antigos
      const oldHandlers = (htmlWrapper as any).__handlers
      if (oldHandlers) {
        htmlWrapper.removeEventListener('mouseenter', oldHandlers.enter)
        htmlWrapper.removeEventListener('mouseleave', oldHandlers.leave)
        htmlWrapper.removeEventListener('click', oldHandlers.click)
      }

      // Hover effect
      const handleMouseEnter = () => {
        if (overlay) overlay.style.opacity = '1'
        if (img) img.style.opacity = '0.8'
      }
      
      const handleMouseLeave = () => {
        if (overlay) overlay.style.opacity = '0'
        if (img) img.style.opacity = '1'
      }

      // Click to edit
      const handleClick = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        if (imageType) {
          setSelectedImage(imageType as any)
        }
      }

      // Guarda referências
      (htmlWrapper as any).__handlers = {
        enter: handleMouseEnter,
        leave: handleMouseLeave,
        click: handleClick
      }

      htmlWrapper.addEventListener('mouseenter', handleMouseEnter)
      htmlWrapper.addEventListener('mouseleave', handleMouseLeave)
      htmlWrapper.addEventListener('click', handleClick)
    })
  }

  // Atualiza apenas as imagens quando usuário seleciona nova
  useEffect(() => {
    if (!previewRef.current) return

    imageConfigs.forEach(config => {
      if (!config.imageUrl) return

      const wrappers = previewRef.current!.querySelectorAll(`[data-image-type="${config.type}"]`)
      wrappers.forEach(wrapper => {
        const img = wrapper.querySelector('img')
        if (img && img.src !== config.imageUrl) {
          img.src = config.imageUrl
        }
      })
    })
  }, [imageConfigs])

  // Sincroniza edições de texto de volta (com debounce)
  const handleInput = () => {
    if (previewRef.current && onHtmlChange) {
      onHtmlChange(previewRef.current.innerHTML)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Preview editável */}
      <div
        ref={previewRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onBlur={handleInput}
        style={{ 
          width: '100%',
          minHeight: '400px',
          outline: 'none',
          cursor: 'text'
        }}
      />
      
      {/* Modal de seleção de imagem */}
      {selectedImage && currentConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setSelectedImage(null)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '540px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>
                  {currentConfig.label}
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Selecione ou faça upload de uma imagem
                </p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  color: '#64748b',
                  fontWeight: '600'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e2e8f0'
                  e.currentTarget.style.color = '#1e293b'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.color = '#64748b'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Preview da imagem atual */}
            {currentConfig.imageUrl && (
              <div style={{
                marginBottom: '20px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '3px solid #e2e8f0',
                background: '#f8fafc'
              }}>
                <img 
                  src={currentConfig.imageUrl} 
                  alt={currentConfig.label}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '240px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            )}
            
            <ImageGallerySelector
              clientId={clientId}
              category={currentConfig.category}
              selectedImageUrl={currentConfig.imageUrl}
              onImageSelect={(url) => {
                currentConfig.onImageSelect(url)
                setTimeout(() => setSelectedImage(null), 300)
              }}
              label=""
              allowUpload={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
