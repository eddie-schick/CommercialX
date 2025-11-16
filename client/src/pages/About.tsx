import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Eye,
  Heart,
  Users,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About CommercialX
            </h1>
            <p className="text-xl text-white/90">
              We're building the future of commercial vehicle marketplace—connecting buyers, dealers, and industry partners with accurate data and seamless experiences.
            </p>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Values */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
                  <Target className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="text-muted-foreground">
                  To simplify commercial vehicle transactions by providing accurate, comprehensive data and connecting the right buyers with the right vehicles at the right time.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
                  <Eye className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
                <p className="text-muted-foreground">
                  To become the most trusted platform for commercial vehicle transactions, setting the industry standard for data accuracy, transparency, and user experience.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-6">
                  <Heart className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-4">Our Values</h3>
                <p className="text-muted-foreground">
                  Integrity, innovation, and customer success drive everything we do. We believe in building lasting relationships through transparency and exceptional service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              Our Story
            </h2>
            <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
              <p>
                CommercialX was founded with a simple observation: the commercial vehicle industry needed a better way to connect buyers and sellers. Traditional methods were fragmented, data was inconsistent, and the buying process was unnecessarily complex.
              </p>
              <p>
                We set out to change that by building a platform that brings together accurate vehicle data, verified dealers, and comprehensive support services—all in one place. Our fuel-agnostic approach ensures that whether you're looking for electric, diesel, gasoline, or alternative fuel vehicles, you'll find the right solution for your business.
              </p>
              <p>
                Today, CommercialX serves dealers, fleet operators, OEMs, upfitters, and financing partners across the country. We're proud to be at the forefront of the commercial vehicle industry's digital transformation, helping businesses make smarter decisions and operate more efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Sets Us Apart
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We're more than just a marketplace—we're your partner in commercial vehicle success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Shield className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Verified Data</h3>
                <p className="text-muted-foreground">
                  Every vehicle listing is backed by accurate, verified specifications and compliance information
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Users className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Trusted Network</h3>
                <p className="text-muted-foreground">
                  Work with verified dealers and certified service providers you can trust
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Zap className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Fuel Agnostic</h3>
                <p className="text-muted-foreground">
                  Find electric, diesel, gasoline, hybrid, and alternative fuel vehicles all in one place
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <TrendingUp className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Comprehensive Support</h3>
                <p className="text-muted-foreground">
                  From financing to upfitting to maintenance, we connect you with the services you need
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <CheckCircle className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Incentive Navigation</h3>
                <p className="text-muted-foreground">
                  Expert guidance on federal, state, and local incentives to maximize your savings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Heart className="text-primary" size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">Customer-First</h3>
                <p className="text-muted-foreground">
                  Your success is our success—we're committed to delivering exceptional experiences
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">1000+</div>
              <div className="text-primary-foreground/80">Vehicles Listed</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
              <div className="text-primary-foreground/80">Verified Dealers</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
              <div className="text-primary-foreground/80">OEM Partners</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">$10M+</div>
              <div className="text-primary-foreground/80">Incentives Secured</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Experience the Difference?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of businesses that trust CommercialX for their commercial vehicle needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/inventory">
              <Button size="lg">
                Browse Vehicles
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline">
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
