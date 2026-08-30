import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { useMutation } from "convex/react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

const DEMO_LOGINS = [
  { label: "Agency owner", role: "agency_owner", name: "Meron Tesfaye", email: "owner@manpowerpro.com" },
  { label: "Manager", role: "agency_manager", name: "Biruk Lemma", email: "manager@manpowerpro.com" },
  { label: "Staff", role: "agency_staff", name: "Hanna Wondimu", email: "staff@manpowerpro.com" },
  { label: "Client", role: "client", name: "Fahad Al-Rajhi", email: "fahad@alrajhi.sa" },
] as const;

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/app/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, user, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const devBypass = useMutation(api.seed.devBypass);
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState(false);

  useEffect(() => {
    /* Send a fully-linked session straight into the app — but never yank the
       page away mid-demo (devBypass still running), and never bounce an
       unlinked guest back out: they are here to pick a demo role. */
    if (!authLoading && isAuthenticated && !demoPending && user?.agencyId) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, user, navigate, redirect, demoPending]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
    }
  };

  const handleDemo = async (demo: (typeof DEMO_LOGINS)[number]) => {
    setIsLoading(true);
    setDemoPending(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        await signIn("anonymous");
      }
      await devBypass({
        role: demo.role,
        name: demo.name,
        email: demo.email,
      });
      navigate(redirect);
    } catch (error) {
      console.error("Demo login error:", error);
      setError(
        `Demo login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
      setIsLoading(false);
      setDemoPending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-[5px] bg-foreground text-background">
            <span className="font-display text-[13px] font-medium leading-none">
              M
            </span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            ManpowerPro
          </span>
        </Link>
        <Link
          to="/"
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to site
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <Card className="w-full max-w-sm border border-border bg-card shadow-none">
          {step === "signIn" ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="font-display text-2xl font-normal tracking-tight">
                  Get started
                </CardTitle>
                <CardDescription className="text-[13px]">
                  Enter your email to log in or sign up
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleEmailSubmit}>
                <CardContent>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        className="pl-9"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="icon"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="mt-2 text-[13px] text-destructive">{error}</p>
                  )}

                  <div className="my-5">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          Or
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Continue as guest
                  </Button>
                </CardContent>
              </form>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="font-display text-2xl font-normal tracking-tight">
                  Check your email
                </CardTitle>
                <CardDescription className="text-[13px]">
                  We've sent a code to {step.email}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                <CardContent>
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) form.requestSubmit();
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <p className="mt-2 text-center text-[13px] text-destructive">
                      {error}
                    </p>
                  )}
                  <p className="mt-5 text-center text-[13px] text-muted-foreground">
                    Didn't receive a code?{" "}
                    <Button
                      variant="link"
                      className="h-auto p-0 text-[13px]"
                      onClick={() => setStep("signIn")}
                    >
                      Try again
                    </Button>
                  </p>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      <>
                        Verify code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("signIn")}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Use different email
                  </Button>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>

      {/* Demo logins */}
      <div className="mx-auto w-full max-w-sm px-5 pb-12">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Try it without an email
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {DEMO_LOGINS.map((demo) => (
            <button
              key={demo.role}
              type="button"
              onClick={() => handleDemo(demo)}
              disabled={isLoading}
              className="rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <p className="text-[12px] font-medium">{demo.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {demo.email}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Demo logins attach a seeded role to this browser session. Load the
          demo dataset once from the dashboard if the office is empty.
        </p>
        <p className="mt-4 text-center">
          <Link
            to="/portal"
            className="text-[12px] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Are you a candidate? Track your file
          </Link>
        </p>
      </div>

      <footer className="pb-6 text-center text-xs text-muted-foreground">
        Secured by{" "}
        <a
          href="https://freebuff.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          freebuff.com
        </a>
      </footer>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
