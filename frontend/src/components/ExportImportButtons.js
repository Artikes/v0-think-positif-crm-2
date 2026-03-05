import React from 'react';
import { Button } from './ui/button';
import { Download, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { exportToCSV, exportToJSON, importFromFile } from '../lib/exportImport';

const ExportImportButtons = ({ 
  data, 
  tableName, 
  filename, 
  exportColumns = null,
  importColumns = null,
  onImportComplete 
}) => {
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportToCSV(data, filename, exportColumns)}>
            Exporter en CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportToJSON(data, filename)}>
            Exporter en JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => importFromFile(tableName, onImportComplete, importColumns)}
      >
        <Upload className="h-4 w-4 mr-2" />
        Importer
      </Button>
    </div>
  );
};

export default ExportImportButtons;
