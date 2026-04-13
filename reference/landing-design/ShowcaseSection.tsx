import { motion } from "framer-motion";
import { Bot, Send } from "lucide-react";

const ShowcaseSection = () => (
  <section className="bg-dark-base bg-cta-gradient section-padding overflow-hidden">
    <div className="container">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#E2E8F0", letterSpacing: "-0.02em" }}>
          Automate your back office in <span className="text-gradient-blue">real-time</span>
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: "#94A3B8" }}>
          Chat with AI agents that understand your projects and generate documents instantly.
        </p>
      </motion.div>

      <motion.div
        className="max-w-2xl mx-auto rounded-[16px] overflow-hidden card-shadow backdrop-blur-sm"
        style={{ backgroundColor: "rgba(11,17,32,0.9)", border: "1px solid #1E293B" }}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "#1E293B" }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#28C840" }} />
          <span className="ml-3 text-xs" style={{ color: "#475569" }}>BackOffice Chat — Acme Corp Project</span>
        </div>

        <div className="p-5 space-y-4 min-h-[280px]">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>
              <Bot size={16} className="text-blue-primary" />
            </div>
            <div className="rounded-lg p-3 text-sm max-w-md" style={{ backgroundColor: "#1E293B", color: "#E2E8F0" }}>
              I've analyzed the latest message from Acme Corp. They're requesting 3 additional landing pages — this falls outside the original scope of 5 pages. Want me to draft a scope amendment?
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <div className="rounded-lg p-3 text-sm max-w-md text-white bg-blue-primary">
              Yes, draft the amendment and include a revised quote for the extra pages.
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>
              <Bot size={16} className="text-blue-primary" />
            </div>
            <div className="rounded-lg p-3 text-sm max-w-md" style={{ backgroundColor: "#1E293B", color: "#E2E8F0" }}>
              Done. I've generated a scope amendment with a $2,400 add-on quote for the 3 additional pages. The document is ready for review in your drafts.
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 rounded-lg p-3" style={{ backgroundColor: "#1E293B", border: "1px solid #334155" }}>
            <input
              type="text"
              placeholder="Ask BackOffice anything..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#94A3B8" }}
              readOnly
            />
            <Send size={16} className="text-blue-light" />
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default ShowcaseSection;
