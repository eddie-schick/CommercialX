import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  Truck, 
  DollarSign, 
  Users, 
  Building2, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Search
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function Home() {
  const [, setLocation] = useLocation();
  const [vehicleType, setVehicleType] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [make, setMake] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [zipCode, setZipCode] = useState("");

  const { data: featuredVehicles } = trpc.vehicles.getFeatured.useQuery({ limit: 6 });
  const { data: experts } = trpc.experts.list.useQuery();
  const { data: blogPosts } = trpc.blog.list.useQuery({ limit: 6 });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (vehicleType) params.append("vehicleType", vehicleType);
    if (bodyType) params.append("bodyType", bodyType);
    if (make) params.append("make", make);
    if (fuelType) params.append("fuelType", fuelType);
    if (zipCode) params.append("zipCode", zipCode);
    
    setLocation(`/inventory?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE2YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00em0wIDI4YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDQtMS43OSA0LTQgNC00LTEuNzktNC00ek0xMiAxNmMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHptMCAyOGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Find the Perfect Commercial Vehicle
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Connect with verified dealers, access accurate vehicle data, and make confident fleet decisions—all in one place.
            </p>
          </div>

          {/* Vehicle Search Widget */}
          <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-2xl p-6 md:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Search className="text-primary" size={24} />
              <h3 className="text-2xl font-bold text-foreground">Find Your Vehicle</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                </SelectContent>
              </Select>

              <Select value={bodyType} onValueChange={setBodyType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Body Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cargo-van">Cargo Van</SelectItem>
                  <SelectItem value="box-truck">Box Truck</SelectItem>
                  <SelectItem value="cutaway">Cutaway</SelectItem>
                  <SelectItem value="chassis-cab">Chassis Cab</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="dump-truck">Dump Truck</SelectItem>
                </SelectContent>
              </Select>

              <Select value={make} onValueChange={setMake}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Make" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ford">Ford</SelectItem>
                  <SelectItem value="chevrolet">Chevrolet</SelectItem>
                  <SelectItem value="ram">RAM</SelectItem>
                  <SelectItem value="gmc">GMC</SelectItem>
                  <SelectItem value="isuzu">Isuzu</SelectItem>
                  <SelectItem value="mercedes">Mercedes-Benz</SelectItem>
                  <SelectItem value="freightliner">Freightliner</SelectItem>
                </SelectContent>
              </Select>

              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                  <SelectItem value="propane">Propane</SelectItem>
                  <SelectItem value="hydrogen">Hydrogen</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="ZIP Code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="bg-background"
              />

              <Button 
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-white md:col-span-2 lg:col-span-1"
                size="lg"
              >
                Find My Vehicle
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/incentives">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <DollarSign className="text-primary" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Grants & Incentives</h3>
                      <p className="text-muted-foreground">
                        Discover available state and federal incentives to reduce costs.
                      </p>
                      <div className="mt-4 flex items-center text-primary font-medium">
                        View Incentives <ArrowRight className="ml-2" size={16} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/experts">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Users className="text-primary" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Meet Our Experts</h3>
                      <p className="text-muted-foreground">
                        Connect with experts ready to help you find the right solution.
                      </p>
                      <div className="mt-4 flex items-center text-primary font-medium">
                        Meet the Team <ArrowRight className="ml-2" size={16} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Zap className="text-primary" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Services & Solutions</h3>
                      <p className="text-muted-foreground">
                        Comprehensive support for your commercial vehicle needs.
                      </p>
                      <div className="mt-4 flex items-center text-primary font-medium">
                        Explore Services <ArrowRight className="ml-2" size={16} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Who Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Who Benefits from CommercialX Marketplace?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Our platform serves every stakeholder in the commercial vehicle ecosystem
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Dealers */}
            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Building2 className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Dealers</h3>
                <h4 className="text-lg font-semibold text-primary mb-4">Sell Smarter & Faster</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Instant & accurate vehicle listings with minimal effort</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Access a growing network of commercial vehicle buyers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Increase conversions with verified data & compliance assurance</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Buyers */}
            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Users className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3">Buyers & Fleet Operators</h3>
                <h4 className="text-lg font-semibold text-primary mb-4">Find the Right Vehicle, Faster</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Accurate vehicle specs & compliance info at a glance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Compare listings easily with standardized data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Buy with confidence, knowing vehicles meet industry standards</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* OEMs */}
            <Card>
              <CardContent className="p-8">
                <div className="inline-block p-3 bg-primary/10 rounded-lg mb-4">
                  <Truck className="text-primary" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3">OEMs & Upfitters</h3>
                <h4 className="text-lg font-semibold text-primary mb-4">Showcase Your Innovations</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Ensure vehicles are listed with accurate, detailed specifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Reach an audience actively searching for commercial vehicle solutions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-primary mt-1 flex-shrink-0" size={20} />
                    <span className="text-muted-foreground">Seamlessly integrate for precise product representation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link href="/dealer">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse Options Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Find the Right Vehicle for Your Needs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/inventory?category=oem">
              <Card className="cursor-pointer hover:shadow-xl transition-all h-full overflow-hidden group">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-8 h-full">
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    Shop by OEM
                  </h3>
                  <p className="text-muted-foreground">
                    Explore top manufacturers and compare models to find the perfect fit for your business.
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/inventory?category=body-type">
              <Card className="cursor-pointer hover:shadow-xl transition-all h-full overflow-hidden group">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 h-full">
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    Shop by Category
                  </h3>
                  <p className="text-muted-foreground">
                    Browse a wide range of commercial vehicles, including vans, trucks, and specialty vehicles.
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/inventory?category=equipment">
              <Card className="cursor-pointer hover:shadow-xl transition-all h-full overflow-hidden group">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 h-full">
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    Shop by Equipment
                  </h3>
                  <p className="text-muted-foreground">
                    Enhance your vehicle with the right tools. Explore equipment built for your industry.
                  </p>
                </div>
              </Card>
            </Link>

            <Link href="/inventory?category=vocation">
              <Card className="cursor-pointer hover:shadow-xl transition-all h-full overflow-hidden group">
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-8 h-full">
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    Shop by Vocation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose industry-specific vehicles for a reliable, efficient fleet.
                  </p>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Sell Your Vehicles with Us Today!
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join our marketplace and connect with thousands of qualified buyers
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => setLocation("/dealer")}
          >
            Get Started
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
