import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ 
      error: 'Email service not configured',
      message: 'Please add your Resend API key in the project settings'
    });
  }

  try {
    const { type, to, assigneeName, assignerName, itemTitle, itemDescription, itemType, dueDate, startTime, endTime, location } = req.body;

    if (!to || !type) {
      return res.status(400).json({ error: 'Missing required fields: to, type' });
    }

    let subject = '';
    let htmlContent = '';

    const appName = 'Think Positif CRM';
    const primaryColor = '#6366f1';

    if (type === 'task_assignment') {
      subject = `Nouvelle tâche assignée : ${itemTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Nouvelle Tâche Assignée</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Bonjour <strong>${assigneeName}</strong>,
              </p>
              <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px;">
                ${assignerName} vous a assigné une nouvelle tâche.
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                <h2 style="color: #111827; margin: 0 0 10px 0; font-size: 18px;">${itemTitle}</h2>
                ${itemDescription ? `<p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px;">${itemDescription}</p>` : ''}
                ${dueDate ? `
                  <div style="display: flex; align-items: center; color: #6b7280; font-size: 14px;">
                    <span style="margin-right: 8px;">📅</span>
                    <span>Échéance : <strong>${new Date(dueDate).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                  </div>
                ` : ''}
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 30px;">
                Cet email a été envoyé par ${appName}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'schedule_assignment') {
      const eventTypeLabels = {
        meeting: 'Réunion',
        training: 'Formation',
        client: 'Rendez-vous Client',
        personal: 'Personnel',
        other: 'Autre'
      };
      const eventLabel = eventTypeLabels[itemType] || 'Événement';
      
      subject = `Nouvel événement planifié : ${itemTitle}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Nouvel Événement Planifié</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                Bonjour <strong>${assigneeName}</strong>,
              </p>
              <p style="color: #6b7280; font-size: 15px; margin-bottom: 25px;">
                ${assignerName} vous a assigné un nouvel événement.
              </p>
              
              <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                <div style="display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 10px;">
                  ${eventLabel}
                </div>
                <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 18px;">${itemTitle}</h2>
                ${itemDescription ? `<p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px;">${itemDescription}</p>` : ''}
                
                <div style="color: #6b7280; font-size: 14px;">
                  ${startTime ? `
                    <div style="margin-bottom: 8px;">
                      <span style="margin-right: 8px;">🕐</span>
                      <span>${new Date(startTime).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div style="margin-bottom: 8px;">
                      <span style="margin-right: 8px;">⏰</span>
                      <span>${new Date(startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${new Date(endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ` : ''}
                  ${location ? `
                    <div>
                      <span style="margin-right: 8px;">📍</span>
                      <span>${location}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
              
              <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 30px;">
                Cet email a été envoyé par ${appName}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Think Positif CRM <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }

    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
