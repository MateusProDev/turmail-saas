export async function uploadImage(file: File | Blob) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`
  const form = new FormData()
  form.append('file', file as any)
  form.append('upload_preset', uploadPreset as string)

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) throw new Error('Cloudinary upload failed')
  return res.json()
}
