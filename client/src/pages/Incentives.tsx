import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingDown,
  Zap,
  Building2,
  MapPin,
  CheckCircle,
  FileText,
  Calculator,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function Incentives() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Grants & Incentives
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Discover available federal, state, and local incentives to reduce the cost of your commercial vehicle purchase. Save thousands on electric, alternative fuel, and clean diesel vehicles.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Find My Incentives
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Incentive Types */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Types of Incentives Available
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Multiple programs available to help reduce your total cost of ownership
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <DollarSign className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Tax Credits</h3>
                <p className="text-muted-foreground text-sm">
                  Federal and state tax credits for qualifying vehicles
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <TrendingDown className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Rebates</h3>
                <p className="text-muted-foreground text-sm">
                  Direct cash rebates on vehicle purchases
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <FileText className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Grants</h3>
                <p className="text-muted-foreground text-sm">
                  Government grants for fleet electrification
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <Zap className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-lg mb-2">Utility Programs</h3>
                <p className="text-muted-foreground text-sm">
                  Special rates and infrastructure support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Federal Programs */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Federal Incentive Programs
            </h2>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Building2 className="text-primary" size={24} />
                    Commercial Clean Vehicle Credit (45W)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Federal tax credit for qualified commercial clean vehicles, including electric, plug-in hybrid, and fuel cell vehicles.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Credit Amount:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Up to $7,500 for vehicles under 14,000 lbs</li>
                        <li>• Up to $40,000 for vehicles over 14,000 lbs</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Eligibility:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• New qualified clean vehicles</li>
                        <li>• Used for business purposes</li>
                        <li>• Not subject to depreciation</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Zap className="text-primary" size={24} />
                    Alternative Fuel Infrastructure Tax Credit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Tax credit for installing alternative fuel refueling infrastructure, including EV charging stations.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Credit Amount:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• 30% of cost, up to $100,000 per location</li>
                        <li>• Eligible for charging equipment and installation</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Eligibility:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Located in eligible census tracts</li>
                        <li>• Publicly accessible or for business use</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <FileText className="text-primary" size={24} />
                    EPA Clean School Bus Program
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Grants and rebates for school districts to replace diesel buses with zero-emission or low-emission alternatives.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Funding Amount:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Up to $375,000 per electric bus</li>
                        <li>• Up to $200,000 per propane/CNG bus</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Eligibility:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Public school districts</li>
                        <li>• Private school bus operators</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* State Programs */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              State & Local Programs
            </h2>
            <p className="text-muted-foreground mb-8">
              Many states and municipalities offer additional incentives on top of federal programs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="text-primary" size={24} />
                    California HVIP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Hybrid and Zero-Emission Truck and Bus Voucher Incentive Project
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Up to $240,000 per vehicle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Covers trucks, buses, and vans</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="text-primary" size={24} />
                    New York Truck Voucher
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    NYSERDA Truck Voucher Incentive Program
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Up to $185,000 per vehicle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Electric and hydrogen fuel cell vehicles</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="text-primary" size={24} />
                    Colorado CVRP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Commercial Vehicle Rebate Program
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Up to $50,000 per vehicle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Medium and heavy-duty vehicles</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MapPin className="text-primary" size={24} />
                    Texas TERP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Texas Emissions Reduction Plan
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Up to 80% of incremental cost</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                      <span className="text-sm">Alternative fuel and electric vehicles</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Incentive programs vary by location and are subject to availability and eligibility requirements. Contact our team for the most up-to-date information on programs available in your area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              How to Apply for Incentives
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  1
                </div>
                <h3 className="font-bold mb-2">Find Your Vehicle</h3>
                <p className="text-sm text-muted-foreground">
                  Browse our inventory of eligible vehicles
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  2
                </div>
                <h3 className="font-bold mb-2">Check Eligibility</h3>
                <p className="text-sm text-muted-foreground">
                  Our team helps identify available programs
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  3
                </div>
                <h3 className="font-bold mb-2">Submit Application</h3>
                <p className="text-sm text-muted-foreground">
                  We assist with paperwork and submission
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  4
                </div>
                <h3 className="font-bold mb-2">Receive Savings</h3>
                <p className="text-sm text-muted-foreground">
                  Get your incentive at purchase or after
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Save on Your Next Vehicle?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Our incentive specialists can help you maximize your savings
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/inventory">
              <Button size="lg" variant="secondary">
                Browse Eligible Vehicles
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                <Calculator size={20} className="mr-2" />
                Calculate My Savings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
