import { useState, useEffect } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const links = ["Product", "Features", "Pricing", "Blog"];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 lg:px-8">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 text-xl font-bold shrink-0 transition-all duration-300" style={{ color: "#E2E8F0" }}>
          <span className="w-8 h-8 rounded-lg bg-blue-primary flex items-center justify-center text-sm font-extrabold text-white">B</span>
          <span className={`transition-all duration-300 overflow-hidden ${scrolled ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
            BackOffice
          </span>
        </a>

        {/* Right-anchored pill: nav links + CTA */}
        <div className="hidden md:flex items-center rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] backdrop-blur-xl pl-3 pr-1.5 py-1.5">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="px-5 py-2 rounded-full text-sm font-medium transition-colors hover:bg-white/[0.08]"
              style={{ color: "#CBD5E1" }}
            >
              {l}
            </a>
          ))}
          <Button className="ml-2 bg-white text-dark-base hover:bg-white/90 rounded-full px-5 py-2 text-sm font-semibold gap-2 transition-all h-auto">
            Get Started
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" style={{ color: "#E2E8F0" }} onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden mt-3 rounded-2xl bg-dark-surface/95 backdrop-blur-xl ring-1 ring-white/[0.08] p-4 space-y-1">
          {links.map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase()}`}
              className="block text-sm py-2.5 px-4 rounded-xl hover:bg-white/[0.06] transition-colors"
              style={{ color: "#CBD5E1" }}
              onClick={() => setMobileOpen(false)}
            >
              {l}
            </a>
          ))}
          <Button className="w-full bg-blue-primary hover:bg-blue-secondary text-white rounded-full mt-2">
            Get Started
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
