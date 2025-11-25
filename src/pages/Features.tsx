import { Link } from 'react-router-dom'
import './PagePlaceholder.css'

export default function Features() {
  return (
    <div className="page-placeholder">
      <h1>Funcionalidades</h1>
      <p>Visão geral das funcionalidades do Turmail. Esta é uma página placeholder — você pode preencher com conteúdo detalhado.</p>
      <Link to="/" className="link-back">Voltar para Início</Link>
    </div>
  )
}
