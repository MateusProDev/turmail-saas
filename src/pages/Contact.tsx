import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Contact() {
  return (
    <div className="page-placeholder">
      <h1>Contato</h1>
      <p>Formas de contato e suporte. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
