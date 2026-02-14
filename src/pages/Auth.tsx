import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login, register, setSession, type UserRole } from "@/lib/store";
import { MessageCircle, Shield } from "lucide-react";

const ADMIN_SECRET = "ADMIN2024";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isLogin && !name) {
      setError("Please enter your name");
      return;
    }

    if (!isLogin && role === "admin" && adminCode !== ADMIN_SECRET) {
      setError("Invalid admin access code");
      return;
    }

    if (isLogin) {
      const result = login(email, password);
      if (typeof result === "string") {
        setError(result);
        return;
      }
      setSession(result);
      navigate(result.role === "admin" ? "/admin" : "/chat");
    } else {
      const result = register(name, email, password, role);
      if (typeof result === "string") {
        setError(result);
        return;
      }
      setSession(result);
      navigate(result.role === "admin" ? "/admin" : "/chat");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
            <MessageCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to continue chatting" : "Join the conversation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLogin && (
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all ${
                  role === "user"
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg scale-[1.02]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                User
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-medium transition-all ${
                  role === "admin"
                    ? "bg-gradient-to-r from-[hsl(230,25%,12%)] to-[hsl(230,20%,25%)] text-white shadow-lg scale-[1.02]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {!isLogin && role === "admin" && (
              <div className="space-y-2">
                <Label htmlFor="adminCode">Admin Access Code</Label>
                <Input
                  id="adminCode"
                  type="password"
                  placeholder="Enter secret code"
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full rounded-xl h-11 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              {isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>

          {isLogin && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              Demo: alice@demo.com / pass123 (user) • admin@demo.com / admin123 (admin)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
