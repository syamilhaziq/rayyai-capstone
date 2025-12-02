import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import CardSwap, { Card as CardSwapCard } from "../components/ui/CardSwap";
import {
  ArrowRight,
  Star,
  Target,
  BarChart3,
  Brain,
  Zap,
  Eye,
  Clock,
  Lightbulb,
} from "lucide-react";
import SignInDialog from "@/components/general/SignInDialog";
import SignUpDialog from "@/components/general/SignupDialog";
import ShinyText from "../components/ui/ShinyText";
import PixelBlast from "../components/ui/PixelBlast";

/** Inline image component (no figma import needed) */
function ImageWithFallback({ src, alt, className }) {
  const [err, setErr] = useState(false);
  const fallback = "https://via.placeholder.com/360x460.png?text=RayyAI";
  return (
    <img
      src={err ? fallback : src}
      alt={alt}
      className={className}
      onError={() => setErr(true)}
      loading="lazy"
    />
  );
}

function LocalFooter() {
  return (
    <footer className="bg-[#04362c] py-6 text-[#d2eaee]">
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#6f948d]">
              <BarChart3 className="h-4 w-4 text-[#d2eaee]" />
            </div>
            <span className="text-lg sm:text-xl font-bold">RayyAI</span>
            </div>
          <div className="text-base sm:text-lg text-[#d2eaee]">
            © {new Date().getFullYear()} RayyAI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage({ onLogin, onSignup }) {
  const homeRef = useRef(null);
  const aboutUsRef = useRef(null);
  const creditCardsRef = useRef(null);
  const reviewsRef = useRef(null);
  // Navigation is now always visible (no scroll/hover behavior)
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [showSignUpDialog, setShowSignUpDialog] = useState(false);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToSection = (ref) => {
    if (!ref?.current) return;
    const headerHeight = 0;
    window.scrollTo({
      top: ref.current.offsetTop - headerHeight,
      behavior: "smooth",
    });
  };
  // No scroll/hover effects for navigation

  const reviews = [
    {
      name: "Weng Yeow",
      role: "Small Business Owner",
      content:
        "RayyAI has completely transformed how I manage my business finances. The AI insights are incredibly accurate and have helped me save over $2,000 monthly.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=150",
    },
    {
      name: "Fatin",
      role: "Financial Advisor",
      content:
        "As a financial advisor, I recommend RayyAI to all my clients. The OCR technology and expense categorization features are unmatched in the industry.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=150",
    },
    {
      name: "Faris",
      role: "Marketing Director",
      content:
        "The budget tracking and goal setting features have helped me take control of my personal finances. I've achieved my savings goals 3 months ahead of schedule!",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=150",
    },
    {
      name: "Mikaela",
      role: "Tech Entrepreneur",
      content:
        "RayyAI's AI-powered analytics provide insights I never knew I needed. It's like having a personal financial analyst available 24/7.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    },
    {
      name: "Sivan",
      role: "Freelance Designer",
      content:
        "Managing irregular income as a freelancer was challenging until I found RayyAI. The cash flow predictions are incredibly helpful for planning.",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=150",
    },
    {
      name: "Syamil",
      role: "Real Estate Investor",
      content:
        "The investment tracking and portfolio analysis features have given me a clear picture of my real estate portfolio's performance. Highly recommended!",
      rating: 5,
      image:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=150",
    },
  ];

  const aboutFeatures = [
    {
      title: "Smart Analytics",
      description:
        "AI-powered insights that analyze your spending patterns, identify trends, and provide actionable recommendations to optimize your financial health.",
      icon: Brain,
    },
    {
      title: "Automated Tracking",
      description:
        "Seamlessly connect your accounts and credit cards for real-time transaction monitoring with intelligent categorization and duplicate detection.",
      icon: Zap,
    },
    {
      title: "Goal Setting",
      description:
        "Set and achieve financial goals with intelligent budgeting tools and progress tracking that adapts to your lifestyle.",
      icon: Target,
    },
    {
      title: "Smart OCR Processing",
      description:
        "Advanced AI technology automatically scans and processes receipts, invoices, and bank statements with industry-leading accuracy.",
      icon: Eye,
    },
    {
      title: "Real-time Insights",
      description:
        "Get instant notifications about spending patterns, budget alerts, and opportunities to save money or optimize investments.",
      icon: Clock,
    },
    {
      title: "Predictive Analytics",
      description:
        "AI-powered forecasting helps predict future expenses, identify saving opportunities, and optimize your financial planning.",
      icon: Lightbulb,
    },
  ];

  const carouselItems = [
    {
      id: "1",
      src: "https://images.unsplash.com/photo-1556157382-97eda2d62296?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "AI Financial Dashboard Overview",
      title: "Dashboard Overview",
      description: "Cash flow, balances, and trends — all in one AI-powered view.",
    },
    {
      id: "2",
      src: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Receipt OCR Scanning",
      title: "Receipt OCR",
      description: "Snap a receipt — we extract totals, dates, and merchants instantly.",
    },
    {
      id: "3",
      src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Expense Categorization Charts",
      title: "Auto Categorization",
      description: "Transactions are auto-tagged into categories for clearer insights.",
    },
    {
      id: "4",
      src: "https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Credit Card Optimization",
      title: "Card Optimization",
      description: "Reduce interest and fees with smart payoff and utilization tips.",
    },
    {
      id: "5",
      src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Budget Planning and Goals",
      title: "Budgets & Goals",
      description: "Set monthly budgets and track progress toward savings goals.",
    },
    {
      id: "6",
      src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Insights and Alerts",
      title: "Insights & Alerts",
      description: "Get proactive alerts for unusual spend and upcoming bills.",
    },
    {
      id: "7",
      src: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
      alt: "Investment and Net Worth Tracking",
      title: "Net Worth",
      description: "Track assets, liabilities, and net worth over time.",
    },
  ];

  const creditCards = [
    {
      id: "1",
      name: "Harimau 2 Card",
      issuer: "Harimau Bank",
      cashback: "5% cashback",
      bonus: "RM50 welcome bonus",
      annualFee: "RM160/year",
      cardColor: "#FFD700",
      textColor: "#000000",
      cardholderName: "AHMAD RAZAK"
    },
    {
      id: "2", 
      name: "Sotong Enrich",
      issuer: "Sotong Bank",
      cashback: "3x Enrich miles",
      bonus: "10,000 bonus miles",
      annualFee: "RM200/year",
      cardColor: "#7F1D1D",
      textColor: "#FFFFFF",
      cardholderName: "SITI AMINAH"
    },
    {
      id: "3",
      name: "Awam Bank Visa",
      issuer: "Awam Bank",
      cashback: "2% cashback",
      bonus: "RM30 welcome bonus",
      annualFee: "RM120/year",
      cardColor: "#d2eaee",
      textColor: "#000000",
      cardholderName: "FARIS KAMAL"
    }
  ];

  // Motion preset
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut", delay: i * 0.1 },
    }),
  };

  return (
    <div 
      className="w-full overflow-x-hidden min-h-screen"
      style={{
        background: '#2E937D'
      }}
    > 
      {/* Local CSS for brand palette effects */}
      <style>{`
        /* Rolling gallery */
        .rolling-gallery-track { animation: scroll-x 60s linear infinite; will-change: transform; }
        .rolling-gallery-track:hover { animation-play-state: play; }
        @keyframes scroll-x { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        /* Tilted review cards */
        .tilted-card { transform: rotate(var(--tilt, 0deg)); transition: transform 400ms ease, background 300ms ease, border-color 300ms ease; }
        .tilted-card:hover { transform: rotate(var(--hover-tilt, .6deg)) translateY(-2px); }
        /* Simple 3D flip for About cards */
        .perspective { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .flip-y { transform: rotateY(180deg); }
        .card-flip:hover .flip-target { transform: rotateY(180deg); }
        .transition-700 { transition: transform 700ms cubic-bezier(.2,.8,.2,1); }
        
      `}</style>

      {/* Pill Navigation - Always visible */}
      <nav className="fixed top-0 left-0 z-[60] w-full">
        <div className="w-screen px-4 sm:px-6 lg:px-8 pt-4">
          <div
            className="mx-auto flex max-w-6xl items-center justify-between gap-6 rounded-full px-4 py-2 sm:px-6 sm:py-3 shadow-lg border border-[#e0fbff]/20 bg-[#04362c]/10 backdrop-blur-2xl text-[#e0fbff]"
          >
            {/* Brand */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 rounded-full px-3 py-1.5"
            >
              <ShinyText 
                text="RayyAI" 
                disabled={false} 
                speed={3} 
                className={`text-xl sm:text-2xl font-bold tracking-wide`}
              />
            </button>

            {/* Center nav */}
            <div className="hidden items-center gap-7 md:flex">
              {[
                { label: "Home", ref: homeRef },
                { label: "Features", ref: aboutUsRef },
                { label: "Cards", ref: creditCardsRef },
                { label: "Reviews", ref: reviewsRef },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.ref)}
                  className={"rounded-full px-5 py-3 text-lg sm:text-xl font-semibold text-[#e0fbff]/90 transition-colors hover:bg-[#e0fbff]/10"}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                onClick={() => setShowSignInDialog(true)}
                variant="ghost"
                className="rounded-full px-6 py-4 text-lg sm:text-xl font-semibold border border-[#04362c]/30 bg-[#04362c]/20 text-[#d2eaee] hover:bg-transparent hover:text-[#d2eaee]"
              >
                Sign In
              </Button>
              <Button
                onClick={() => setShowSignInDialog(true)}
                className="rounded-full shadow-lg px-6 py-4 text-lg sm:text-xl font-semibold bg-[#04362c] text-[#d2eaee] hover:bg-transparent hover:text-[#d2eaee]"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — uses new brand color palette */}
      <section
        ref={homeRef}
        className="relative flex min-h-screen items-center justify-center overflow-hidden"
      >
        <PixelBlast
          variant="diamond"
          pixelSize={5}
          color="#0C98BA"
          patternScale={0.2}
          patternDensity={3}
          pixelSizeJitter={2}
          enableRipples={false}
          rippleSpeed={0.4}
          speed={0.2}
          edgeFade={0.7}
          liquid={false}
          transparent={true}
          className="absolute inset-0"
          style={{ zIndex: 1 }}
        />

        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 text-center sm:px-10 lg:px-14">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="relative mb-6 font-bold tracking-tight text-center text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
            style={{ lineHeight: '1.2', paddingBottom: '0.1em', paddingTop: '0.1em' }}
          >
            <ShinyText 
              text="RayyAI" 
              disabled={false} 
              speed={3} 
              className=""
            />
          </motion.div>


          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mx-auto mb-16 max-w-5xl font-light text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-relaxed text-[#d2eaee]"
          >
            AI-powered financial assistant for your everyday spending.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="flex items-center justify-center gap-5"
          >
            <Button
              variant="outline"
              onClick={() => setShowSignUpDialog(true)}
              className="rounded-full px-10 py-8 text-xl sm:text-2xl font-medium bg-[#04362c] text-[#d2eaee] hover:bg-[#0DAD8D] hover:text-[#d2eaee]"
            >
              Create Account
            </Button>
          </motion.div>
        </div>
        
      </section>

      {/* Rolling Gallery — transparent section */}
      <section 
        className="relative w-full py-20"
      >
        <div className="relative w-full overflow-hidden flex items-center justify-center">
            {/* duplicate for seamless loop */}
            <div className="rolling-gallery-track flex w-[200%] gap-8 lg:gap-10">
              {[...carouselItems, ...carouselItems].map((item, idx) => (
                <div
                  key={item.id + "-" + idx}
                  className="group relative flex-shrink-0"
                >
                  <div className="relative overflow-hidden rounded-3xl border border-[#ffffff] bg-[#ffffff] p-6 md:p-7 shadow-2xl transition-all duration-500 group-hover:bg-[#ffffff] group-hover:shadow-3xl">
                    <ImageWithFallback
                      src={item.src}
                      alt={item.alt || item.title}
                      className="h-[360px] w-[380px] sm:h-[420px] sm:w-[440px] rounded-2xl object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-end rounded-2xl bg-black/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <div className="p-16 text-[#d2eaee] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">{item.title}</h3>
                        <p className="mt-3 text-lg sm:text-xl leading-relaxed text-[#d2eaee]/90 max-w-[95%]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* About Us — transparent section */}
      <section
        ref={aboutUsRef}
        className="py-20"
      >
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mb-24 text-center"
          >
            <h2 className="mb-6 text-4xl sm:text-5xl md:text-6xl font-bold text-[#e0fbff]">
              Our Features
            </h2>
            <p className="mx-auto max-w-4xl text-lg sm:text-xl md:text-2xl leading-relaxed text-[#e0fbff]/90">
              We're dedicated to revolutionizing personal finance through
              innovative AI technology, helping you make smarter financial
              decisions with ease and confidence.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-3">
            {aboutFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i * 0.2}
                  className="card-flip perspective"
                >
                  <div className="flip-target preserve-3d transition-700 relative h-72 w-full">
                    {/* Front */}
                    <div className="backface-hidden absolute inset-0">
                      <Card className="h-full border border-[#ffffff]/10 bg-[#ffffff]/90 text-[#04362c]">
                        <CardContent className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
                          <Icon className="h-12 w-12 text-[#04362c]" />
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#04362c]">
                            {feature.title}
                          </h3>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Back */}
                    <div className="backface-hidden flip-y absolute inset-0">
                      <Card className="h-full border border-[#ffffff]/60 bg-[#ffffff]/95 text-[#04362c]">
                        <CardContent className="flex h-full items-center justify-center p-6 text-center">
                          <p className="max-w-sm text-base sm:text-lg md:text-xl leading-relaxed text-[#04362c]">
                            {feature.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Credit Card Recommendations — transparent section */}
      <section
        ref={creditCardsRef}
        className="py-20"
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-12 items-center overflow-visible">
              {/* Title and Description */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="text-center space-y-6"
              >
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-[#d2eaee]">
                  Credit Card Recommendations
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-[#d2eaee] max-w-4xl mx-auto">
                  Discover the best credit cards tailored to your lifestyle and financial needs.
                </p>
              </motion.div>

              {/* Card Swap Animation */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={0.5}
                className="relative min-h-[300px] sm:min-h-[350px] lg:min-h-[380px] w-full flex justify-center"
              >
                <CardSwap
                  width={450}
                  height={300}
                  delay={6000}
                  pauseOnHover={false}
                  easing="power2.inOut"
                  anchorRight={false}
                >
                  {creditCards.map((card, index) => (
                    <CardSwapCard key={index}>
                      <div 
                        className="relative h-full w-full p-4 sm:p-6 lg:p-7 overflow-hidden rounded-2xl shadow-2xl border border-[#d2eaee]/20 transition-all duration-300 group-hover:shadow-3xl"
                        style={{ backgroundColor: card.cardColor }}
                      >
                        {/* Subtle background pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#d2eaee] rounded-full blur-3xl"></div>
                          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#d2eaee] rounded-full blur-2xl"></div>
                        </div>

                        {/* Card Content */}
                        <div className="relative z-10 h-full flex flex-col" style={{ color: card.textColor }}>
                          {/* Top Section - Issuer & Card Type */}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-sm sm:text-base font-semibold uppercase tracking-widest opacity-80 mb-1">
                                {card.issuer}
                              </div>
                              <h3 className="text-base sm:text-lg font-bold leading-tight">
                                {card.name}
                              </h3>
                            </div>
                            {/* Card Type Badge */}
                            <div className="bg-[#d2eaee]/20  rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
                              <span className="text-sm font-semibold">CREDIT</span>
                            </div>
                          </div>

                          {/* Chip Section */}
                          <div className="flex items-center justify-between mb-3">
                            {/* EMV Chip */}
                            <div className="relative">
                              <div className="w-8 h-6 sm:w-10 sm:h-8 bg-yellow-400 rounded-sm shadow-lg border border-yellow-400/50">
                                {/* Chip details */}
                                <div className="absolute inset-1 bg-yellow-300 rounded-sm"></div>
                                <div className="absolute top-1 left-1 right-1 h-0.5 bg-yellow-600/50 rounded-sm"></div>
                                <div className="absolute top-2 left-1 right-1 h-0.5 bg-yellow-600/50 rounded-sm"></div>
                                <div className="absolute top-3 left-1 right-1 h-0.5 bg-yellow-600/50 rounded-sm"></div>
                              </div>
                            </div>

                            {/* Contactless Symbol */}
                            <div className="flex items-center space-x-1">
                              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#d2eaee]/60 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-[#d2eaee]/60 rounded-full"></div>
                              </div>
                              <span className="text-sm font-semibold opacity-80 hidden sm:block">PayPass</span>
                            </div>
                          </div>

                          {/* Card Number */}
                          <div className="mb-3">
                            <div className="flex gap-1 sm:gap-1.5 text-base sm:text-lg font-mono font-semibold tracking-wider">
                              <span>****</span>
                              <span>****</span>
                              <span>****</span>
                              <span>9012</span>
                            </div>
                          </div>

                          {/* Spacer to push bottom content down */}
                          <div className="flex-1"></div>

                          {/* Bottom Section - Clean */}
                          <div className="flex justify-between items-end">
                            <div className="space-y-1 sm:space-y-1.5">
                              {/* Cardholder Name */}
                              <div>
                                <div className="text-sm opacity-70 mb-0.5">CARDHOLDER NAME</div>
                                <div className="text-sm sm:text-base font-semibold">{card.cardholderName}</div>
                              </div>
                              
                              {/* Expiry Date */}
                              <div>
                                <div className="text-sm opacity-70 mb-0.5">VALID THRU</div>
                                <div className="text-sm sm:text-base font-semibold">12/28</div>
                              </div>
                            </div>

                            {/* Card Network Logo */}
                            <div className="flex items-center">
                              <div className="bg-[#d2eaee]/20  rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
                                <div className="text-sm font-bold">VISA</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardSwapCard>
                  ))}
                </CardSwap>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews — transparent section */}
      <section
        ref={reviewsRef}
        className="pb-20"
      >
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="mb-24 text-center"
          >
            <h2 className="mb-6 text-4xl sm:text-5xl md:text-6xl font-bold text-[#d2eaee]">
              What Our Users Say
            </h2>
            <p className="mx-auto max-w-4xl text-lg sm:text-xl md:text-2xl leading-relaxed text-[#d2eaee]">
              Discover how RayyAI has transformed the financial lives of users
              worldwide.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, idx) => (
              <motion.div
                key={r.name + idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={idx * 0.15}
              >
                <div
                  className="tilted-card rounded-2xl border border-[#ffffff]/60 bg-[#ffffff]/80 p-8 shadow-xl hover:bg-[#ffffff]"
                  style={{
                    "--tilt": `${(idx % 2 === 0 ? 1 : -1) * 1.2}deg`,
                    "--hover-tilt": `${(idx % 2 === 0 ? 1 : -1) * 0.2}deg`,
                  }}
                >
                  <div className="mb-6">
                    <h4 className="text-lg sm:text-xl font-bold text-[#04362c]">{r.name}</h4>
                    <p className="text-base sm:text-lg text-[#04362c]">{r.role}</p>
                  </div>

                  <div className="mb-4 flex">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-6 w-6 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <p className="text-base sm:text-lg leading-relaxed text-[#04362c]">"{r.content}"</p>

                  {/* Accent bar */}
                  <div className="mt-6 h-1 w-full rounded-full bg-[#04362c]" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <LocalFooter />
      <SignInDialog 
        isOpen={showSignInDialog}
        onClose={() => setShowSignInDialog(false)}
        onLoginSuccess={onLogin}
        onOpenSignUp={() => {
          setShowSignInDialog(false);
          setShowSignUpDialog(true);
        }}
      />
      <SignUpDialog 
        isOpen={showSignUpDialog}
        onClose={() => setShowSignUpDialog(false)}
        onSignupSuccess={onSignup}
        onLoginSuccess={onLogin}
        onOpenSignIn={() => {
          setShowSignUpDialog(false);
          setShowSignInDialog(true);
        }}
      />
    </div>

      
  );
}