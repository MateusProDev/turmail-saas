import { useState } from 'react'
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

  // Replace placeholder URLs with actual image URLs
  Object.entries(placeholderMap).forEach(([placeholder, imageType]) => {
    const config = imageConfigs.find(c => c.type === imageType)
    if (!config) return

    // Use actual image URL if available, otherwise use placeholder
    const imageUrl = config.imageUrl || `https://via.placeholder.com/400?${placeholder}`
    
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

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Sidebar com botões flutuantes */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '140px'
      }}>
        {imageConfigs.map(config => {
          const isSet = !!config.imageUrl
          return (
            <button
              key={config.type}
              onClick={() => setSelectedImage(config.type)}
              style={{
                background: isSet ? '#10b981' : '#4f1337',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
              }}
              title={config.label}
            >
              {isSet ? '✓' : '✏️'} {config.label.substring(0, 10)}
            </button>
          )
        })}
      </div>

      {/* Preview HTML */}
      <div
        style={{
          width: '100%',
          position: 'relative',
          paddingRight: '150px'
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(enhancedHtml) }}
          style={{ width: '100%' }}
        />
      </div>
      
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
