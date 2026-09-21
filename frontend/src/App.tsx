import { useState, useEffect, lazy, Suspense } from "react";
import LandingPage from "@/components/ui/landing-page";
import FlowFieldBackground from "@/components/ui/flow-field-background";
import MaritimePattern from "@/components/ui/maritime-pattern";

const OperationsPage = lazy(() => import("@/components/ui/operations-page"));
const DetailsPage = lazy(() => import("@/components/ui/details-page"));
const DepthSlicePage = lazy(() => import("@/components/ui/depth-slice-page"));
const AboutLeherPage = lazy(() => import("@/components/ui/about-page").then(m => ({ default: m.AboutLeherPage })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen w-full bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <span className="text-[11px] font-mono tracking-widest text-[#666666] uppercase">Loading Leher...</span>
      </div>
    </div>
  );
}

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
  if (path.startsWith('/details') || path.startsWith('/dossier') || path.startsWith('/hazards') || path.startsWith('/maritime') || hash.includes('details') || hash.includes('dossier') || hash.includes('hazards') || hash.includes('maritime')) {
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
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <AboutLeherPage />
      </Suspense>
    );
  }

  if (route === 'depth-slice') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <DepthSlicePage key={`${window.location.pathname}${window.location.search}`} />
      </Suspense>
    );
  }

  if (route === 'operations') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <OperationsPage />
      </Suspense>
    );
  }

  if (route === 'details') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <DetailsPage />
      </Suspense>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#080808]">
      {/* High-tech maritime navigational grid, sonar arcs & contour pattern on the left */}
      <MaritimePattern opacity={0.65} />

      {/* Dynamic light/dark blue flow field across Hero section only (does not continue into lower sections) */}
      <FlowFieldBackground 
        className="absolute top-0 left-0 w-full h-screen pointer-events-none z-0 overflow-hidden"
        mask="linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 75%, transparent 100%)"
        opacity={0.6}
        particleCount={1100}
        speed={0.4}
      />

      <div className="relative z-10">
        <LandingPage />
      </div>
    </div>
  );
}

export default App;
