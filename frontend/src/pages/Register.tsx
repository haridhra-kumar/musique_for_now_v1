import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../stores/auth";
import { authApi } from "../lib/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await authApi.register({ email, name, password });
      setAuth(res.data.access_token, res.data.user);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Topbar */}
      <header className="h-14 border-b border-border px-6 md:px-8 flex items-center justify-between shrink-0">
        <span className="logo-serif text-lg">
          musique<span>.</span>
        </span>
        <Link
          to="/login"
          className="text-[13px] text-text-dim hover:text-accent transition-colors"
        >
          Sign in
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[380px]"
        >
          {/* Decorative pitch line */}
          <svg
            width="100%"
            height="40"
            viewBox="0 0 380 40"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-6"
            aria-hidden="true"
          >
            <polyline
              fill="none"
              stroke="#2a2520"
              strokeWidth="1.5"
              points="0,20 25,12 50,22 75,10 100,24 125,15 150,20 175,8 200,26 225,16 250,20 275,11 300,25 325,16 350,22 380,14"
            />
            <polyline
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.5"
              points="0,22 25,14 50,24 75,12 100,26 125,17 150,23 175,10 200,28 225,18 250,22 275,13 300,27 325,18 350,24 380,16"
            />
          </svg>

          <div className="mb-7">
            <h1 className="page-title !text-[22px]">Create your account</h1>
            <p className="page-sub">Start analyzing your performances.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 px-3 py-2.5 rounded-md text-[13px]"
              style={{
                background: "rgba(224,96,64,0.06)",
                border: "1px solid rgba(224,96,64,0.25)",
                color: "#e06040",
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="card !p-6 space-y-4">
            <div>
              <label className="input-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6+ characters"
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="input-label">Confirm</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat it"
                  required
                  className="input-field"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-[13px] text-text-dim mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
