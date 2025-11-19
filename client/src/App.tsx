import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Services from "./pages/Services";
import Financing from "./pages/Financing";
import Incentives from "./pages/Incentives";
import Experts from "./pages/Experts";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BodiesEquipment from "./pages/BodiesEquipment";
import BodyEquipmentDetail from "./pages/BodyEquipmentDetail";
import Infrastructure from "./pages/Infrastructure";
import InfrastructureDetail from "./pages/InfrastructureDetail";
import Resources from "./pages/Resources";
import Profile from "./pages/Profile";
import DealerDashboard from "./pages/dealer/Dashboard";
import DealerVehiclesList from "./pages/dealer/VehiclesList";
import DealerBodiesList from "./pages/dealer/BodiesList";
import BodyForm from "./pages/dealer/BodyForm";
import DealerInfrastructureList from "./pages/dealer/InfrastructureList";
import InfrastructureForm from "./pages/dealer/InfrastructureForm";
import DealerAnalytics from "./pages/dealer/Analytics";
import DealerSettings from "./pages/dealer/Settings";
import BulkOperations from "./pages/dealer/BulkOperations";
import CreateListing from "./pages/dealer/CreateListing";
import ListingDetail from "./pages/dealer/ListingDetail";
import EditListing from "./pages/dealer/EditListing";
import DataQualityDashboard from "./pages/admin/DataQualityDashboard";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import SetupOrganization from "./pages/SetupOrganization";
import VerifyEmail from "./pages/VerifyEmail";
import AuthVerify from "./pages/AuthVerify";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/signup" component={Signup} />
      <Route path="/login" component={Login} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/auth/verify" component={AuthVerify} />
      <Route path="/setup-organization" component={SetupOrganization} />
      <Route path="/onboarding/organization" component={SetupOrganization} />
       <Route path="/profile" component={Profile} />
      <Route path="/dealer" component={DealerDashboard} />
      <Route path="/dealer/vehicles" component={DealerVehiclesList} />
      <Route path="/dealer/listings/new" component={CreateListing} />
      <Route path="/dealer/listings/:id/edit" component={EditListing} />
      <Route path="/dealer/listings/:id" component={ListingDetail} />
      <Route path="/dealer/bodies" component={DealerBodiesList} />
      <Route path="/dealer/bodies/new" component={BodyForm} />
      <Route path="/dealer/bodies/:id" component={BodyForm} />
      <Route path="/dealer/infrastructure" component={DealerInfrastructureList} />
      <Route path="/dealer/infrastructure/new" component={InfrastructureForm} />
      <Route path="/dealer/infrastructure/:id" component={InfrastructureForm} />
      <Route path="/dealer/analytics" component={DealerAnalytics} />
      <Route path="/dealer/bulk" component={BulkOperations} />
      <Route path="/dealer/settings" component={DealerSettings} />
      <Route path="/admin/data-quality" component={DataQualityDashboard} />
      <Route path={"/inventory"} component={Inventory} />
      <Route path="/services" component={Services} />
      <Route path="/financing" component={Financing} />
      <Route path="/incentives" component={Incentives} />
      <Route path="/experts" component={Experts} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/blog" component={Blog} />
      <Route path="/bodies-equipment" component={BodiesEquipment} />
      <Route path="/bodies-equipment/:id" component={BodyEquipmentDetail} />
      <Route path="/infrastructure" component={Infrastructure} />
      <Route path="/infrastructure/:id" component={InfrastructureDetail} />
      <Route path="/resources" component={Resources} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
