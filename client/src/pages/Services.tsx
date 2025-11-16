import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Truck,
  Wrench,
  DollarSign,
  Users,
  Shield,
  Zap,
  Package,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function Services() {
  const services = [
    {
      icon: Truck,
      title: "Fleet Solutions",
      description:
        "Comprehensive fleet management services tailored to your business needs. From vehicle selection to ongoing maintenance, we help you optimize your commercial fleet.",
      features: [
        "Fleet assessment and planning",
        "Vehicle specification consulting",
        "Total cost of ownership analysis",
        "Fleet optimization strategies",
      ],
    },
    {
      icon: DollarSign,
      title: "Financing & Leasing",
      description:
        "Flexible financing options designed for commercial vehicle buyers. Whether you're buying one vehicle or an entire fleet, we offer competitive rates and terms.",
      features: [
        "Competitive financing rates",
        "Flexible lease terms",
        "Fleet financing programs",
        "Trade-in valuations",
      ],
    },
    {
      icon: Wrench,
      title: "Upfitting & Customization",
      description:
        "Connect with certified upfitters to customize your commercial vehicles. From basic shelving to complex specialty equipment, we help you build the perfect work vehicle.",
      features: [
        "Certified upfitter network",
        "Custom equipment installation",
        "Body and chassis modifications",
        "Specialty vehicle conversions",
      ],
    },
    {
      icon: Shield,
      title: "Warranty & Protection",
      description:
        "Protect your investment with comprehensive warranty and protection plans. Extended coverage options available for all vehicle types and fuel systems.",
      features: [
        "Extended warranty programs",
        "Maintenance protection plans",
        "Gap insurance options",
        "Roadside assistance",
      ],
    },
    {
      icon: Zap,
      title: "Infrastructure Support",
      description:
        "For electric and alternative fuel vehicles, we provide comprehensive infrastructure planning and installation services to keep your fleet running.",
      features: [
        "Charging station installation",
        "Alternative fuel infrastructure",
        "Energy management solutions",
        "Utility incentive navigation",
      ],
    },
    {
      icon: TrendingUp,
      title: "Fleet Analytics",
      description:
        "Data-driven insights to optimize your fleet operations. Track performance, reduce costs, and improve efficiency with our analytics platform.",
      features: [
        "Real-time fleet tracking",
        "Cost analysis and reporting",
        "Performance metrics",
        "Predictive maintenance alerts",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Services & Solutions
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Comprehensive support for your commercial vehicle needs. From financing to fleet management, we're here to help your business succeed.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contact Our Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-8">
                    <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                      <Icon className="text-primary" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                    <p className="text-muted-foreground mb-6">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="text-primary mt-1 flex-shrink-0" size={18} />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose CommercialX?
            </h2>
            <p className="text-muted-foreground text-lg">
              We're more than just a marketplace—we're your partner in commercial vehicle success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Users className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Expert Guidance</h3>
              <p className="text-muted-foreground">
                Industry experts ready to help you make the right decisions
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Package className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Comprehensive Solutions</h3>
              <p className="text-muted-foreground">
                Everything you need in one place—from purchase to maintenance
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <Shield className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Trusted Partners</h3>
              <p className="text-muted-foreground">
                Work with verified dealers and certified service providers
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                <TrendingUp className="text-primary" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Proven Results</h3>
              <p className="text-muted-foreground">
                Help businesses save time and money on fleet operations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Let our team help you find the perfect commercial vehicle solution for your business
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/inventory">
              <Button size="lg" variant="secondary">
                Browse Vehicles
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
