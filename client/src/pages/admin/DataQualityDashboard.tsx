"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DealerDashboardLayout from "@/components/DealerDashboardLayout";

export default function DataQualityDashboard() {
  const { data: stats, isLoading } = trpc.admin.vehicleDataStats.useQuery();

  if (isLoading) {
    return (
      <DealerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading statistics...</p>
          </div>
        </div>
      </DealerDashboardLayout>
    );
  }

  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Data Quality</h1>
          <p className="text-gray-600 mt-2">
            Monitor VIN decode usage, data sources, and quality metrics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Source Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">VIN Decoded (NHTSA)</span>
                  <Badge variant="outline" className="bg-blue-50">
                    {stats?.nhtsaCount || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">VIN Decoded (NHTSA + EPA)</span>
                  <Badge variant="outline" className="bg-green-50">
                    {stats?.bothCount || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manual Entry</span>
                  <Badge variant="outline" className="bg-gray-50">
                    {stats?.manualCount || 0}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Configs</span>
                    <Badge>
                      {(stats?.nhtsaCount || 0) + (stats?.bothCount || 0) + (stats?.manualCount || 0)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidence Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">High Confidence</span>
                  <Badge className="bg-green-100 text-green-800">
                    {stats?.highConfidence || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Medium Confidence</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {stats?.mediumConfidence || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low Confidence</span>
                  <Badge className="bg-red-100 text-red-800">
                    {stats?.lowConfidence || 0}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Decoded</span>
                    <Badge>
                      {(stats?.highConfidence || 0) + (stats?.mediumConfidence || 0) + (stats?.lowConfidence || 0)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cache Hit Rate</span>
                  <Badge variant="outline">
                    {stats?.cacheHitRate || 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Decode Time</span>
                  <Badge variant="outline">
                    {stats?.avgDecodeTime || 0}ms
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Performance metrics coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent VIN Decodes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentDecodes && stats.recentDecodes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VIN</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Data Sources</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Decoded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentDecodes.map((decode) => (
                    <TableRow key={decode.id}>
                      <TableCell className="font-mono text-sm">
                        {decode.vin || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {decode.year} {decode.make} {decode.model}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {decode.dataSources.includes('nhtsa') && (
                            <Badge variant="outline" className="bg-blue-50">
                              NHTSA
                            </Badge>
                          )}
                          {decode.dataSources.includes('epa') && (
                            <Badge variant="outline" className="bg-green-50">
                              EPA
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            decode.confidence === 'high'
                              ? 'bg-green-100 text-green-800'
                              : decode.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {decode.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {decode.decodedAt
                          ? new Date(decode.decodedAt).toLocaleString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No VIN decodes found yet.</p>
                <p className="text-sm mt-2">
                  VIN decodes will appear here once dealers start using the VIN decoder.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DealerDashboardLayout>
  );
}

