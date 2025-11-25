import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Templates() {
  return (
    <div className="page-placeholder">
      <h1>Templates</h1>
      <p>Modelos de e-mail prontos para agências de turismo. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
