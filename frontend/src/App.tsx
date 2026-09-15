import { useState, useEffect } from "react";
import DemoOne from "@/components/ui/demo";
import OperationsPage from "@/components/ui/operations-page";
import DetailsPage from "@/components/ui/details-page";
import DepthSlicePage from "@/components/ui/depth-slice-page";
import AboutLeherPage from "@/components/ui/about-page";

function getRoute(): 'home' | 'about' | 'operations' | 'details' | 'depth-slice' {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  if (path.startsWith('/about') || hash.includes('about')) {
    return 'about';
  }
  if (path.startsWith('/depth-slice') || path.startsWith('/slice') || hash.includes('depth-slice') || hash.includes('slice')) {
    return 'depth-slice';
  }
  if (path.startsWith('/operations') || path.startsWith('/direction') || hash.includes('operations') || hash.includes('direction')) {
    return 'operations';
  }
  if (path.startsWith('/details') || path.startsWith('/dossier') || hash.includes('details') || hash.includes('dossier')) {
    return 'details';
  }
  return 'home';
}

function App() {
  const [route, setRoute] = useState<'home' | 'about' | 'operations' | 'details' | 'depth-slice'>(getRoute);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getRoute());
    };
    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("hashchange", handleRouteChange);
    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, []);

  if (route === 'about') {
    return <AboutLeherPage />;
  }

  if (route === 'depth-slice') {
    return <DepthSlicePage />;
  }

  if (route === 'operations') {
    return <OperationsPage />;
  }

  if (route === 'details') {
    return <DetailsPage />;
  }

  return (
    <div style={{ backgroundColor: 'rgb(var(--canvas))' }} className="relative min-h-screen w-full">
      <DemoOne />
    </div>
  );
}

export default App;
