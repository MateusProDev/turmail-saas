import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getClientImageGallery, uploadClientImage, removeClientImage } from '../lib/imageGallery'
import type { ClientImage } from '../lib/imageGallery'
import './ImageGallerySelector.css'

interface ImageGallerySelectorProps {
  clientId: string
  category?: 'hero' | 'team' | 'location' | 'general'
  selectedImageUrl?: string
  onImageSelect: (imageUrl: string) => void
  label?: string
  allowUpload?: boolean
}

export const ImageGallerySelector: React.FC<ImageGallerySelectorProps> = ({
  clientId,
  category = 'general',
  selectedImageUrl,
  onImageSelect,
  label = 'Selecionar Imagem',
  allowUpload = true,
}) => {
  const [gallery, setGallery] = useState<ClientImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar galeria ao montar o componente
  useEffect(() => {
    loadGallery()
  }, [clientId, category])

  const loadGallery = async () => {
    try {
      setLoading(true)
      setError(null)
      const images = await getClientImageGallery(clientId)
      // Filtrar por categoria se especificada
      const filtered = category ? images.filter(img => img.category === category) : images
      setGallery(filtered)
    } catch (err) {
      setError('Erro ao carregar galeria')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError(null)
      
      const newImage = await uploadClientImage(clientId, file, category)
      setGallery([...gallery, newImage])
      onImageSelect(newImage.url)
      setShowGallery(false)
    } catch (err) {
      setError('Erro ao fazer upload da imagem')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleImageSelect = (imageUrl: string) => {
    onImageSelect(imageUrl)
    setShowGallery(false)
  }

  const handleRemoveImage = async (imageId: string) => {
    try {
      await removeClientImage(clientId, imageId)
      setGallery(gallery.filter(img => img.id !== imageId))
      // Se a imagem removida estava selecionada, limpar a seleção
      const removedImage = gallery.find(img => img.id === imageId)
      if (removedImage?.url === selectedImageUrl) {
        onImageSelect('')
      }
    } catch (err) {
      setError('Erro ao remover imagem')
      console.error(err)
    }
  }

  return (
    <div className="image-gallery-selector">
      <label className="selector-label">{label}</label>
      
      {/* Preview da imagem selecionada */}
      <div className="image-preview-container">
        {selectedImageUrl ? (
          <div className="image-preview">
            <img src={selectedImageUrl} alt="Imagem selecionada" />
            <div className="preview-overlay">
              <button 
                type="button"
                onClick={() => setShowGallery(!showGallery)}
                className="btn-change"
              >
                Mudar
              </button>
            </div>
          </div>
        ) : (
          <div className="no-image-placeholder">
            <p>Nenhuma imagem selecionada</p>
            <button 
              type="button"
              onClick={() => setShowGallery(!showGallery)}
              className="btn-select"
            >
              Selecionar Imagem
            </button>
          </div>
        )}
      </div>

      {/* Modal de galeria - Renderizado via Portal para cobrir toda a página */}
      {showGallery && createPortal(
        <div className="gallery-modal">
          <div className="gallery-content">
            <div className="gallery-header">
              <h3>Galeria de Imagens</h3>
              <button 
                type="button"
                onClick={() => setShowGallery(false)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Upload de nova imagem */}
            {allowUpload && (
              <div className="upload-section">
                <label className="upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <span className={uploading ? 'uploading' : ''}>
                    {uploading ? '⏳ Enviando...' : '➕ Fazer Upload'}
                  </span>
                </label>
              </div>
            )}

            {/* Grid de imagens */}
            <div className="gallery-grid">
              {loading ? (
                <p className="loading">Carregando imagens...</p>
              ) : gallery.length === 0 ? (
                <p className="empty">Nenhuma imagem na galeria</p>
              ) : (
                gallery.map(image => (
                  <div 
                    key={image.id}
                    className={`gallery-item ${selectedImageUrl === image.url ? 'selected' : ''}`}
                  >
                    <img 
                      src={image.url} 
                      alt={image.name}
                      onClick={() => handleImageSelect(image.url)}
                    />
                    <div className="item-overlay">
                      <button
                        type="button"
                        onClick={() => handleImageSelect(image.url)}
                        className="btn-select-img"
                        title="Selecionar"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="btn-delete-img"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
