import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function About() {
  return (
    <div className="page-placeholder">
      <h1>Sobre</h1>
      <p>Informações sobre a empresa Turmail. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
