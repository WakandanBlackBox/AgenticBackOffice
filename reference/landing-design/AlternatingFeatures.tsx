import { motion, useInView } from "framer-motion";
import { MessageSquare, FileOutput, BarChart3, AlertCircle } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const sections = [
  {
    icon: MessageSquare,
    title: "Chat-driven workflows",
    highlight: "Chat-driven",
    description: "No more switching between apps. Tell BackOffice what you need in plain English and watch it execute — proposals, contracts, invoices, all from one conversation.",
    mockTitle: "Project: Brand Refresh — Meridian Labs",
    mockItems: ["Proposal drafted — awaiting approval", "Contract generated — sent to client", "Invoice #1042 — $4,800 — Paid"],
  },
  {
    icon: FileOutput,
    title: "Real-time document generation",
    highlight: "Real-time",
    description: "BackOffice generates polished, professional documents in seconds. Every proposal, invoice, and contract pulls context from your project data automatically.",
    mockTitle: "Recent Documents",
    mockItems: ["Proposal — Website Redesign — Draft", "Invoice #1038 — $7,200 — Pending", "Contract — Q2 Retainer — Signed"],
    reverse: true,
  },
  {
    icon: AlertCircle,
    title: "Client message analysis",
    highlight: "Client message",
    description: "BackOffice monitors incoming client messages and flags scope creep in real-time — so you can respond confidently with boundary language before work spirals.",
    mockTitle: "Scope Alert — Acme Corp",
    mockItems: ["⚠ New request: 3 extra pages (out of scope)", "Original scope: 5 pages + 1 revision", "Suggested response drafted"],
  },
  {
    icon: BarChart3,
    title: "Business insights dashboard",
    highlight: "Business insights",
    description: "See revenue trends, outstanding invoices, project health, and scope creep risk — all in one view. BackOffice analyzes your data so you always know where you stand.",
    mockTitle: "Monthly Overview — March 2026",
    mockItems: ["Revenue: $28,400 (+12% MoM)", "Outstanding: $6,200 across 3 invoices", "Scope alerts: 2 active flags"],
    reverse: true,
  },
];

const GlowingDot = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40% 0px -40% 0px" });

  return (
    <div ref={ref} className="hidden md:flex absolute left-1/2 top-8 -translate-x-1/2 z-10 items-center justify-center">
      {/* Outer glow ring - always visible but faded */}
      <motion.div
        className="absolute w-12 h-12 rounded-full"
        animate={isInView ? { scale: [1, 1.2, 1], opacity: 1 } : { opacity: 0.2 }}
        transition={isInView ? { duration: 0.6, ease: "easeOut" } : { duration: 0 }}
        style={{ backgroundColor: "rgba(37,99,235,0.15)" }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute w-8 h-8 rounded-full"
        animate={isInView ? { opacity: 1 } : { opacity: 0.15 }}
        transition={{ duration: 0.5, delay: isInView ? 0.1 : 0, ease: "easeOut" }}
        style={{ backgroundColor: isInView ? "rgba(37,99,235,0.25)" : "rgba(37,99,235,0.1)" }}
      />
      {/* Core dot - faded until activated */}
      <motion.div
        className="w-4 h-4 rounded-full relative"
        animate={isInView
          ? { opacity: 1, boxShadow: "0 0 30px rgba(37,99,235,0.8)" }
          : { opacity: 0.25, boxShadow: "0 0 0px rgba(37,99,235,0)" }
        }
        transition={{ duration: 0.4, delay: isInView ? 0.2 : 0, ease: "easeOut" }}
        style={{ backgroundColor: "#2563EB" }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={isInView ? { opacity: 1 } : { opacity: 0.15 }}
          transition={{ duration: 0.3, delay: isInView ? 0.3 : 0 }}
        />
      </motion.div>
    </div>
  );
};

const AlternatingFeatures = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const scrolled = viewportHeight - rect.top;
      const total = sectionHeight + viewportHeight;
      const progress = Math.max(0, Math.min(1, scrolled / total));
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
  <section ref={sectionRef} className="bg-dark-base section-padding relative" id="product">
    <div className="container relative">
      {/* Timeline line - dim base */}
      <div
        className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, #1E293B 8%, #1E293B 92%, transparent 100%)",
        }}
      />
      {/* Timeline line - glowing overlay that fills with scroll */}
      <div
        className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, #2563EB 6%, #3B82F6 50%, #2563EB 94%, transparent 100%)`,
          clipPath: `inset(0 0 ${100 - scrollProgress * 100}% 0)`,
          boxShadow: "0 0 8px rgba(37,99,235,0.6)",
          transition: "clip-path 0.1s linear",
        }}
      />

      <div className="space-y-24 md:space-y-32">
        {sections.map((s, i) => {
          const isReverse = !!s.reverse;
          return (
            <div key={s.title} className="relative">
              <GlowingDot />

              <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                <motion.div
                  className={isReverse ? "md:order-2" : ""}
                  initial={{ opacity: 0, x: isReverse ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>
                    <s.icon size={24} className="text-blue-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight" style={{ color: "#E2E8F0", letterSpacing: "-0.02em" }}>
                    {s.title.split(s.highlight).map((part, pi) =>
                      pi === 0 ? (
                        <span key={pi}>
                          {part}
                          <span className="text-gradient-blue">{s.highlight}</span>
                        </span>
                      ) : (
                        <span key={pi}>{part}</span>
                      )
                    )}
                  </h2>
                  <p className="text-base leading-relaxed" style={{ color: "#94A3B8" }}>
                    {s.description}
                  </p>
                </motion.div>

                <motion.div
                  className={isReverse ? "md:order-1" : ""}
                  initial={{ opacity: 0, x: isReverse ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div
                    className="rounded-[16px] p-6 card-shadow"
                    style={{
                      backgroundColor: "#0B1120",
                      border: "1px solid #1E293B",
                    }}
                  >
                    <div className="text-xs font-medium mb-4" style={{ color: "#475569" }}>
                      {s.mockTitle}
                    </div>
                    <div className="space-y-3">
                      {s.mockItems.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-lg p-3 text-sm"
                          style={{ backgroundColor: "#1E293B", color: "#E2E8F0" }}
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-primary shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
  );
};

export default AlternatingFeatures;
