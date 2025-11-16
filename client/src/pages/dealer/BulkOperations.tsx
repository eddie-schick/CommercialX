import DealerDashboardLayout from "@/components/DealerDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

export default function BulkOperations() {
  return (
    <DealerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Operations</h1>
          <p className="text-gray-600 mt-2">Import and export inventory in bulk</p>
        </div>

        {/* Import/Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Upload a CSV file to add multiple vehicles, bodies, or chargers at once.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Button variant="outline">
                  Select File
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Vehicles CSV</li>
                  <li>Bodies & Equipment CSV</li>
                  <li>Charging Infrastructure CSV</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Download your current inventory as a CSV file for backup or editing.
              </p>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Vehicles
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Bodies & Equipment
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Infrastructure
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Export includes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All inventory fields</li>
                  <li>Performance metrics</li>
                  <li>Current status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Downloads */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Download template files to see the required format for bulk imports.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Vehicle Template
              </Button>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Body/Equipment Template
              </Button>
              <Button variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Infrastructure Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DealerDashboardLayout>
  );
}
