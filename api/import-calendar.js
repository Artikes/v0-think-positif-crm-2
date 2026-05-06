// API to import calendar events from ICS file or Google Calendar public URL

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { icsContent, icsUrl } = req.body;

    let content = icsContent;

    // If URL provided, fetch the ICS content
    if (icsUrl && !icsContent) {
      // Handle Google Calendar URLs
      let fetchUrl = icsUrl;
      
      // Convert Google Calendar share URL to ICS export URL
      if (icsUrl.includes('calendar.google.com')) {
        // If it's a share link, convert to ical format
        if (icsUrl.includes('/embed?') || icsUrl.includes('/htmlembed?')) {
          const calId = new URL(icsUrl).searchParams.get('src');
          if (calId) {
            fetchUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;
          }
        } else if (!icsUrl.includes('.ics')) {
          // Try to extract calendar ID and build ICS URL
          const match = icsUrl.match(/calendar\/([^\/]+)/);
          if (match) {
            fetchUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(match[1])}/public/basic.ics`;
          }
        }
      }

      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CalendarImporter/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`Impossible de récupérer le calendrier: ${response.status}`);
      }

      content = await response.text();
    }

    if (!content) {
      return res.status(400).json({ error: 'Aucun contenu de calendrier fourni' });
    }

    // Parse ICS content
    const events = parseICS(content);

    return res.status(200).json({ events });
  } catch (error) {
    console.error('Error importing calendar:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'importation' });
  }
}

function parseICS(icsContent) {
  const events = [];
  const lines = icsContent.split(/\r?\n/);
  let currentEvent = null;
  let currentField = '';
  let currentValue = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle line folding (lines starting with space or tab are continuations)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].substring(1);
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.summary) {
        events.push({
          id: currentEvent.uid || `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: currentEvent.summary,
          description: currentEvent.description || '',
          start_time: currentEvent.dtstart,
          end_time: currentEvent.dtend || currentEvent.dtstart,
          location: currentEvent.location || '',
          isAllDay: currentEvent.isAllDay || false
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        let field = line.substring(0, colonIndex).split(';')[0].toUpperCase();
        let value = line.substring(colonIndex + 1);
        
        // Check for date-only values (all-day events)
        const fieldParams = line.substring(0, colonIndex);
        const isDateOnly = fieldParams.includes('VALUE=DATE') && !fieldParams.includes('VALUE=DATE-TIME');

        switch (field) {
          case 'SUMMARY':
            currentEvent.summary = unescapeICS(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = unescapeICS(value);
            break;
          case 'LOCATION':
            currentEvent.location = unescapeICS(value);
            break;
          case 'DTSTART':
            currentEvent.dtstart = parseICSDate(value, isDateOnly);
            currentEvent.isAllDay = isDateOnly;
            break;
          case 'DTEND':
            currentEvent.dtend = parseICSDate(value, isDateOnly);
            break;
          case 'UID':
            currentEvent.uid = value;
            break;
        }
      }
    }
  }

  // Filter out past events and sort by date
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  return events
    .filter(e => new Date(e.end_time) >= now)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 50); // Limit to 50 events
}

function parseICSDate(dateStr, isDateOnly = false) {
  // Remove any timezone identifier
  dateStr = dateStr.replace(/Z$/, '');
  
  if (isDateOnly || dateStr.length === 8) {
    // Format: YYYYMMDD (all-day event)
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}T00:00:00`;
  } else {
    // Format: YYYYMMDDTHHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11) || '00';
    const minute = dateStr.substring(11, 13) || '00';
    const second = dateStr.substring(13, 15) || '00';
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
}

function unescapeICS(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
