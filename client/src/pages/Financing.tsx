import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingDown,
  Calendar,
  Shield,
  CheckCircle,
  Calculator,
  FileText,
  Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function Financing() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Financing & Leasing Made Simple
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Whether you're buying one vehicle or an entire fleet, we offer financing solutions designed for commercial buyers with competitive rates and flexible terms.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Get Pre-Qualified
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Financing Options */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Financing Option
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select the option that best fits your business needs and budget
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Lease */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 mx-auto">
                  <Calendar className="text-primary" size={32} />
                </div>
                <CardTitle className="text-2xl">Lease</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Lower monthly payments with flexible end-of-term options
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Lower monthly payments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Tax advantages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Upgrade flexibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Preserve capital</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">Learn More</Button>
              </CardContent>
            </Card>

            {/* Finance */}
            <Card className="hover:shadow-xl transition-shadow border-2 border-primary">
              <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-semibold">
                Most Popular
              </div>
              <CardHeader className="text-center pb-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 mx-auto">
                  <DollarSign className="text-primary" size={32} />
                </div>
                <CardTitle className="text-2xl">Finance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Own your vehicle with competitive rates and terms
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Build equity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">No mileage restrictions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Competitive rates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Flexible terms</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">Get Started</Button>
              </CardContent>
            </Card>

            {/* Fleet Financing */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 mx-auto">
                  <Users className="text-primary" size={32} />
                </div>
                <CardTitle className="text-2xl">Fleet Financing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-center">
                  Special programs for multiple vehicle purchases
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Volume discounts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Dedicated support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Custom terms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                    <span className="text-sm">Streamlined process</span>
                  </li>
                </ul>
                <Button className="w-full mt-6">Contact Us</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Finance with CommercialX?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <TrendingDown className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Competitive Rates</h3>
              <p className="text-muted-foreground">
                Access to multiple lenders ensures you get the best rates available
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Calendar className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Flexible Terms</h3>
              <p className="text-muted-foreground">
                Choose terms that work for your business, from 12 to 84 months
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <FileText className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Simple Process</h3>
              <p className="text-muted-foreground">
                Quick pre-qualification with minimal paperwork required
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Shield className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Expert Support</h3>
              <p className="text-muted-foreground">
                Dedicated financing specialists to guide you through the process
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get approved in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  1
                </div>
                <h3 className="font-bold text-xl mb-2">Apply Online</h3>
                <p className="text-muted-foreground">
                  Fill out our simple application form in minutes
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  2
                </div>
                <h3 className="font-bold text-xl mb-2">Get Approved</h3>
                <p className="text-muted-foreground">
                  Receive multiple offers from our lending partners
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full text-2xl font-bold mb-4">
                  3
                </div>
                <h3 className="font-bold text-xl mb-2">Drive Away</h3>
                <p className="text-muted-foreground">
                  Choose your terms and complete your purchase
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/contact">
              <Button size="lg">
                <Calculator size={20} className="mr-2" />
                Calculate Your Payment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">
                    What credit score do I need?
                  </h3>
                  <p className="text-muted-foreground">
                    We work with borrowers of all credit levels. While higher credit scores typically result in better rates, we have programs available for various credit situations.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">
                    How long does approval take?
                  </h3>
                  <p className="text-muted-foreground">
                    Most applications are processed within 24-48 hours. In many cases, you can receive a decision the same day you apply.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">
                    Can I finance used vehicles?
                  </h3>
                  <p className="text-muted-foreground">
                    Yes! We offer financing for both new and used commercial vehicles. Terms and rates may vary based on the vehicle's age and condition.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-2">
                    What documents do I need?
                  </h3>
                  <p className="text-muted-foreground">
                    Typically, you'll need business tax returns, bank statements, proof of insurance, and a valid driver's license. Our team will guide you through the specific requirements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Finance Your Fleet?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Get pre-qualified in minutes and start shopping with confidence
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              Get Pre-Qualified Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
