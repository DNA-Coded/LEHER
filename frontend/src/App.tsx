import DemoOne from "@/components/ui/demo";
import FlowFieldBackground from "@/components/ui/flow-field-background";
import MaritimePattern from "@/components/ui/maritime-pattern";

function App() {
  return (
    <div className="relative min-h-screen w-full bg-[#080808]">
      {/* High-tech maritime navigational grid, sonar arcs & contour pattern on the left */}
      <MaritimePattern opacity={0.65} />

      {/* Dynamic light/dark blue flow field across full screen including right side */}
      <FlowFieldBackground 
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        mask="none"
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

