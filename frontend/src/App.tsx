import { useState, useEffect } from "react";
import DemoOne from "@/components/ui/demo";
import FlowFieldBackground from "@/components/ui/flow-field-background";
import DottedSurface from "@/components/ui/dotted-surface";
import MaritimePattern from "@/components/ui/maritime-pattern";
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
    <div className="relative min-h-screen w-full bg-[#080808]">
      {/* High-tech maritime navigational grid, sonar arcs & contour pattern on the left */}
      <MaritimePattern opacity={0.65} />

      {/* Dotted oceanic wave topology */}
      <DottedSurface 
        className="absolute top-0 left-0 w-full h-screen pointer-events-none z-0 overflow-hidden"
        opacity={0.35}
        dotColor="#dfc58d"
        speed={0.02}
        waveHeight={32}
      />

      {/* Dynamic light/dark blue flow field across Hero section only (does not continue into lower sections) */}
      <FlowFieldBackground 
        className="absolute top-0 left-0 w-full h-screen pointer-events-none z-0 overflow-hidden"
        mask="linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, transparent 100%)"
        opacity={0.5}
        particleCount={1000}
        speed={0.35}
      />

      <div className="relative z-10">
        <DemoOne />
      </div>
    </div>
  );
}

export default App;
