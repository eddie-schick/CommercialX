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
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  Ruler,
  Weight,
  Wrench,
  Shield,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";

export default function BodyEquipmentDetail() {
  const [, params] = useRoute("/bodies-equipment/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: item, isLoading } = trpc.bodiesEquipment.getById.useQuery({ id });
  const { data: images } = trpc.bodiesEquipment.getImages.useQuery({
    bodyEquipmentId: id,
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
      box_body: "Box Body",
      flatbed: "Flatbed",
      dump_body: "Dump Body",
      refrigerated: "Refrigerated",
      service_body: "Service Body",
      stake_body: "Stake Body",
      van_body: "Van Body",
      crane: "Crane",
      liftgate: "Liftgate",
      toolbox: "Toolbox",
      ladder_rack: "Ladder Rack",
      shelving: "Shelving",
      partition: "Partition",
      other: "Other",
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
            <h2 className="text-2xl font-bold mb-2">Item not found</h2>
            <p className="text-muted-foreground">
              The body or equipment you're looking for doesn't exist.
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
                <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
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

                {item.weight && (
                  <div className="flex items-center gap-2">
                    <Weight size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{item.weight} lbs</p>
                    </div>
                  </div>
                )}

                {item.capacity && (
                  <div className="flex items-center gap-2">
                    <Package size={20} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="font-medium">{item.capacity} lbs</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
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
              {item.dimensions && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Ruler className="text-primary" />
                    Dimensions & Specifications
                  </h2>
                  <div className="space-y-2">
                    <p>{item.dimensions}</p>
                    {item.material && (
                      <p>
                        <span className="font-medium">Material:</span> {item.material}
                      </p>
                    )}
                    {item.color && (
                      <p>
                        <span className="font-medium">Color:</span> {item.color}
                      </p>
                    )}
                  </div>
                </Card>
              )}

              {item.installationRequirements && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Wrench className="text-primary" />
                    Installation
                  </h2>
                  <div className="space-y-2">
                    {item.installationTime && (
                      <p>
                        <span className="font-medium">Installation Time:</span>{" "}
                        {item.installationTime}
                      </p>
                    )}
                    <p className="text-muted-foreground whitespace-pre-line">
                      {item.installationRequirements}
                    </p>
                  </div>
                </Card>
              )}

              {(item.compatibleChassisTypes ||
                item.compatibleMakes ||
                item.wheelbaseMin ||
                item.gvwrMin) && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Compatibility</h2>
                  <div className="space-y-2">
                    {item.compatibleChassisTypes && (
                      <p>
                        <span className="font-medium">Compatible Chassis:</span>{" "}
                        {item.compatibleChassisTypes}
                      </p>
                    )}
                    {item.compatibleMakes && (
                      <p>
                        <span className="font-medium">Compatible Makes:</span>{" "}
                        {item.compatibleMakes}
                      </p>
                    )}
                    {item.wheelbaseMin && item.wheelbaseMax && (
                      <p>
                        <span className="font-medium">Wheelbase Range:</span>{" "}
                        {item.wheelbaseMin}" - {item.wheelbaseMax}"
                      </p>
                    )}
                    {item.gvwrMin && item.gvwrMax && (
                      <p>
                        <span className="font-medium">GVWR Range:</span>{" "}
                        {item.gvwrMin.toLocaleString()} -{" "}
                        {item.gvwrMax.toLocaleString()} lbs
                      </p>
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
                      placeholder="Tell us about your project..."
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
