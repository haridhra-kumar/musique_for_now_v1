import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuthStore } from "../stores/auth";
import { authApi, creditsApi } from "../lib/api";
import { useEffect } from "react";

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_inr: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Refresh user profile
  useEffect(() => {
    authApi.me().then((res) => setUser(res.data)).catch(() => {});
  }, [setUser]);

  const { data: packs = [], isLoading: packsLoading } = useQuery<CreditPack[]>({
    queryKey: ["credit-packs"],
    queryFn: async () => (await creditsApi.packs()).data,
  });

  const purchaseMutation = useMutation({
    mutationFn: (packId: string) => creditsApi.purchase(packId),
    onSuccess: (res) => {
      if (user) {
        setUser({ ...user, credits: res.data.new_balance });
      }
      queryClient.invalidateQueries({ queryKey: ["credit-packs"] });
    },
  });

  const getPackGradient = (index: number): string => {
    const gradients = [
      "linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))",
      "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))",
      "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))",
      "linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(34, 211, 238, 0.05))",
    ];
    return gradients[index % gradients.length];
  };

  const getPackAccent = (index: number): string => {
    const accents = ["#6366f1", "#a855f7", "#ec4899", "#22d3ee"];
    return accents[index % accents.length];
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl md:text-3xl font-bold gradient-text">Your Profile</h1>
        <p className="text-text-secondary mt-1">Manage your account and credits</p>
      </motion.div>

      {/* Profile card */}
      <motion.div variants={item} className="glass rounded-2xl p-6 md:p-8">
        <div className="flex items-start gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: "0 8px 25px rgba(99, 102, 241, 0.3)",
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user?.name || "User"}</h2>
            <p className="text-text-secondary text-sm mt-0.5">{user?.email || ""}</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v12M15 9.5c-.8-.8-3.5-1.3-4.5 0s1 3 2 3.5 3 1 2 2.5-3.7.8-4.5 0" />
                  </svg>
                  <span className="text-xs text-text-muted">Credits Balance</span>
                </div>
                <p className="text-3xl font-bold text-accent-blue">{user?.credits ?? 0}</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.15)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-xs text-text-muted">Account Status</span>
                </div>
                <p className="text-lg font-semibold text-accent-purple">Active</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Credit packs */}
      <motion.div variants={item} className="glass rounded-2xl p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold gradient-text-blue">Buy Credits</h2>
          <p className="text-text-muted text-sm mt-1">Each analysis uses 1 credit. Choose a pack below.</p>
        </div>

        {packsLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl h-40 animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : packs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-muted">No credit packs available at the moment</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {packs.map((pack, i) => {
              const accent = getPackAccent(i);
              return (
                <motion.div
                  key={pack.id}
                  className="rounded-2xl p-5 transition-all cursor-pointer group"
                  style={{
                    background: getPackGradient(i),
                    border: `1px solid ${accent}30`,
                  }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: `0 0 25px ${accent}20`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: accent }}>{pack.name}</h3>
                      <p className="text-text-muted text-xs mt-0.5">{pack.credits} analyses</p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${accent}15` }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12M15 9.5c-.8-.8-3.5-1.3-4.5 0s1 3 2 3.5 3 1 2 2.5-3.7.8-4.5 0" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: accent }}>
                        &#8377;{pack.price_inr}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        &#8377;{(pack.price_inr / pack.credits).toFixed(1)}/analysis
                      </p>
                    </div>
                    <motion.button
                      onClick={() => purchaseMutation.mutate(pack.id)}
                      disabled={purchaseMutation.isPending}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all text-white disabled:opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        boxShadow: `0 4px 15px ${accent}30`,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {purchaseMutation.isPending ? "..." : "Buy"}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {purchaseMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl text-sm text-center"
            style={{
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              color: "#4ade80",
            }}
          >
            Credits purchased successfully! Your new balance: {user?.credits ?? 0}
          </motion.div>
        )}

        {purchaseMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-xl text-sm text-center"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
            }}
          >
            Purchase failed. Please try again.
          </motion.div>
        )}
      </motion.div>

      {/* Account section */}
      <motion.div variants={item} className="glass rounded-2xl p-6 md:p-8">
        <h2 className="text-lg font-semibold gradient-text-blue mb-4">Account Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
            <input
              type="text"
              value={user?.name || ""}
              readOnly
              className="input-field bg-white/[0.02] cursor-default"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="input-field bg-white/[0.02] cursor-default"
            />
          </div>
          <p className="text-xs text-text-muted">
            Contact support to update your profile information.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
