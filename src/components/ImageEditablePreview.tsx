import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const isEditingRef = useRef(false)

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

        // Wrapper sem bordas visíveis, apenas container para a imagem
        // contenteditable="false" impede que a imagem seja editada como texto
        const wrapperStyle = `position: relative !important; display: inline-block !important; width: 100% !important; cursor: pointer !important; overflow: visible !important; user-select: none !important;`
        
        // Imagem visível por padrão, ocupa todo o espaço
        const imgStyle = `display: block !important; width: 100% !important; height: auto !important; object-fit: cover !important; transition: filter 0.2s !important; pointer-events: none !important;`
        
        // Overlay que aparece apenas no hover - z-index alto para ficar sobre textos absolutos
        const overlayStyle = `position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(0,0,0,0.5) !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 0 !important; transition: opacity 0.2s !important; pointer-events: none !important; z-index: 1000 !important;`

        return `<div class="editable-image-wrapper" data-image-type="${imageType}" contenteditable="false" style="${wrapperStyle}">` +
          `<img${beforeSrc}src="${srcUrl}"${afterSrc} style="${imgStyle}" />` +
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
      // Só atualiza se não estiver editando
      if (!isEditingRef.current) {
        previewRef.current.innerHTML = DOMPurify.sanitize(processedHtml)
        setupImageListeners()
      }
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
      // Captura o HTML editado, preservando a formatação
      const editedHtml = previewRef.current.innerHTML
      onHtmlChange(editedHtml)
    }
  }

  const handleInput = () => {
    isEditingRef.current = true
    handleContentEdit()
  }

  const handleBlur = () => {
    isEditingRef.current = false
    handleContentEdit()
  }

  const handleFocus = () => {
    isEditingRef.current = true
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '400px' }}>
      <style>{`
        .editable-image-wrapper:hover ~ table,
        .editable-image-wrapper:hover ~ *:not(.edit-overlay) {
          pointer-events: none !important;
        }
        .editable-image-wrapper:hover .edit-overlay {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        td:has(> .editable-image-wrapper) {
          position: relative !important;
        }
        td:has(> .editable-image-wrapper) > table:not(.editable-image-wrapper *) {
          pointer-events: auto !important;
        }
        .editable-image-wrapper:hover {
          z-index: 10 !important;
        }
      `}</style>
      <div
        ref={previewRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onBlur={handleBlur}
        onFocus={handleFocus}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: '400px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#fff',
          outline: 'none',
          cursor: 'text'
        }}
      />

      {/* Modal de seleção de imagem - Renderizado via Portal para cobrir toda a página */}
      {selectedImage && currentConfig && createPortal(
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
              padding: '24px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
              margin: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
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
        </div>,
        document.body
      )}
    </div>
  )
}
