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

const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

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
      if (user) setUser({ ...user, credits: res.data.new_balance });
      queryClient.invalidateQueries({ queryKey: ["credit-packs"] });
    },
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-2xl">
      <motion.div variants={fadeIn} className="mb-7">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your account, credits and preferences.</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={fadeIn} className="card mb-4">
        <p className="card-title">Profile</p>
        <div className="flex items-start gap-4">
          <div className="avatar-pill !w-12 !h-12 !text-[16px] shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 space-y-3.5">
            <div>
              <label className="input-label">Name</label>
              <input type="text" value={user?.name || ""} readOnly className="input-field cursor-default opacity-70" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={user?.email || ""} readOnly className="input-field cursor-default opacity-70" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="metric !p-3.5">
            <p className="metric-label">Credits</p>
            <p className="metric-val gold !text-[22px]">{user?.credits ?? 0}</p>
          </div>
          <div className="metric !p-3.5">
            <p className="metric-label">Plan</p>
            <p className="metric-val !text-[22px] capitalize">{user?.plan_type ?? "Free"}</p>
          </div>
        </div>
      </motion.div>

      {/* Credit Packs */}
      <motion.div variants={fadeIn} className="card mb-4">
        <p className="card-title !mb-1">Buy credits</p>
        <p className="text-[11px] text-text-faint mb-5">Each analysis uses 1 credit.</p>

        {packsLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-md h-24 animate-pulse bg-[#141414]" />)}
          </div>
        ) : packs.length === 0 ? (
          <p className="text-[13px] text-text-dim text-center py-6">No packs available</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {packs.map((pack) => (
              <div key={pack.id}
                className="rounded-md p-4 border border-border bg-bg-input transition-colors hover:border-accent group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] text-text-secondary group-hover:text-accent transition-colors">{pack.name}</p>
                    <p className="text-[11px] text-text-faint">{pack.credits} analyses</p>
                  </div>
                  <span className="text-[15px] text-accent font-medium">₹{pack.price_inr}</span>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-[10px] text-text-faint">₹{(pack.price_inr / pack.credits).toFixed(1)} per analysis</p>
                  <button
                    onClick={() => purchaseMutation.mutate(pack.id)}
                    disabled={purchaseMutation.isPending}
                    className="btn-primary !px-3.5 !py-1.5 !text-[12px]"
                  >
                    {purchaseMutation.isPending ? "…" : "Buy"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {purchaseMutation.isSuccess && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-4 text-[12px] text-center text-accent">
            Credits purchased — new balance: {user?.credits ?? 0}
          </motion.p>
        )}
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeIn} className="card">
        <p className="card-title">Preferences</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] text-text-secondary">Default feedback level</p>
              <p className="text-[11px] text-text-faint">Beginner or musician-level detail</p>
            </div>
            <select className="input-field !w-auto" defaultValue="beginner">
              <option value="beginner">Beginner</option>
              <option value="musician">Musician</option>
            </select>
          </div>
          <div className="border-t border-border-soft pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] text-text-secondary">Analysis quality</p>
              <p className="text-[11px] text-text-faint">Higher quality takes longer to process</p>
            </div>
            <select className="input-field !w-auto" defaultValue="standard">
              <option value="fast">Fast</option>
              <option value="standard">Standard</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
