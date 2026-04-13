import { Button } from '@/components/ui/button';
import { ArrowRight, Users, FileText, CreditCard, Gift, Shield, Zap, CheckCircle, Briefcase, DollarSign, ChevronRight } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import screenshotDashboard from './assets/screenshot-dashboard.png';
import screenshotContract from './assets/screenshot-contract.png';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const ease = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease } },
};

const slideLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
};

const slideRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
};

const problems = [
  'Chasing clients for payments',
  'Sending contracts via email back-and-forth',
  'Tracking milestones in spreadsheets',
  'No idea what\'s been paid vs pending',
  'Clients asking "where are we at?"',
];

const steps = [
  {
    num: '01',
    title: 'Create your project & milestones',
    desc: 'Define milestones, set payment amounts, and generate a professional contract — all in under 2 minutes. Your dashboard keeps everything organized.',
    screenshot: screenshotDashboard,
    alt: 'Freelancer dashboard showing project milestones and payment summary',
  },
  {
    num: '02',
    title: 'Client signs & pays seamlessly',
    desc: 'Share one link. Your client reviews the contract, signs digitally, picks project dates, and pays per milestone — all from their branded portal.',
    screenshot: screenshotContract,
    alt: 'Client contract signing with digital signature',
  },
];

const features = [
  { icon: Users, title: 'Client Portal', desc: 'Each client gets a branded dashboard to track progress, sign contracts, and pay.' },
  { icon: FileText, title: 'Auto Contracts', desc: 'AI-generated contracts with built-in digital signatures. Professional and binding.' },
  { icon: CreditCard, title: 'Stripe Payments', desc: 'Real credit card processing tied to milestones. No invoicing. No chasing.' },
  { icon: Gift, title: 'Bonus Tips', desc: 'Happy clients can send a bonus with a thank-you note anytime.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'You see everything. Clients see only their projects. Secure by design.' },
  { icon: Zap, title: 'One-Click Export', desc: 'Full payment history as CSV. Tax season sorted in 10 seconds.' },
];

// ── Animated counter hook ──
function useCountUp(target, duration = 2, inView = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, duration, inView]);
  return value;
}

// ── Typing animation ──
function TypeWriter({ words, className }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];
    const speed = deleting ? 40 : 70;

    if (!deleting && displayed === word) {
      const timeout = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(timeout);
    }
    if (deleting && displayed === '') {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayed(deleting ? word.slice(0, displayed.length - 1) : word.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timeout);
  }, [displayed, deleting, index, words]);

  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
        className="inline-block w-[3px] h-[1em] bg-accent ml-1 align-baseline"
      />
    </span>
  );
}

// ── Floating particles ──
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            background: i % 2 === 0
              ? 'hsl(221 83% 53% / 0.4)'
              : 'hsl(217 91% 60% / 0.4)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -80 - Math.random() * 60, 0],
            x: [0, (Math.random() - 0.5) * 40, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(221 83% 53% / 0.4) 0%, transparent 70%)', top: '-300px', left: '-200px' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60% / 0.5) 0%, transparent 70%)', top: '200px', right: '-150px' }}
        animate={{ scale: [1, 1.2, 1], rotate: [0, -15, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, hsl(221 83% 53% / 0.3) 0%, transparent 70%)', bottom: '-100px', left: '40%' }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function GridPattern() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(hsl(210 20% 95%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 20% 95%) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

// ── Animated border beam on screenshot ──
function BorderBeam() {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-24 h-24 rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(217 91% 60% / 0.6), transparent 70%)' }}
        animate={{
          top: ['-10%', '-10%', '100%', '100%', '-10%'],
          left: ['-10%', '100%', '100%', '-10%', '-10%'],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// ── Stat card with count-up ──
function StatCard({ value, suffix, label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 1.5, inView);

  return (
    <div ref={ref} className="text-center">
      <motion.div
        className="text-3xl md:text-4xl font-extrabold gradient-text"
        initial={{ scale: 0.5, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {value === 0 ? '$' : ''}{count}{suffix}
      </motion.div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function LandingView({ onGetStarted }) {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const screenshotRef = useRef(null);
  const { scrollYProgress: ssProgress } = useScroll({ target: screenshotRef, offset: ['start end', 'end start'] });
  const ssY = useTransform(ssProgress, [0, 1], [40, -40]);
  const ssRotateX = useTransform(ssProgress, [0, 0.5, 1], [4, 0, -2]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <MeshGradient />
      <GridPattern />
      <Particles />

      {/* Nav */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-2xl border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.02 }}>
            <motion.div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Briefcase className="w-[18px] h-[18px] text-primary-foreground" />
            </motion.div>
            <span className="font-bold text-lg tracking-tight">BackOffice Agent</span>
          </motion.div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onGetStarted} className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" onClick={onGetStarted} className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
                Start Free <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative pt-32 pb-12 px-6 min-h-[92vh] flex flex-col items-center justify-center">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="mb-8">
              <motion.span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-medium backdrop-blur-sm"
                animate={{ boxShadow: ['0 0 0px hsl(217 91% 60% / 0)', '0 0 20px hsl(217 91% 60% / 0.15)', '0 0 0px hsl(217 91% 60% / 0)'] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Stop chasing payments. Start getting paid.
              </motion.span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold leading-[0.95] mb-8 tracking-tight">
              The freelance
              <br />
              <span className="relative inline-block">
                <span className="gradient-text">back office</span>
                <motion.span
                  className="absolute -bottom-1.5 left-0 w-full h-1 rounded-full"
                  style={{ background: 'var(--gradient-primary)' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.7, duration: 0.7, ease }}
                  aria-hidden
                />
              </span>
              <br />
              that{' '}
              <TypeWriter
                words={['runs itself', 'saves hours', 'gets you paid', 'impresses clients']}
                className="gradient-text"
              />
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Contracts, milestones, payments, and a client portal — wired together so you can focus on the work, not the admin.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" onClick={onGetStarted} className="h-14 px-10 text-base bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-all shadow-xl shadow-primary/25">
                  Get Started — It's Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base" asChild>
                  <a href="#how-it-works">
                    See How It Works
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </a>
                </Button>
              </motion.div>
            </motion.div>

            {/* Animated stats */}
            <motion.div variants={fadeUp} className="mt-20 flex justify-center gap-16 md:gap-24">
              <StatCard value={10} suffix="x" label="Faster than email" />
              <StatCard value={100} suffix="%" label="Payment visibility" />
              <StatCard value={0} suffix="0" label="To get started" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ HERO SCREENSHOT with 3D tilt ═══ */}
      <section ref={screenshotRef} className="px-6 pb-28 relative z-10" style={{ perspective: '1200px' }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={scaleIn}
          style={{ y: ssY, rotateX: ssRotateX }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative group">
            <motion.div
              className="absolute -inset-1.5 rounded-2xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
              style={{ background: 'var(--gradient-primary)' }}
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative rounded-2xl border border-border/40 overflow-hidden shadow-2xl shadow-primary/10 bg-card">
              <BorderBeam />
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-secondary/20">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <span className="text-xs text-muted-foreground ml-2 font-mono">backoffice-agent.app</span>
              </div>
              <img src={screenshotDashboard} alt="BackOffice Agent freelancer dashboard" className="w-full" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══ PROBLEM SECTION ═══ */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/15 to-transparent" />
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Sound familiar?</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mb-4">
              Freelancing shouldn't mean
              <br />
              <span className="gradient-text">drowning in admin</span>
            </motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="space-y-3 max-w-xl mx-auto">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ x: 6, transition: { duration: 0.2 } }}
                className="flex items-center gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10 group hover:border-destructive/25 transition-all duration-300"
              >
                <motion.span
                  className="text-destructive text-lg font-bold"
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: 90, scale: 1.3 }}
                  transition={{ duration: 0.2 }}
                >
                  ✕
                </motion.span>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{p}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="text-center mt-14"
          >
            <p className="text-xl md:text-2xl font-bold">
              There's a better way. <span className="gradient-text">One tool to replace them all.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-24">
            <motion.p variants={fadeUp} className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">How it works</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold">
              Two steps to <span className="gradient-text">getting paid</span>
            </motion.h2>
          </motion.div>

          {/* Connecting line */}
          <div className="relative">
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-accent/20 to-transparent" />

            <div className="space-y-36">
              {steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={stagger}
                  className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-14 items-center`}
                >
                  <motion.div variants={i % 2 === 0 ? slideLeft : slideRight} className="lg:w-1/2 space-y-5">
                    <motion.span
                      className="text-6xl font-black gradient-text opacity-30 block"
                      whileInView={{ opacity: [0, 0.3], scale: [0.5, 1] }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                    >
                      {step.num}
                    </motion.span>
                    <h3 className="text-2xl md:text-3xl font-bold -mt-3">{step.title}</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">{step.desc}</p>
                    {i === steps.length - 1 && (
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                        <Button size="lg" onClick={onGetStarted} className="mt-4 bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 shadow-lg shadow-primary/20">
                          Start Free Now <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                  <motion.div
                    variants={i % 2 === 0 ? slideRight : slideLeft}
                    className="lg:w-1/2"
                    whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                  >
                    <div className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-primary/15 to-accent/15 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                      <div className="relative rounded-xl border border-border/40 overflow-hidden shadow-xl bg-card">
                        <img src={step.screenshot} alt={step.alt} loading="lazy" className="w-full" />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/15 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.p variants={fadeUp} className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mb-4">
              Everything you need, <span className="gradient-text">nothing you don't</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built by freelancers, for freelancers. Every feature solves a real problem.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="glass-card p-7 group hover:border-accent/30 transition-all duration-300 cursor-default relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle at 50% 0%, hsl(217 91% 60% / 0.06), transparent 70%)' }}
                />
                <motion.div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-5 group-hover:from-primary/25 group-hover:to-accent/25 transition-all duration-300 relative z-10"
                  whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.4 } }}
                >
                  <f.icon className="w-5 h-5 text-accent" />
                </motion.div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors relative z-10">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ TRUST SECTION ═══ */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mb-14">
              Built to make you <span className="gradient-text">look professional</span>
            </motion.h2>
            <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4 text-left">
              {[
                'Clients see a polished portal — not a Google Doc',
                'Contracts are generated and signed digitally',
                'Payment links are built into the workflow',
                'Bonus tips show clients you\'re worth investing in',
                'Export full payment history for your accountant',
                'Every project has clear milestones and status',
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className="flex items-start gap-3 p-4 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 300 }}
                  >
                    <CheckCircle className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                  </motion.div>
                  <span className="text-foreground">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <motion.div variants={scaleIn}>
            <div className="relative">
              <motion.div
                className="absolute -inset-4 rounded-3xl blur-2xl"
                style={{ background: 'var(--gradient-primary)' }}
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              {/* Tape strips */}
              <div className="absolute w-24 h-10 backdrop-blur-sm z-10" style={{ clipPath: 'polygon(5% 0%, 95% 2%, 100% 100%, 0% 98%)', background: 'rgba(148,163,184,0.18)', border: '1px solid rgba(148,163,184,0.25)', top: -14, left: 24, transform: 'rotate(-6deg)' }} />
              <div className="absolute w-24 h-10 backdrop-blur-sm z-10" style={{ clipPath: 'polygon(5% 0%, 95% 2%, 100% 100%, 0% 98%)', background: 'rgba(148,163,184,0.18)', border: '1px solid rgba(148,163,184,0.25)', top: -14, right: 24, transform: 'rotate(6deg)' }} />
              <div className="relative glass-card p-12 md:p-16 rounded-2xl border-accent/15">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/25"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Briefcase className="w-7 h-7 text-white" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                  Ready to run your freelance business like a <span className="gradient-text">pro</span>?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                  Stop duct-taping tools together. Get one platform that handles contracts, payments, and client communication.
                </p>
                <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" onClick={onGetStarted} className="h-14 px-10 text-base bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 transition-all shadow-xl shadow-primary/25">
                    Get Started — It's Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
                <p className="text-xs text-muted-foreground mt-4">No credit card required. Set up in 2 minutes.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/40 py-10 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-foreground">BackOffice Agent</span>
          </div>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
