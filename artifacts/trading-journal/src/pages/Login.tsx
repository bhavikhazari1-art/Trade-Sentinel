import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

type Mode = "login" | "signup";

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name);
        toast({ title: "Account created!", description: "Welcome to your Trading Journal." });
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-5 relative overflow-hidden"
      style={{ paddingTop: "max(env(safe-area-inset-top,0px), 24px)", paddingBottom: "max(env(safe-area-inset-bottom,0px), 24px)" }}>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative flex flex-col gap-6">
        {/* Logo */}
        <div className="text-center fade-in">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-[22px] bg-primary/15 border border-primary/25 mb-4 pulse-gold shadow-xl">
            <TrendingUp className="text-primary" size={34} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold gold-text font-serif tracking-tight">TradeJournal</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Your AI-powered trading companion</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-6 shadow-2xl border border-white/[0.07] fade-in" style={{ animationDelay: ".08s" }}>
          {/* Tab toggle */}
          <div className="flex bg-muted/60 rounded-2xl p-1 mb-5">
            {(["login", "signup"] as Mode[]).map(m => (
              <button key={m}
                data-testid={`btn-${m}-tab`}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 tap-small ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  data-testid="input-name" type="text" placeholder="Full Name"
                  value={name} onChange={e => setName(e.target.value)} required
                  className="field-input pl-10"
                />
              </div>
            )}
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                data-testid="input-email" type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)} required
                className="field-input pl-10"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                data-testid="input-password"
                type={showPass ? "text" : "password"}
                placeholder="Password (min 6 chars)"
                value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6}
                className="field-input pl-10 pr-11"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors tap-small p-1.5">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button data-testid="btn-submit-auth" type="submit" disabled={loading}
              className="btn-primary mt-1">
              {loading ? "Loading…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground/60">or continue with</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <button data-testid="btn-google-signin" onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/[0.05] border border-white/[0.10] rounded-2xl py-3.5 text-sm font-semibold text-foreground hover:bg-white/[0.08] active:scale-[0.97] transition-all duration-200 disabled:opacity-50">
            <FcGoogle size={20} />
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 fade-in" style={{ animationDelay: ".18s" }}>
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
