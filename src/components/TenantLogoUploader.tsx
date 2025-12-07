import { useState } from 'react'
import { auth, db } from '../lib/firebase'
import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { uploadImage } from '../lib/cloudinary'

interface TenantLogoUploaderProps {
  tenantId: string
  currentLogoUrl?: string
  onLogoUpdated?: (url: string) => void
}

export default function TenantLogoUploader({ tenantId, currentLogoUrl, onLogoUpdated }: TenantLogoUploaderProps) {
  const [currentUser] = useAuthState(auth)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida')
      return
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 2MB')
      return
    }

    try {
      setUploading(true)

      // Preview local
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload para Cloudinary
      const response = await uploadImage(file)
      const imageUrl = response.secure_url || response.url

      // Atualizar Firestore
      const tenantRef = doc(db, 'tenants', tenantId)
      await updateDoc(tenantRef, {
        logoUrl: imageUrl,
        updatedAt: new Date()
      })

      console.log('[Logo] Updated successfully:', imageUrl)
      
      if (onLogoUpdated) {
        onLogoUpdated(imageUrl)
      }

      alert('Logo atualizada com sucesso!')

    } catch (error) {
      console.error('[Logo] Error uploading:', error)
      alert('Erro ao fazer upload da logo. Tente novamente.')
      setPreview(currentLogoUrl || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!currentUser || !confirm('Remover logo?')) return

    try {
      setUploading(true)

      const tenantRef = doc(db, 'tenants', tenantId)
      await updateDoc(tenantRef, {
        logoUrl: null,
        updatedAt: new Date()
      })

      setPreview(null)
      
      if (onLogoUpdated) {
        onLogoUpdated('')
      }

      alert('Logo removida com sucesso!')

    } catch (error) {
      console.error('[Logo] Error removing:', error)
      alert('Erro ao remover logo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {/* Preview da Logo */}
        <div className="relative">
          {preview ? (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 bg-white">
              <img
                src={preview}
                alt="Logo da empresa"
                className="w-full h-full object-contain p-2"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex-1 space-y-2">
          <div>
            <label
              htmlFor="logo-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fazendo upload...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {preview ? 'Alterar Logo' : 'Fazer Upload'}
                </>
              )}
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </div>

          {preview && (
            <button
              onClick={handleRemoveLogo}
              disabled={uploading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remover Logo
            </button>
          )}

          <p className="text-xs text-gray-500">
            PNG, JPG ou GIF. Máximo 2MB. Recomendado: 200x200px
          </p>
        </div>
      </div>
    </div>
  )
}
