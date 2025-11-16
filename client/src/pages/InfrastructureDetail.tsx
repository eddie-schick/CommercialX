import { useState } from "react";
import { useRoute } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Zap,
  DollarSign,
  Plug,
  Cable,
  MapPin,
  Shield,
  Wifi,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function InfrastructureDetail() {
  const [, params] = useRoute("/infrastructure/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: item, isLoading } = trpc.infrastructure.getById.useQuery({ id });
  const { data: images } = trpc.infrastructure.getImages.useQuery({
    chargingInfrastructureId: id,
  });

  const [selectedImage, setSelectedImage] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Inquiry submitted successfully! We'll contact you soon.");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
    },
    onError: () => {
      toast.error("Failed to submit inquiry. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    createLead.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      message: formData.message || undefined,
      leadType: "inquiry",
      leadSource: "marketplace",
      companyId: item.companyId,
    });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Contact for pricing";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      level_1: "Level 1 (120V)",
      level_2: "Level 2 (240V)",
      dc_fast: "DC Fast Charging",
      depot_charger: "Depot Charger",
      portable: "Portable Charger",
      accessories: "Accessories",
    };
    return labels[cat] || cat;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Charger not found</h2>
            <p className="text-muted-foreground">
              The charging infrastructure you're looking for doesn't exist.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const allImages = [
    item.featuredImage,
    ...(images?.map((img) => img.imageUrl) || []),
  ].filter(Boolean) as string[];

  const displayImage = selectedImage || allImages[0] || "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 py-8">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Images */}
            <div>
              {displayImage ? (
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                    <img
                      src={displayImage}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {allImages.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(img)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 ${
                            img === displayImage
                              ? "border-primary"
                              : "border-transparent"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`${item.name} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="h-24 w-24 text-primary" />
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <div className="mb-4">
                <span className="text-sm font-medium text-primary">
                  {getCategoryLabel(item.category)}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2">{item.name}</h1>
              {item.manufacturer && (
                <p className="text-lg text-muted-foreground mb-4">
                  by {item.manufacturer}
                  {item.model && ` - ${item.model}`}
                </p>
              )}

              <div className="flex items-baseline gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <DollarSign size={28} className="text-primary" />
                  <span className="text-4xl font-bold text-primary">
                    {formatPrice(item.salePrice)}
                  </span>
                </div>
                {item.msrp && item.salePrice && item.msrp > item.salePrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(item.msrp)}
                  </span>
                )}
              </div>

              {item.installationCost && (
                <p className="text-muted-foreground mb-6">
                  Installation: {formatPrice(item.installationCost)}
                </p>
              )}

              {item.description && (
                <p className="text-foreground mb-6 leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {item.outputPower && (
                  <div className="flex items-center gap-2">
                    <Zap size={20} className="text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Output Power</p>
                      <p className="font-medium">{item.outputPower} kW</p>
                    </div>
                  </div>
                )}

                {item.inputVoltage && (
                  <div className="flex items-center gap-2">
                    <Plug size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Input Voltage</p>
                      <p className="font-medium">{item.inputVoltage}</p>
                    </div>
                  </div>
                )}

                {item.cableLength && (
                  <div className="flex items-center gap-2">
                    <Cable size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cable Length</p>
                      <p className="font-medium">{item.cableLength} ft</p>
                    </div>
                  </div>
                )}

                {item.numberOfPorts && (
                  <div className="flex items-center gap-2">
                    <Plug size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ports</p>
                      <p className="font-medium">{item.numberOfPorts}</p>
                    </div>
                  </div>
                )}

                {item.leadTimeDays && (
                  <div className="flex items-center gap-2">
                    <Clock size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Time</p>
                      <p className="font-medium">{item.leadTimeDays} days</p>
                    </div>
                  </div>
                )}

                {item.warrantyYears && (
                  <div className="flex items-center gap-2">
                    <Shield size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Warranty</p>
                      <p className="font-medium">{item.warrantyYears} years</p>
                    </div>
                  </div>
                )}
              </div>

              {item.connectorTypes && (
                <div className="mb-6">
                  <p className="text-sm font-medium mb-2">Connector Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(item.connectorTypes).map((connector: string) => (
                      <span
                        key={connector}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        {connector}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 mb-6">
                {item.networkConnected && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi size={16} className="text-primary" />
                    <span>Network Connected</span>
                  </div>
                )}
                {item.paymentCapable && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-primary" />
                    <span>Payment Capable</span>
                  </div>
                )}
                {item.loadManagement && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-primary" />
                    <span>Load Management</span>
                  </div>
                )}
              </div>

              {item.locationAddress && (
                <div className="flex items-start gap-2 mb-6 p-4 bg-muted rounded-lg">
                  <MapPin size={20} className="text-primary mt-1" />
                  <div>
                    <p className="font-medium mb-1">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {item.locationAddress}
                      <br />
                      {item.locationCity}, {item.locationState} {item.locationZipCode}
                    </p>
                    {item.isPublicAccess && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        Public Access
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                <span className="font-medium">
                  {item.stockStatus === "in_stock"
                    ? "In Stock"
                    : item.stockStatus === "backorder"
                    ? "Available on Backorder"
                    : "Made to Order"}
                </span>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 space-y-6">
              {(item.electricalRequirements || item.installationRequirements) && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Plug className="text-primary" />
                    Installation Requirements
                  </h2>
                  <div className="space-y-4">
                    {item.installationType && (
                      <p>
                        <span className="font-medium">Installation Type:</span>{" "}
                        {item.installationType.replace("_", " ")}
                      </p>
                    )}
                    {item.electricalRequirements && (
                      <div>
                        <p className="font-medium mb-2">Electrical Requirements:</p>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {item.electricalRequirements}
                        </p>
                      </div>
                    )}
                    {item.installationRequirements && (
                      <div>
                        <p className="font-medium mb-2">Installation Notes:</p>
                        <p className="text-muted-foreground whitespace-pre-line">
                          {item.installationRequirements}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {(item.weatherRating || item.certifications) && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="text-primary" />
                    Certifications & Ratings
                  </h2>
                  <div className="space-y-2">
                    {item.weatherRating && (
                      <p>
                        <span className="font-medium">Weather Rating:</span>{" "}
                        {item.weatherRating}
                      </p>
                    )}
                    {item.certifications && (
                      <div>
                        <p className="font-medium mb-2">Certifications:</p>
                        <div className="flex flex-wrap gap-2">
                          {JSON.parse(item.certifications).map((cert: string) => (
                            <span
                              key={cert}
                              className="px-3 py-1 bg-muted rounded-full text-sm"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Inquiry Form */}
            <div>
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-bold mb-4">Request Information</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        First Name *
                      </label>
                      <Input
                        required
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Last Name *
                      </label>
                      <Input
                        required
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Email *
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Company
                    </label>
                    <Input
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Message
                    </label>
                    <Textarea
                      rows={4}
                      placeholder="Tell us about your charging needs..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createLead.isPending}
                  >
                    {createLead.isPending ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Submitting...
                      </>
                    ) : (
                      "Request Quote"
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
