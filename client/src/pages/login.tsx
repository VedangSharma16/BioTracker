import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck, Smartphone } from "lucide-react";
import { useLogin } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api } from "@shared/routes";
import bioTrackerLogo from "@frontend-assets/logo.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [submittingRecovery, setSubmittingRecovery] = useState(false);
  const { mutate: login, isPending } = useLogin();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Error", description: "Please enter both fields", variant: "destructive" });
      return;
    }

    login(
      { username, password },
      {
        onError: (err) => {
          toast({ title: "Authentication Failed", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const requestRecoveryOtp = async () => {
    if (!recoveryPhone) {
      toast({ title: "Missing phone number", description: "Enter the registered patient phone number.", variant: "destructive" });
      return;
    }

    setSubmittingRecovery(true);
    try {
      const payload = api.auth.recoveryRequest.input.parse({ phone: recoveryPhone });
      const res = await fetch(api.auth.recoveryRequest.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = api.auth.recoveryRequest.responses[400].parse(await res.json());
        throw new Error(error.message);
      }

      const data = api.auth.recoveryRequest.responses[200].parse(await res.json());
      setOtpRequested(true);
      toast({
        title: "OTP sent",
        description:
          data.deliveryMode === "sms"
            ? "OTP sent to the registered phone number."
            : "Testing mode is active. Open /api/dev/mock-sms to see the OTP message.",
      });
    } catch (error) {
      toast({
        title: "Recovery failed",
        description: error instanceof Error ? error.message : "Unable to request OTP.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRecovery(false);
    }
  };

  const verifyRecoveryOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit OTP.", variant: "destructive" });
      return;
    }

    setSubmittingRecovery(true);
    try {
      const payload = api.auth.recoveryVerify.input.parse({ phone: recoveryPhone, otp });
      const res = await fetch(api.auth.recoveryVerify.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = api.auth.recoveryVerify.responses[400].parse(await res.json());
        throw new Error(error.message);
      }

      const data = api.auth.recoveryVerify.responses[200].parse(await res.json());
      toast({
        title: "Recovery complete",
        description:
          data.deliveryMode === "sms"
            ? "Username and password were sent to the registered phone number."
            : "Testing mode is active. Open /api/dev/mock-sms to see the account details message.",
      });
      setRecoveryOpen(false);
      setRecoveryPhone("");
      setOtp("");
      setOtpRequested(false);
    } catch (error) {
      toast({
        title: "OTP verification failed",
        description: error instanceof Error ? error.message : "Unable to verify OTP.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRecovery(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <img
            src={bioTrackerLogo}
            alt="BioTracker logo"
            className="mb-6 inline-block h-20 w-20 rounded-3xl object-cover shadow-lg shadow-primary/20 ring-1 ring-white/10"
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">BioTracker</h1>
          <p className="mt-2 text-muted-foreground">Secure Health Dashboard Portal</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                className="h-12 border-white/10 bg-background/50 focus:border-primary/50 focus:ring-primary/20"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Dialog open={recoveryOpen} onOpenChange={setRecoveryOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      Forgot username or password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="border-white/10 bg-card">
                    <DialogHeader>
                      <DialogTitle>Recover account access</DialogTitle>
                      <DialogDescription>
                        Enter the patient phone number, verify the OTP, and we will send the account details to that registered number.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                        Free testing mode is enabled when no SMS provider is configured. Use <span className="font-semibold">/api/dev/mock-sms</span> to view OTP and recovery messages.
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="recovery-phone">Registered phone number</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="recovery-phone"
                            type="text"
                            className="pl-10"
                            placeholder="Enter phone number"
                            value={recoveryPhone}
                            onChange={(e) => setRecoveryPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      {otpRequested ? (
                        <div className="space-y-3">
                          <Label>Enter OTP</Label>
                          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      ) : null}

                      <div className="flex gap-3">
                        {!otpRequested ? (
                          <Button type="button" className="w-full" disabled={submittingRecovery} onClick={requestRecoveryOtp}>
                            {submittingRecovery ? "Sending OTP..." : "Send OTP"}
                          </Button>
                        ) : (
                          <>
                            <Button type="button" variant="outline" className="w-full" disabled={submittingRecovery} onClick={requestRecoveryOtp}>
                              Resend OTP
                            </Button>
                            <Button type="button" className="w-full" disabled={submittingRecovery} onClick={verifyRecoveryOtp}>
                              {submittingRecovery ? "Verifying..." : "Verify OTP"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="h-12 border-white/10 bg-background/50 pr-12 focus:border-primary/50 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 w-full text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-primary/40"
              disabled={isPending}
            >
              {isPending ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/5 pt-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>HIPAA Compliant Secure Connection</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
