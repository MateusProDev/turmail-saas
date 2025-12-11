import accountCreationService from '../services/accountCreationService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const result = await accountCreationService.createCompleteAccount(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('[create-complete-account] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}