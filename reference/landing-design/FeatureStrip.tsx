import { motion } from "framer-motion";
import { Sparkles, FileText, AlertCircle } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Proposals",
    points: ["Generate client proposals in seconds", "Customizable tone and structure", "Auto-pulls project context"],
  },
  {
    icon: FileText,
    title: "Smart Invoicing",
    points: ["Create invoices from chat commands", "Track payment status automatically", "Export-ready PDF generation"],
  },
  {
    icon: AlertCircle,
    title: "Scope Monitoring",
    points: ["Analyzes client messages in real-time", "Flags out-of-scope requests instantly", "Suggests boundary language"],
  },
];

const FeatureStrip = () => (
  <section className="bg-dark-base section-padding" id="features">
    <div className="container">
      <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#E2E8F0", letterSpacing: "-0.02em" }}>
          Everything your business needs,{" "}
          <span className="text-gradient-blue">automated</span>
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: "#94A3B8" }}>
          Purpose-built AI agents handle the admin work so you can focus on delivering great client work.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div key={f.title} className="rounded-[16px] p-8 border transition-all hover:-translate-y-1" style={{ backgroundColor: "#0B1120", borderColor: "#1E293B" }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.1 }}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-5" style={{ backgroundColor: "rgba(37,99,235,0.15)" }}>
              <f.icon size={24} className="text-blue-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4" style={{ color: "#E2E8F0" }}>{f.title}</h3>
            <ul className="space-y-2.5">
              {f.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm" style={{ color: "#94A3B8" }}>
                  <span className="text-blue-primary mt-0.5">•</span>{p}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureStrip;
