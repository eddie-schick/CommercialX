import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_LOGO } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
// Removed getLoginUrl import - using direct /login route instead

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src={APP_LOGO} alt="CommercialX" className="h-32 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/inventory" className="text-foreground hover:text-primary transition-colors font-medium">
              Browse Vehicles
            </Link>
            <Link href="/bodies-equipment" className="text-foreground hover:text-primary transition-colors font-medium">
              Body & Equipment
            </Link>
            <Link href="/infrastructure" className="text-foreground hover:text-primary transition-colors font-medium">
              Infrastructure
            </Link>
            <Link href="/financing" className="text-foreground hover:text-primary transition-colors font-medium">
              Financing
            </Link>
            <Link href="/resources" className="text-foreground hover:text-primary transition-colors font-medium">
              Resource Center
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {user?.role === "dealer" && (
                  <Button variant="outline" asChild>
                    <Link href="/dealer">Dashboard</Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href="/profile">My Account</Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
            <Button className="bg-primary hover:bg-primary/90" asChild>
              <Link href="/dealer">List Your Inventory</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 text-foreground hover:text-primary"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <Link
              href="/inventory"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Browse Vehicles
            </Link>
            <Link
              href="/bodies-equipment"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Body & Equipment
            </Link>
            <Link
              href="/infrastructure"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Infrastructure
            </Link>
            <Link
              href="/financing"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Financing
            </Link>
            <Link
              href="/resources"
              className="block py-2 text-foreground hover:text-primary transition-colors font-medium"
              onClick={toggleMenu}
            >
              Resource Center
            </Link>
            <div className="pt-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {user?.role === "dealer" && (
                    <Button variant="outline" className="w-full" onClick={toggleMenu} asChild>
                      <Link href="/dealer">Dashboard</Link>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={toggleMenu} asChild>
                    <Link href="/profile">My Account</Link>
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login" onClick={toggleMenu}>Sign In</Link>
                </Button>
              )}
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={toggleMenu} asChild>
                <Link href="/dealer">List Your Inventory</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
