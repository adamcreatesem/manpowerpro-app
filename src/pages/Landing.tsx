import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, STAGE_META } from "@/lib/stages";
import { motion } from "framer-motion";
import { ArrowRight, Check, FileText, Plane, ShieldCheck } from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const DESKS = [
  {
    n: "01",
    name: "Reception",
    job: "Takes the candidate's details and documents — passport, photos, certificates. Opens the file once everything checks out.",
  },
  {
    n: "02",
    name: "Info Desk",
    job: "Registers the candidate with the Ethiopian labor system and lists them on Musaned, open for recruitment.",
  },
  {
    n: "03",
    name: "Data Entry",
    job: "Tracks the medical exam and the signed contract, then arranges the sponsorship-transfer fee with the employer.",
  },
  {
    n: "04",
    name: "Document Control",
    job: "Files the visa through the Saudi system, books biometrics, follows the embassy — then trains, books the flight and sees them off.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-[5px] bg-foreground text-background">
              <span className="font-display text-[13px] font-medium leading-none">M</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">ManpowerPro</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted-foreground md:flex">
            <a href="#flow" className="transition-colors hover:text-foreground">Pipeline</a>
            <a href="#desks" className="transition-colors hover:text-foreground">Desks</a>
            <a href="#partners" className="transition-colors hover:text-foreground">Partners</a>
            <Link to="/portal" className="transition-colors hover:text-foreground">
              Candidate portal
            </Link>
          </nav>
          <Button asChild variant={isAuthenticated ? "default" : "outline"} size="sm">
            <Link to={isAuthenticated ? "/app/dashboard" : "/auth"}>
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="max-w-2xl">
            <p className="text-label">Foreign employment operations</p>
            <h1 className="font-display mt-5 text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl">
              Every file, every desk,
              <br />
              one pipeline.
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              ManpowerPro replaces the spreadsheet behind an Ethiopian foreign
              employment agency. Candidates move desk to desk — reception,
              registration, medical, visa, departure — and every move is
              logged, with who did it and when.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Open the office
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#flow">See the pipeline</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> 13 derived stages
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Audit trail on every edit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Placement fee ledger
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Flow */}
      <section id="flow" className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <p className="text-label">The flow</p>
            <h2 className="font-display mt-3 max-w-lg text-3xl font-normal tracking-tight sm:text-4xl">
              The file never waits in a spreadsheet
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Thirteen stages, in the exact order the office works them. Each
              stage is derived from the raw government-portal statuses the
              agency already tracks — Musaned, Wafid, E-LMIS, Tasheer.
            </p>
          </motion.div>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 flex flex-wrap gap-x-10 gap-y-6"
          >
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="tabular text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-medium">{stage}</span>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <span className="hidden text-muted-foreground/40 sm:inline">→</span>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Desks */}
      <section id="desks" className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <p className="text-label">Inside the office</p>
            <h2 className="font-display mt-3 max-w-lg text-3xl font-normal tracking-tight sm:text-4xl">
              Four desks, clear handoffs
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-border/80 bg-border/60 sm:grid-cols-2">
            {DESKS.map((d, i) => (
              <motion.div
                key={d.name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-card p-7"
              >
                <p className="text-label">{d.n}</p>
                <h3 className="mt-3 text-[17px] font-semibold tracking-tight">
                  {d.name}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                  {d.job}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What you track */}
      <section className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-3">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
              <FileText className="size-5 text-muted-foreground" />
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                The file, not the folder
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Every status the office already writes in the Master_Pipeline
                sheet — documents, Musaned, LMIS, medical, wakalah, visa,
                flight — lives on the file, derived into a single stage.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.08 }}>
              <ShieldCheck className="size-5 text-muted-foreground" />
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                Who did what
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Every edit is logged with the staff member's name and the
                change. When a file stalls, you can see exactly where and who
                last touched it.
              </p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.16 }}>
              <Plane className="size-5 text-muted-foreground" />
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
                Fees follow placements
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Each placement earns a fee from the Saudi employer. The ledger
                tracks it in SAR, ETB or USD until it's settled.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="border-b border-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <p className="text-label">Working with licensed Saudi recruiters</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-3 text-[15px] font-medium text-muted-foreground">
              <span>AL-MA CO.</span>
              <span>AL-MA WASATAH</span>
              <span>JU CO.</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-5 py-24 text-center sm:px-8">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="font-display mx-auto max-w-xl text-4xl font-normal tracking-tight sm:text-5xl">
              Replace the spreadsheet
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Sign in and take the pipeline for a spin — demo data loads
              automatically, with real files at every stage.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/auth">
                Sign in to ManpowerPro
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:px-8">
          <span>ManpowerPro — foreign employment operations software.</span>
          <div className="flex items-center gap-5">
            <Link to="/portal" className="underline underline-offset-2 transition-colors hover:text-foreground">
              Candidate portal
            </Link>
            <span>Addis Ababa → Riyadh</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
