import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, ShieldCheck, Store } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError("");

    // Tiny delay for UX feel
    await new Promise((r) => setTimeout(r, 300));

    const result = login(password);
    setIsLoading(false);

    if (result === "invalid") {
      setError("Galat password. Dobara try karein.");
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 600);
    }
    // If valid, AuthContext updates role and parent re-renders to show app
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Background grid texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, oklch(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />

      {/* Subtle radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, oklch(var(--primary) / 0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo lockup */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-sidebar rounded-2xl p-3.5 shadow-lg ring-1 ring-sidebar-border">
            <Store className="h-7 w-7 text-sidebar-foreground" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              StoreTrack
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Consumption Manager
            </p>
          </div>
        </div>

        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="shadow-xl border-border bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="font-display text-lg">Login</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Admin ya Worker password enter karein
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="login-password"
                    className="text-sm font-medium"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password enter karein..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      className={`pr-10 h-11 text-base ${
                        error
                          ? "border-destructive focus-visible:ring-destructive/40"
                          : ""
                      }`}
                      autoFocus
                      autoComplete="current-password"
                      data-ocid="login.input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      data-ocid="login.toggle"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive font-medium flex items-center gap-1.5 mt-1"
                      role="alert"
                      data-ocid="login.error_state"
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-destructive shrink-0"
                        aria-hidden="true"
                      />
                      {error}
                    </motion.p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isLoading || !password.trim()}
                  data-ocid="login.primary_button"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>

              {/* Role hint */}
              <div className="mt-5 pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                  Available roles
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-none">
                        Admin
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                        Full access
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <Lock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-none">
                        Worker
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-none">
                        Entry only
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground/60 relative z-10">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
