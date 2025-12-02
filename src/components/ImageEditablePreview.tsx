import { useState } from 'react'
import { ImageGallerySelector } from './ImageGallerySelector'

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
}

export function ImageEditablePreview({ 
  clientId, 
  previewHtml, 
  imageConfigs 
}: ImageEditablePreviewProps) {
  const [selectedImage, setSelectedImage] = useState<'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null>(null)

  const currentConfig = selectedImage ? imageConfigs.find(c => c.type === selectedImage) : null

  // Inject clickable overlays into images
  const enhancedHtml = previewHtml.replace(
    /<img([^>]*?src="(.*?)"[^>]*?)>/g,
    (_, attrs, src) => {
      // Identify which image this is based on src or surrounding context
      let imageType: string | null = null
      
      if (src.includes('Hospedagem') || src.includes('244x122')) {
        // Could be team images - check order
        if (!imageType) imageType = 'team1'
      }
      
      // Create wrapper with overlay
      return `
        <div style="position: relative; display: inline-block; width: 100%;">
          <img${attrs}>
          <div class="image-edit-overlay" data-image-type="${imageType || 'unknown'}" 
               style="
                 position: absolute;
                 top: 0;
                 left: 0;
                 right: 0;
                 bottom: 0;
                 background: rgba(0,0,0,0) !important;
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 opacity: 0;
                 transition: opacity 0.3s ease;
                 cursor: pointer;
                 border-radius: 12px;
               "
               onmouseover="this.style.opacity='1'; this.style.background='rgba(0,0,0,0.4)'"
               onmouseout="this.style.opacity='0'; this.style.background='rgba(0,0,0,0)'"
          >
            <button type="button" style="
              background: #4f1337;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.2s ease;
              z-index: 10;
            " onmouseover="this.style.background='#26081a'" onmouseout="this.style.background='#4f1337'">
              ✏️ Editar
            </button>
          </div>
        </div>
      `
    }
  )

  return (
    <div style={{ position: 'relative' }}>
      <div 
        id="visual-editor"
        dangerouslySetInnerHTML={{ __html: enhancedHtml }}
      />
      
      {/* Modal de seleção de imagem */}
      {selectedImage && currentConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                {currentConfig.label}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                ✕
              </button>
            </div>
            
            <ImageGallerySelector
              clientId={clientId}
              category={currentConfig.category}
              selectedImageUrl={currentConfig.imageUrl}
              onImageSelect={(url) => {
                currentConfig.onImageSelect(url)
                setSelectedImage(null)
              }}
              label={currentConfig.label}
              allowUpload={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
