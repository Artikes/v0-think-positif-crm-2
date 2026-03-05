import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Export data from a Supabase table as CSV
 */
export const exportToCSV = (data, filename, columns = null) => {
  if (!data || data.length === 0) {
    toast.error('Aucune donnée à exporter');
    return;
  }

  const keys = columns || Object.keys(data[0]).filter(k => k !== 'id' && !k.endsWith('_at'));
  const header = keys.join(';');
  
  const rows = data.map(item =>
    keys.map(key => {
      let val = item[key];
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'object') return JSON.stringify(val);
      // Escape semicolons and quotes in values
      val = String(val).replace(/"/g, '""');
      if (String(val).includes(';') || String(val).includes('"') || String(val).includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    }).join(';')
  );

  const csvContent = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`${data.length} enregistrements exportés`);
};

/**
 * Export data as JSON
 */
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    toast.error('Aucune donnée à exporter');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`${data.length} enregistrements exportés`);
};

/**
 * Parse a CSV string into an array of objects
 */
const parseCSV = (csvText) => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Remove BOM if present
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = headerLine.split(';').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((header, i) => {
      let val = values[i] || '';
      val = val.replace(/^"|"$/g, '').replace(/""/g, '"');
      if (val === '') {
        obj[header] = null;
      } else if (val.startsWith('[') || val.startsWith('{')) {
        try { obj[header] = JSON.parse(val); } catch { obj[header] = val; }
      } else if (!isNaN(val) && val !== '' && !header.includes('phone') && !header.includes('name')) {
        obj[header] = Number(val);
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
};

/**
 * Import data from a CSV or JSON file into a Supabase table
 */
export const importFromFile = (tableName, onComplete, allowedColumns = null) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.json';
  
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let records;

      if (file.name.endsWith('.json')) {
        records = JSON.parse(text);
        if (!Array.isArray(records)) records = [records];
      } else {
        records = parseCSV(text);
      }

      if (records.length === 0) {
        toast.error('Fichier vide ou format invalide');
        return;
      }

      // Strip out id and timestamps, keep only allowed columns
      const cleanRecords = records.map(record => {
        const clean = {};
        Object.entries(record).forEach(([key, value]) => {
          if (key === 'id' || key === 'created_at' || key === 'updated_at') return;
          if (allowedColumns && !allowedColumns.includes(key)) return;
          clean[key] = value;
        });
        return clean;
      });

      const { error } = await supabase
        .from(tableName)
        .insert(cleanRecords);

      if (error) throw error;
      toast.success(`${cleanRecords.length} enregistrements importés`);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error?.message || 'Erreur lors de l\'import');
    }
  };

  input.click();
};
