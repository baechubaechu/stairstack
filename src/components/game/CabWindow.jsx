// The cab's front window: the site seen through the glass (the plan), inside the cab's grey frame
// with its pillars leaning in at the sides and a grab rail across the top. `glow` lights the frame
// up for the guide. Clicks pass through the frame's drawing to the plan.
export default function CabWindow({ glow, children }) {
  return (
    <section
      className={`relative flex min-h-[46vh] min-w-0 flex-col overflow-hidden rounded-[22px] border-[7px] bg-[#7b8187] shadow-[0_8px_24px_rgba(40,46,52,0.3)] transition-shadow lg:min-h-0 ${
        glow ? "border-[#f5b04a] ring-4 ring-[#f5b04a]/40" : "border-[#8f959b]"
      }`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-[#f4f1ec]">
        {children}
        {/* the pillars leaning in, the grab rail, and a little glare on the glass */}
        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden="true">
          <div className="absolute inset-y-0 left-0 w-[3.5%] bg-[#8f959b] [clip-path:polygon(0_0,40%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-y-0 right-0 w-[3.5%] bg-[#8f959b] [clip-path:polygon(60%_0,100%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-x-0 top-[9%] h-[6px] bg-gradient-to-b from-[#a3a9af] to-[#6f757b] opacity-90 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
          <div className="absolute -left-1/4 top-0 h-full w-1/3 rotate-12 bg-white/[0.05]" />
        </div>
      </div>
    </section>
  );
}
