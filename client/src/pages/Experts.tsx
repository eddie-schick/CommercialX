import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Mail, Phone, Linkedin, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

export default function Experts() {
  const { data: experts, isLoading } = trpc.experts.list.useQuery();

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Meet Our Experts
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Our team of commercial vehicle specialists brings decades of combined experience to help you make the right decisions for your fleet. From vehicle selection to financing and beyond, we're here to support your success.
            </p>
          </div>
        </div>
      </section>

      {/* Experts Grid */}
      <section className="py-20 bg-background">
        <div className="container">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-64 w-full" />
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : experts && experts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {experts.map((expert) => (
                <Card key={expert.id} className="hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {expert.photo ? (
                      <img
                        src={expert.photo}
                        alt={expert.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users size={64} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-1">{expert.name}</h3>
                    <p className="text-primary font-medium mb-3">{expert.title}</p>
                    {expert.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {expert.bio}
                      </p>
                    )}
                    {expert.expertise && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          EXPERTISE
                        </p>
                        <p className="text-sm">{expert.expertise}</p>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t border-border">
                      {expert.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${expert.email}`}>
                            <Mail size={16} className="mr-2" />
                            Email
                          </a>
                        </Button>
                      )}
                      {expert.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${expert.phone}`}>
                            <Phone size={16} className="mr-2" />
                            Call
                          </a>
                        </Button>
                      )}
                      {expert.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={expert.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin size={16} />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users size={64} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Experts Available</h3>
              <p className="text-muted-foreground mb-6">
                Our expert team will be featured here soon.
              </p>
              <Link href="/contact">
                <Button>Contact Us</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Work With Our Team?
            </h2>
            <p className="text-muted-foreground text-lg">
              Experience the difference of working with dedicated commercial vehicle professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <Users className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-xl mb-3">Industry Expertise</h3>
                <p className="text-muted-foreground">
                  Decades of combined experience in commercial vehicles, fleet management, and business solutions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <Phone className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-xl mb-3">Personalized Service</h3>
                <p className="text-muted-foreground">
                  One-on-one consultation to understand your unique needs and recommend the best solutions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8 text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                  <Mail className="text-primary" size={32} />
                </div>
                <h3 className="font-bold text-xl mb-3">Ongoing Support</h3>
                <p className="text-muted-foreground">
                  Continued assistance throughout your ownership experience, from purchase to maintenance
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Expert Advice?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Connect with one of our specialists to discuss your commercial vehicle needs
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary">
              Contact Our Team
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
