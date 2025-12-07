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
  onHtmlChange?: (html: string) => void
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

  const templateImageMap: Record<string, 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location'> = {
    'photo-1506905925346-21bda4d32df4': 'hero',
    'photo-1476514525535-07fb3b4ae5f1': 'hero',
    'photo-1502602898657-3e91760cbb34': 'hero',
    'photo-1682687220742-aba13b6e50ba': 'hero',
    'photo-1682687982501-1e58ab814714': 'hero',
    
    'photo-1539635278303-d4002c07eae3': 'team1',
    'photo-1542314831-068cd1dbfeeb': 'team1',
    'photo-1551882547-ff40c63fe5fa': 'team1',
    'photo-1566073771259-6a8506099945': 'team1',
    'photo-1445019980597-93fa8acb246c': 'team1',
    
    'photo-1517248135467-4c7edcad34c4': 'team2',
    'photo-1414235077428-338989a2e8c0': 'team2',
    'photo-1555396273-367ea4eb4db5': 'team2',
    'photo-1424847651672-bf20a4b0982b': 'team2',
    'photo-1546069901-ba9599a7e63c': 'team2',
    
    'photo-1503457574462-bd27054394c1': 'team3',
    'photo-1469474968028-56623f02e42e': 'team3',
    
    'photo-1544620347-c4fd4a3d5957': 'team4',
    'photo-1464037866556-6812c9d1c72e': 'team4',
    'photo-1485463611174-f302f6a5c1c9': 'team4',
    
    'photo-1559827260-dc66d52bef19': 'location',
    'photo-1469854523086-cc02fe5d8800': 'location',
    'photo-1506929562872-bb421503ef21': 'location',
    
    'photo-1499678329028-101435549a4e': 'logo',
    'photo-1527192491265-7e15c55b1ed2': 'logo',
    'photo-1486406146926-c627a92ad1ab': 'logo',
    'photo-1568992687947-868a62a9f521': 'logo',
    'photo-1560179707-f14e90ef3623': 'logo'
  }

  // Processa o HTML adicionando interatividade às imagens
  useEffect(() => {
    let html = previewHtml

    html = html.replace(
      /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
      (_match, beforeSrc, srcUrl, afterSrc) => {
        let imageType: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null = null
        
        // Extrai dimensões da tag img (width e height)
        const allAttrs = beforeSrc + afterSrc
        const widthMatch = allAttrs.match(/width=["']?(\d+)["']?/i) || allAttrs.match(/width:\s*(\d+)px/i)
        const heightMatch = allAttrs.match(/height=["']?(\d+)["']?/i) || allAttrs.match(/height:\s*(\d+)px/i)
        const width = widthMatch ? widthMatch[1] : '600'
        const height = heightMatch ? heightMatch[1] : 'auto'
        
        for (const [photoId, type] of Object.entries(templateImageMap)) {
          if (srcUrl.includes(photoId)) {
            imageType = type
            break
          }
        }
        
        if (!imageType) {
          for (const config of imageConfigs) {
            if (config.imageUrl && (srcUrl === config.imageUrl || srcUrl.includes(config.imageUrl))) {
              imageType = config.type
              break
            }
          }
        }

        if (imageType) {
          const config = imageConfigs.find(c => c.type === imageType)
          if (config?.imageUrl) {
            srcUrl = config.imageUrl
          }
        }

        if (!imageType) {
          return `<img${beforeSrc}src="${srcUrl}"${afterSrc}>`
        }

        // Define label e cor por tipo
        const typeLabels: Record<string, string> = {
          hero: '🌄 Imagem Principal',
          logo: '🏢 Logo',
          team1: '🏨 Hospedagem',
          team2: '🍽️ Refeições',
          team3: '👨‍🏫 Guias',
          team4: '🚌 Transporte',
          location: '📍 Localização'
        }

        const typeColors: Record<string, string> = {
          hero: '#0ea5e9',
          logo: '#8b5cf6',
          team1: '#10b981',
          team2: '#f59e0b',
          team3: '#ec4899',
          team4: '#6366f1',
          location: '#14b8a6'
        }

        const label = typeLabels[imageType] || 'Imagem'
        const color = typeColors[imageType] || '#64748b'

        const wrapperStyle = `position: relative !important; display: inline-block !important; width: 100% !important; cursor: pointer !important; background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%) !important; border: 2px dashed ${color}40 !important; border-radius: 8px !important; min-height: ${height === 'auto' ? '200px' : height + 'px'} !important; overflow: hidden !important;`
        
        const placeholderStyle = `position: relative !important; width: 100% !important; height: ${height === 'auto' ? '200px' : height + 'px'} !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; background: linear-gradient(135deg, ${color}20 0%, ${color}10 100%) !important; color: ${color} !important; font-weight: 600 !important; font-size: 14px !important; text-align: center !important; padding: 20px !important;`
        
        const imgStyle = `position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; object-fit: cover !important; transition: opacity 0.3s !important; z-index: 1 !important;`
        
        const overlayStyle = `position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(0,0,0,0.6) !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0 !important; transition: opacity 0.2s !important; pointer-events: none !important; z-index: 2 !important;`
        
        const iconEmoji = label.split(' ')[0]
        const dimensions = `${width}px × ${height === 'auto' ? 'Auto' : height + 'px'}`

        return `<div class="editable-image-wrapper" data-image-type="${imageType}" contenteditable="false" style="${wrapperStyle}">` +
          `<div class="image-placeholder" style="${placeholderStyle}">` +
            `<div style="font-size: 48px !important; margin-bottom: 12px !important; opacity: 0.6 !important;">${iconEmoji}</div>` +
            `<div style="font-size: 14px !important; font-weight: 600 !important; opacity: 0.8 !important;">${label}</div>` +
            `<div style="font-size: 11px !important; margin-top: 6px !important; opacity: 0.6 !important; font-weight: 500 !important;">${dimensions}</div>` +
            `<div style="font-size: 12px !important; margin-top: 12px !important; opacity: 0.7 !important; padding: 6px 12px !important; background: ${color}20 !important; border-radius: 4px !important;">Clique para adicionar</div>` +
          `</div>` +
          `<img${beforeSrc}src="${srcUrl}"${afterSrc} style="${imgStyle}" onload="this.style.opacity='1';" onerror="this.style.opacity='0';" />` +
          `<div class="edit-overlay" style="${overlayStyle}">` +
            `<span style="background: white !important; color: #1e293b !important; padding: 10px 20px !important; border-radius: 8px !important; font-weight: 600 !important; font-size: 14px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;">📸 Alterar Imagem</span>` +
          `</div>` +
        `</div>`
      }
    )

    setProcessedHtml(html)
  }, [previewHtml, imageConfigs])

  useEffect(() => {
    if (previewRef.current && processedHtml) {
      // Sempre atualiza o HTML quando processedHtml muda
      previewRef.current.innerHTML = DOMPurify.sanitize(processedHtml)
      setupImageListeners()
    }
  }, [processedHtml])

  useEffect(() => {
    if (previewRef.current && previewRef.current.innerHTML) {
      setupImageListeners()
    }
  }, [imageConfigs])

  const setupImageListeners = () => {
    if (!previewRef.current) return

    const wrappers = previewRef.current.querySelectorAll('.editable-image-wrapper')
    
    wrappers.forEach(wrapper => {
      const htmlWrapper = wrapper as HTMLElement
      const imageType = htmlWrapper.dataset.imageType
      const overlay = htmlWrapper.querySelector('.edit-overlay') as HTMLElement

      const oldHandlers = (htmlWrapper as any).__handlers
      if (oldHandlers) {
        htmlWrapper.removeEventListener('mouseenter', oldHandlers.enter)
        htmlWrapper.removeEventListener('mouseleave', oldHandlers.leave)
        htmlWrapper.removeEventListener('click', oldHandlers.click)
      }

      const handlers = {
        enter: () => {
          if (overlay) overlay.style.opacity = '1'
        },
        leave: () => {
          if (overlay) overlay.style.opacity = '0'
        },
        click: (e: Event) => {
          e.preventDefault()
          e.stopPropagation()
          if (imageType) {
            setSelectedImage(imageType as any)
          }
        }
      }

      htmlWrapper.addEventListener('mouseenter', handlers.enter)
      htmlWrapper.addEventListener('mouseleave', handlers.leave)
      htmlWrapper.addEventListener('click', handlers.click)
      
      ;(htmlWrapper as any).__handlers = handlers
    })
  }

  useEffect(() => {
    const updateImageInPreview = () => {
      if (!selectedImage || !previewRef.current) return
      
      const config = imageConfigs.find(c => c.type === selectedImage)
      if (!config?.imageUrl) return

      const wrappers = previewRef.current.querySelectorAll('.editable-image-wrapper')
      wrappers.forEach(wrapper => {
        const htmlWrapper = wrapper as HTMLElement
        if (htmlWrapper.dataset.imageType === selectedImage) {
          const img = htmlWrapper.querySelector('img') as HTMLImageElement
          if (img && config.imageUrl) {
            img.src = config.imageUrl
          }
        }
      })
    }

    updateImageInPreview()
  }, [imageConfigs, selectedImage])

  const handleContentEdit = () => {
    if (previewRef.current && onHtmlChange) {
      onHtmlChange(previewRef.current.innerHTML)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '400px' }}>
      <div
        ref={previewRef}
        contentEditable={true}
        onInput={handleContentEdit}
        style={{
          width: '100%',
          minHeight: '400px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fff',
          outline: 'none'
        }}
      />

      {selectedImage && currentConfig && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            overflow: 'auto'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              margin: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                Selecionar {currentConfig.label}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
              >
                ×
              </button>
            </div>
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

