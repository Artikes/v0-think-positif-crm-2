import { generateText } from 'ai';
import { xai } from '@ai-sdk/xai';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'XAI_API_KEY is not configured. Please add your xAI API key in the project settings.' });
  }

  try {
    const { stats, talents, clients, tasks, trainers, customPrompt } = req.body;

    // Build context from actual data
    const dataContext = `
Tu es un assistant CRM intelligent pour Think Positif, une entreprise de formation et de gestion de talents.

Voici les données actuelles de l'entreprise:

STATISTIQUES GÉNÉRALES:
- Nombre de clients: ${stats?.clients || 0}
- Nombre de formateurs: ${stats?.trainers || 0}
- Nombre de talents: ${stats?.talents || 0}
- Tâches en cours: ${stats?.tasks || 0}
- Chiffre d'affaires total: ${stats?.revenue?.toLocaleString('fr-FR') || 0} €
- Coûts totaux: ${stats?.cost?.toLocaleString('fr-FR') || 0} €
- Marge nette: ${stats?.profit?.toLocaleString('fr-FR') || 0} €

RÉPARTITION DES TALENTS PAR STATUT:
${talents?.distribution?.map(t => `- ${t.name}: ${t.value}`).join('\n') || 'Aucune donnée'}

CLIENTS RÉCENTS:
${clients?.slice(0, 5).map(c => `- ${c.company_name || c.project_name}: CA ${c.revenue || 0}€, Coût ${c.cost || 0}€, Statut: ${c.status}`).join('\n') || 'Aucun client'}

TÂCHES EN COURS:
${tasks?.slice(0, 5).map(t => `- ${t.title} (Priorité: ${t.priority}, Échéance: ${t.due_date || 'Non définie'})`).join('\n') || 'Aucune tâche'}

FORMATEURS:
${trainers?.slice(0, 5).map(t => `- ${t.first_name} ${t.last_name}: ${t.expertise?.join(', ') || 'Expertise non définie'}`).join('\n') || 'Aucun formateur'}

${customPrompt ? `DEMANDE SPÉCIFIQUE DE L'UTILISATEUR:
${customPrompt}

Génère exactement 3 à 5 recommandations en répondant à cette demande spécifique tout en tenant compte des données ci-dessus.` : `Génère exactement 3 à 5 recommandations stratégiques et actionnables basées sur ces données.`}
Chaque recommandation doit être spécifique aux données fournies.

IMPORTANT: Réponds UNIQUEMENT avec un tableau JSON valide dans ce format exact (sans texte avant ou après):
[
  {
    "type": "follow_up" | "missing_info" | "match" | "optimization",
    "title": "Titre court et impactant",
    "description": "Description actionnable en 1-2 phrases"
  }
]

Types disponibles:
- "follow_up": Relance client ou talent à faire
- "missing_info": Information manquante à compléter
- "match": Opportunité de matching talent/formateur avec client
- "optimization": Amélioration de processus ou de rentabilité
`;

    // Call Grok API using AI SDK
    const result = await generateText({
      model: xai('grok-3-fast', {
        apiKey: apiKey,
      }),
      prompt: dataContext,
      system: 'Tu es un assistant CRM expert qui génère des recommandations stratégiques en JSON. Réponds uniquement avec du JSON valide, sans markdown ni texte supplémentaire.',
    });

    const textResponse = result.text;
    
    if (!textResponse) {
      return res.status(500).json({ error: 'No response from Grok' });
    }

    // Parse the JSON response - handle potential markdown code blocks
    let recommendations;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = textResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();
      
      recommendations = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse Grok response:', textResponse);
      return res.status(500).json({ 
        error: 'Failed to parse recommendations',
        raw: textResponse 
      });
    }

    return res.status(200).json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
