import accountCreationService from '../../services/accountCreationService.js';

export default async function handler(req, res) {
  console.log('[create-complete-account] Recebido request:', req.method, req.body);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('[create-complete-account] Tentando importar accountCreationService...');
    const accountCreationService = await import('../../services/accountCreationService.js');
    console.log('[create-complete-account] Service importado com sucesso');
    
    console.log('[create-complete-account] Chamando createCompleteAccount com body:', req.body);
    const result = await accountCreationService.default.createCompleteAccount(req.body);
    console.log('[create-complete-account] Resultado:', result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[create-complete-account] Error:', error);
    console.error('[create-complete-account] Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}