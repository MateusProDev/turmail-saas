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
  // Removed unused imageMap state

  const currentConfig = selectedImage ? imageConfigs.find(c => c.type === selectedImage) : null

  // Map placeholders to config types and replace with actual URLs
  let enhancedHtml = previewHtml
  
  const placeholderMap: { [key: string]: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' } = {
    'Destino+Premium': 'hero',
    'text=Hospedagem': 'team1',
    'text=Refeicoes': 'team2',
    'text=Guias': 'team3',
    'text=Transporte': 'team4',
    'Local': 'location',
    'text=Logo': 'logo'
  }

  const newImageMap = new Map<string, 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location'>()

  // Replace placeholder URLs with actual image URLs and add click handlers
  Object.entries(placeholderMap).forEach(([placeholder, imageType]) => {
    const config = imageConfigs.find(c => c.type === imageType)
    if (!config) return

    // Use actual image URL if available, otherwise use placeholder
    const imageUrl = config.imageUrl || `https://via.placeholder.com/400?${placeholder}`
    const uniqueId = `img-${imageType}-${Date.now()}`
    
    newImageMap.set(uniqueId, imageType)
    
    // Create a pattern that matches the placeholder in various formats
    const patterns = [
      new RegExp(`https://via\\.placeholder\\.com/[0-9]+x?[0-9]*[&?]text=${placeholder.replace(/\+/g, '\\+')}`, 'g'),
      new RegExp(`https://via\\.placeholder\\.com/[0-9]+x?[0-9]*[&?]${placeholder}`, 'g'),
      new RegExp(`https://via\\.placeholder\\.com/[^"]*${placeholder.replace(/\?/g, '\\?').replace(/\+/g, '\\+')}[^"]*`, 'g')
    ]
    
    patterns.forEach(pattern => {
      enhancedHtml = enhancedHtml.replace(pattern, imageUrl)
    })
  })

  // setImageMap(newImageMap) // Removed as setImageMap is not defined

  // Add click handlers to all images
  enhancedHtml = enhancedHtml.replace(
    /<img([^>]*?)>/g,
    (_, attrs) => {
      // Find which image type this is
      let imageType: 'hero' | 'logo' | 'team1' | 'team2' | 'team3' | 'team4' | 'location' | null = null
      
      if (attrs.includes('Logo')) imageType = 'logo'
      else if (attrs.includes('Destino+Premium')) imageType = 'hero'
      else if (attrs.includes('Hospedagem')) imageType = 'team1'
      else if (attrs.includes('Refeicoes')) imageType = 'team2'
      else if (attrs.includes('Guias')) imageType = 'team3'
      else if (attrs.includes('Transporte')) imageType = 'team4'
      else if (attrs.includes('Local')) imageType = 'location'

      return `
        <img${attrs} 
          style="cursor: pointer; transition: opacity 0.2s; position: relative;" 
          onmouseover="this.style.opacity='0.7'; this.style.filter='brightness(0.8)'"
          onmouseout="this.style.opacity='1'; this.style.filter='brightness(1)'"
          onclick="window.dispatchEvent(new CustomEvent('editImage', { detail: { type: '${imageType}' } }))"
          title="Clique para editar a imagem"
        />
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
        img[title="Clique para editar a imagem"]:hover::after {
          content: "✏️ Editar imagem";
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(79, 19, 55, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          z-index: 100;
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
