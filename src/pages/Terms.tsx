import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Terms() {
  return (
    <div className="page-placeholder">
      <h1>Termos</h1>
      <p>Termos de uso. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
} 
