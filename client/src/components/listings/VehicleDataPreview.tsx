/**
 * Shows dealers what was auto-populated vs manual entry
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Database, Edit3, Sparkles, TrendingUp } from "lucide-react";

interface VehicleDataPreviewProps {
  data: any;
  dataSources: string[];
  nhtsaConfidence: 'high' | 'medium' | 'low';
  epaAvailable: boolean;
}

export function VehicleDataPreview({ 
  data, 
  dataSources, 
  nhtsaConfidence,
  epaAvailable 
}: VehicleDataPreviewProps) {
  const confidenceColor = {
    high: 'bg-green-500/10 text-green-700 border-green-500/20',
    medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    low: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  };

  const confidenceIcon = {
    high: <TrendingUp className="w-3 h-3" />,
    medium: <Database className="w-3 h-3" />,
    low: <Edit3 className="w-3 h-3" />,
  };
  
  const filledCount = countFilledFields(data);
  
  return (
    <Card className="p-5 mb-6 bg-gradient-to-br from-primary/5 via-primary/3 to-primary/5 border-2 border-primary/20 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Vehicle Data Auto-Populated
            </h3>
            <p className="text-sm text-muted-foreground">
              Successfully decoded VIN and populated <strong className="text-foreground">{filledCount}</strong> fields from official databases
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {dataSources.includes('nhtsa') && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20">
                <Database className="w-3 h-3 mr-1.5" />
                NHTSA
              </Badge>
            )}
            {dataSources.includes('epa') && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20">
                <Database className="w-3 h-3 mr-1.5" />
                EPA
              </Badge>
            )}
            <Badge variant="outline" className={confidenceColor[nhtsaConfidence]}>
              {confidenceIcon[nhtsaConfidence]}
              <span className="ml-1.5 capitalize">{nhtsaConfidence} confidence</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border/50">
            <Edit3 className="w-4 h-4" />
            <span>All fields are editable - click any field to modify</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function countFilledFields(data: any): number {
  return Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
}

