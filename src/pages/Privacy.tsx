import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Privacy() {
  return (
    <div className="page-placeholder">
      <h1>Privacidade</h1>
      <p>Política de privacidade. Página em placeholder.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
