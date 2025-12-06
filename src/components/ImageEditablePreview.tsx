import { useState, useEffect } from 'react'
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
}

export function ImageEditablePreview({ 
  clientId, 
  previewHtml, 
  imageConfigs 
}: ImageEditablePreviewProps) {
  const [selectedImage, setSelectedImage] = useState<'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null>(null)

  const currentConfig = selectedImage ? imageConfigs.find(c => c.type === selectedImage) : null

  // Create a map of image URLs from template defaults (Unsplash URLs)
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

  // Build enhanced HTML with image wrappers
  let enhancedHtml = previewHtml

  // Add interactive wrapper to all images
  enhancedHtml = enhancedHtml.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
    (match, beforeSrc, srcUrl, afterSrc) => {
      // Determine image type by checking URL
      let imageType: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null = null
      
      // Check Unsplash photo ID in URL
      for (const [photoId, type] of Object.entries(templateImageMap)) {
        if (srcUrl.includes(photoId)) {
          imageType = type
          break
        }
      }
      
      // Fallback: check against current config URLs
      if (!imageType) {
        for (const config of imageConfigs) {
          if (srcUrl === config.imageUrl || srcUrl.includes(config.imageUrl)) {
            imageType = config.type
            break
          }
        }
      }

      // If we found a matching type, replace with user's selected image if available
      if (imageType) {
        const config = imageConfigs.find(c => c.type === imageType)
        if (config?.imageUrl) {
          srcUrl = config.imageUrl
        }
      }

      // Extract width for container
      const allAttrs = beforeSrc + afterSrc
      const widthMatch = allAttrs.match(/(?:width|max-width):\s*([0-9]+)px/i) || allAttrs.match(/width=["']?([0-9]+)["']?/i)
      const width = widthMatch ? widthMatch[1] : '600'

      return `
        <span 
          class="image-edit-container" 
          data-image-type="${imageType}"
          data-width="${width}"
          onmouseover="this.classList.add('hovered')"
          onmouseout="this.classList.remove('hovered')"
          onclick="window.dispatchEvent(new CustomEvent('editImage', { detail: { type: '${imageType}' } }))"
        >
          <img${beforeSrc}src="${srcUrl}"${afterSrc} style="cursor: pointer; display: block; transition: opacity 0.2s;" />
          <span class="image-edit-btn">✏️ Editar</span>
        </span>
      `
    }
  )

  // Handle image click events
  useEffect(() => {
    const handleEditImage = (event: Event) => {
      const customEvent = event as CustomEvent
      setSelectedImage(customEvent.detail.type)
    }

    window.addEventListener('editImage', handleEditImage)
    return () => window.removeEventListener('editImage', handleEditImage)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Preview HTML - sem botões flutuantes */}
      <div style={{ width: '100%', position: 'relative' }}>
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(enhancedHtml) }}
          style={{ width: '100%' }}
        />
      </div>
      
      {/* Tooltip flutuante ao passar mouse */}
      <style>{`
        .image-edit-container {
          position: relative;
          display: inline-block;
          width: 100%;
        }

        .image-edit-container img {
          width: 100%;
          height: auto;
          display: block;
          transition: opacity 0.2s ease, filter 0.2s ease;
        }

        .image-edit-container:hover img {
          opacity: 0.7;
          filter: brightness(0.8);
        }

        .image-edit-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(79, 19, 55, 0.95);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          z-index: 100;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          cursor: pointer;
        }

        .image-edit-container:hover .image-edit-btn {
          opacity: 1;
        }

        .image-edit-container.hovered .image-edit-btn {
          opacity: 1;
        }
      `}</style>
      
      {/* Modal de seleção de imagem */}
      {selectedImage && currentConfig && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '520px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                  {currentConfig.label}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {currentConfig.imageUrl ? 'Clique para mudar' : 'Adicione uma imagem'}
                </p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'background 0.2s',
                  color: '#64748b'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                ✕
              </button>
            </div>
            
            {/* Preview da imagem atual */}
            {currentConfig.imageUrl && (
              <div style={{
                marginBottom: '16px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #e2e8f0'
              }}>
                <img 
                  src={currentConfig.imageUrl} 
                  alt={currentConfig.label}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '200px',
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
                setTimeout(() => setSelectedImage(null), 200)
              }}
              label={currentConfig.label}
              allowUpload={true}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
