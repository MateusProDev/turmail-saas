// Script para listar modelos Gemini disponíveis para sua API key
// Execute com: node scripts/list-gemini-models.js

import fetch from 'node-fetch';

const API_KEY = 'AIzaSyAPMAgVWN3Sa0ZDd-XN-GMnygeVxifg8sA';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;

fetch(ENDPOINT)
  .then(res => res.json())
  .then(data => {
    console.log('Modelos disponíveis para sua chave:');
    if (data.models) {
      data.models.forEach(model => {
        console.log(`- ${model.name}`);
      });
    } else {
      console.log('Nenhum modelo encontrado ou chave inválida:', data);
    }
  })
  .catch(err => {
    console.error('Erro ao listar modelos:', err);
  });
