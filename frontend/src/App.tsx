import DemoOne from "@/components/ui/demo";
import FlowFieldBackground from "@/components/ui/flow-field-background";
import MaritimePattern from "@/components/ui/maritime-pattern";

function App() {
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
        <DemoOne />
      </div>
    </div>
  );
}

export default App;

