// The cab's front window: the site seen through the glass (the plan), set in the cab's steel
// frame — painted steel bolted at the corners, a black rubber gasket round the glass, the pillars
// leaning in at the sides, an ochre grab rail across the top (ochre: the one part a hand holds)
// and a wiper parked along the bottom. `glow` lights the frame up for the guide. Clicks pass
// through the frame's drawing to the plan.

// A bolt head in one corner of the frame.
function Bolt({ at }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#9aa4ad,#454e56)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)] ${at}`}
    />
  );
}

export default function CabWindow({ glow, children }) {
  return (
    <section
      className={`relative flex min-h-[46vh] min-w-0 flex-col rounded-[6px] bg-gradient-to-b from-cab-steel to-[#232a30] p-[10px] shadow-[0_8px_24px_rgba(20,24,28,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-shadow lg:min-h-0 ${
        glow ? "ring-4 ring-ochre-hi/70 shadow-[0_0_28px_rgba(227,154,44,0.45)]" : ""
      }`}
    >
      <Bolt at="left-[3px] top-[3px]" />
      <Bolt at="right-[3px] top-[3px]" />
      <Bolt at="bottom-[3px] left-[3px]" />
      <Bolt at="bottom-[3px] right-[3px]" />
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[3px] bg-[#f4f1ec] shadow-[0_0_0_3px_#0e1114]">
        {children}
        {/* the pillars leaning in, the grab rail, the parked wiper and a little glare on the glass */}
        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
          <div className="absolute inset-y-0 left-0 w-[3.5%] bg-gradient-to-r from-[#1f252a] to-cab-steel [clip-path:polygon(0_0,40%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-y-0 right-0 w-[3.5%] bg-gradient-to-l from-[#1f252a] to-cab-steel [clip-path:polygon(60%_0,100%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-x-[6%] top-[9%] h-[6px] rounded-full bg-gradient-to-b from-ochre-hi to-[#8f5207] shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
          <div className="absolute bottom-[6px] left-[8%] h-[3px] w-[34%] origin-left -rotate-[4deg] rounded-full bg-[#15191c] shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
          <div className="absolute bottom-[3px] left-[8%] h-2 w-2 -translate-x-1/2 rounded-full bg-[#15191c]" />
          <div className="absolute -left-1/4 top-0 h-full w-1/3 rotate-12 bg-white/[0.05]" />
        </div>
      </div>
    </section>
  );
}
