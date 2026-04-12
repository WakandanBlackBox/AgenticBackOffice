import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const logos = [
  { name: "BENZINGA", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/684c70fce0b336c461a4b39f_benzinga-logo.svg" },
  { name: "Strella", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/67f7cdf0feddc96ca1950153_strella-logo.png" },
  { name: "Textio", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/684ff9043639594b5f117277_textio-logo.svg" },
  { name: "Fivetran", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/67f7cdf0feddc96ca195002c_fivetran-logo.svg" },
  { name: "Hopper", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/684ff914463c3fd1e194f47a_hopper-logo.svg" },
  { name: "PitchBook", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/67f7cdf0feddc96ca1950115_pitchbook-logo.svg" },
  { name: "Dune", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/684ff93da76352dfe38595b0_dune-logo.svg" },
  { name: "Pipe", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/67f7cdf0feddc96ca194ffa1_pipe-logo.svg" },
  { name: "Harness", url: "https://cdn.prod.website-files.com/67f7cdf0feddc96ca194ff33/67f7cdf0feddc96ca195014d_harness-logo.svg" },
];

const LogoTrack = () => (
  <div className="flex items-center gap-12 animate-scroll-logos">
    {logos.map((l) => (
      <img
        key={l.name}
        src={l.url}
        alt={l.name}
        className="h-14 md:h-16 w-auto opacity-40 shrink-0"
        style={{ filter: "brightness(0) invert(1)" }}
      />
    ))}
  </div>
);

const HeroSection = () => (
  <section className="relative bg-dark-base bg-hero-gradient pt-32 pb-0 md:pt-44 md:pb-0 overflow-hidden">
    <div className="container relative z-10 text-center">

      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight max-w-4xl mx-auto mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ color: "#E2E8F0", letterSpacing: "-0.02em" }}
      >
        Run your entire freelance business on{" "}
        <span className="text-gradient-blue">autopilot</span>
      </motion.h1>

      <motion.p
        className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
        style={{ color: "#94A3B8" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        AI agents that generate proposals, invoices, and contracts — detect scope creep — and surface business insights. All from a single chat interface.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
        <Button className="bg-blue-primary hover:bg-blue-secondary text-white rounded-lg px-8 py-6 text-base font-semibold glow-blue transition-all hover:-translate-y-0.5">
          How It Works
        </Button>
      </motion.div>
    </div>

    {/* Scrolling client logos - commented out
    <motion.div
      className="mt-20 pb-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      <p className="text-xs text-center mb-6" style={{ color: "#475569" }}>
        Trusted by freelancers & agencies handling complex client work
      </p>
      <div className="relative overflow-hidden">
        <div className="flex gap-12 w-max logo-marquee">
          <LogoTrack />
          <LogoTrack />
        </div>
      </div>
    </motion.div>
    */}
  </section>
);

export default HeroSection;
