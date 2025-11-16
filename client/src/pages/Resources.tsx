import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Wrench,
  DollarSign,
  Award,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
} from "lucide-react";

export default function Resources() {
  const resourceCategories = [
    {
      title: "Services & Solutions",
      description:
        "Comprehensive support for your commercial vehicle needs, from fleet management to upfitting services.",
      icon: Wrench,
      link: "/services",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Financing Options",
      description:
        "Flexible financing and leasing solutions tailored to your business requirements.",
      icon: DollarSign,
      link: "/financing",
      color: "from-green-500 to-green-600",
    },
    {
      title: "Grants & Incentives",
      description:
        "Discover available federal and state incentives to reduce your vehicle costs.",
      icon: Award,
      link: "/incentives",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Meet Our Experts",
      description:
        "Connect with our team of commercial vehicle specialists ready to help you.",
      icon: Users,
      link: "/experts",
      color: "from-orange-500 to-orange-600",
    },
    {
      title: "Blog & Insights",
      description:
        "Stay informed with the latest industry news, guides, and best practices.",
      icon: BookOpen,
      link: "/blog",
      color: "from-teal-500 to-teal-600",
    },
    {
      title: "Contact Us",
      description:
        "Get in touch with our team for personalized assistance with your commercial vehicle needs.",
      icon: Mail,
      link: "/contact",
      color: "from-red-500 to-red-600",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
          <div className="container">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Resource Center
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl">
              Everything you need to make informed decisions about your commercial
              vehicle investments. From expert guidance to financing options and
              industry insights.
            </p>
          </div>
        </section>

        {/* Resource Categories */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resourceCategories.map((category, index) => (
                <Link key={index} href={category.link}>
                  <a>
                    <Card className="p-6 hover:shadow-lg transition-shadow h-full group">
                      <div
                        className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                      >
                        <category.icon className="text-white" size={24} />
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {category.description}
                      </p>
                      <div className="flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                        Learn More
                        <ArrowRight size={16} className="ml-1" />
                      </div>
                    </Card>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Contact */}
        <section className="bg-muted py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Need Immediate Assistance?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our team is ready to help you find the perfect commercial vehicle
                solution for your business.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6">
                  <Phone className="text-primary mx-auto mb-3" size={32} />
                  <h3 className="font-bold mb-2">Call Us</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Mon-Fri 8am-6pm EST
                  </p>
                  <a
                    href="tel:1-800-266-6372"
                    className="text-primary font-medium hover:underline"
                  >
                    1-800-266-6372
                  </a>
                </Card>
                <Card className="p-6">
                  <Mail className="text-primary mx-auto mb-3" size={32} />
                  <h3 className="font-bold mb-2">Email Us</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    We respond within 24 hours
                  </p>
                  <a
                    href="mailto:info@commercialx.ai"
                    className="text-primary font-medium hover:underline"
                  >
                    info@commercialx.ai
                  </a>
                </Card>
                <Card className="p-6">
                  <MapPin className="text-primary mx-auto mb-3" size={32} />
                  <h3 className="font-bold mb-2">Visit Us</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Nationwide dealer network
                  </p>
                  <Link href="/contact">
                    <a className="text-primary font-medium hover:underline">
                      Find a Location
                    </a>
                  </Link>
                </Card>
              </div>
              <Link href="/contact">
                <a>
                  <Button size="lg">Contact Us Today</Button>
                </a>
              </Link>
            </div>
          </div>
        </section>

        {/* About CommercialX */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">About CommercialX</h2>
              <p className="text-lg text-muted-foreground mb-6">
                CommercialX is the leading marketplace connecting businesses with
                verified commercial vehicle dealers, upfitters, and service
                providers. Our fuel-agnostic platform helps you find the perfect
                vehicle solution—whether electric, diesel, gasoline, hybrid, or
                alternative fuel—backed by expert guidance and comprehensive
                support.
              </p>
              <Link href="/about">
                <a>
                  <Button variant="outline">Learn More About Us</Button>
                </a>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
