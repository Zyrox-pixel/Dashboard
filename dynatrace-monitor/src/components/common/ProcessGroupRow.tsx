import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ProcessGroup } from '../../api/types';
import { useTheme } from '../../contexts/ThemeContext';

interface ProcessGroupRowProps {
  process: ProcessGroup;
  index: number;
}

const ProcessGroupRow: React.FC<ProcessGroupRowProps> = ({ process, index }) => {
  const { isDarkTheme } = useTheme();
  
  return (
    <tr className={`${isDarkTheme ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}>
      <td className="p-3 font-medium text-sm">{process.name}</td>
      <td className="p-3 text-sm">
        <div className="flex items-center">
          {process.icon}
          <span className="ml-2">{process.technology}</span>
        </div>
      </td>
      <td className="p-3 text-right">
        <a 
          href="#" 
          className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:underline dark:text-red-400"
        >
          <ExternalLink size={12} />
          Dynatrace
        </a>
      </td>
    </tr>
  );
};

export default ProcessGroupRow;