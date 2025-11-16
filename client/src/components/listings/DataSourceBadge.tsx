/**
 * Shows data source for individual fields
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Database, Edit, HelpCircle } from "lucide-react";

interface DataSourceBadgeProps {
  source: 'nhtsa' | 'epa' | 'manual' | 'calculated';
  showLabel?: boolean;
}

export function DataSourceBadge({ source, showLabel = false }: DataSourceBadgeProps) {
  const config = {
    nhtsa: {
      icon: Database,
      label: 'NHTSA',
      color: 'bg-blue-100 text-blue-700',
      tooltip: 'Auto-filled from NHTSA VPIC database',
    },
    epa: {
      icon: Database,
      label: 'EPA',
      color: 'bg-green-100 text-green-700',
      tooltip: 'Auto-filled from EPA Fuel Economy database',
    },
    manual: {
      icon: Edit,
      label: 'Manual',
      color: 'bg-gray-100 text-gray-700',
      tooltip: 'Manually entered by dealer',
    },
    calculated: {
      icon: HelpCircle,
      label: 'Calculated',
      color: 'bg-purple-100 text-purple-700',
      tooltip: 'Automatically calculated from other fields',
    },
  };
  
  const { icon: Icon, label, color, tooltip } = config[source];
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`${color} text-xs cursor-help`}>
          <Icon className="w-3 h-3 mr-1" />
          {showLabel && label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

