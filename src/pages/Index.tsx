import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AnimatePresence, motion } from "framer-motion";
import { useTokenMetadata } from "@/hooks/useTokenMetadata";
import { useWalletDatabase } from "@/hooks/useWalletDatabase";

type StableRandom = { s: number; t: number; u: number; v: number };
type Spark = { id: number; x: number; y: number };

function useStableRandom(count: number, seed = 0): StableRandom[] {
  return useMemo(() => {
    const arr: StableRandom[] = [];
    for (let i = 0; i < count; i += 1) {
      const s = Math.sin(seed * 9301 + i * 49297 + 233) * 0.5 + 0.5;
      const t = Math.sin(seed * 1237 + i * 7919 + 17) * 0.5 + 0.5;
      const u = Math.sin(seed * 3571 + i * 6271 + 89) * 0.5 + 0.5;
      const v = Math.sin(seed * 2017 + i * 8191 + 41) * 0.5 + 0.5;
      arr.push({ s, t, u, v });
    }
    return arr;
  }, [count, seed]);
}

function Ember({ r }: { r: StableRandom }) {
  const size = r.s * 3 + 2;
  return (
    <motion.div
      className="absolute pointer-events-none rounded-full"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle, #ffc857, #ff6a00)",
        boxShadow: "0 0 6px #ff6a00, 0 0 12px #ff6a00",
        left: `${r.t * 100}%`,
        bottom: `${r.u * 28 + 2}%`,
      }}
      animate={{
        y: [0, -(r.v * 280 + 150)],
        x: [0, (r.s - 0.5) * 100],
        opacity: [0, 1, 0.8, 0],
        scale: [1, 0.7, 0.3, 0],
      }}
      transition={{
        duration: r.s * 3 + 3,
        repeat: Infinity,
        repeatDelay: r.t * 3,
        ease: "easeOut",
      }}
    />
  );
}

function SparkBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, zIndex: 99 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      onAnimationComplete={onDone}
    >
      {[...Array(10)].map((_, i) => {
        const angle = (i / 10) * 360;
        const dist = 20 + (i % 3) * 18;
        const color = i % 2 === 0 ? "#ffc857" : "#ff6a00";
        return (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full"
            style={{ background: color, boxShadow: `0 0 4px ${color}` }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * dist,
              y: Math.sin((angle * Math.PI) / 180) * dist,
              opacity: [1, 0],
              scale: [1.5, 0],
            }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />
        );
      })}
    </motion.div>
  );
}

function ForgeBackground() {
  const embers = useStableRandom(28, 42);
  const runes = ["\u2692", "\u2b21", "\u25c8", "\u27c1", "\u229b", "\u29d6", "\u2b22", "\u25c9"];
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: "#050505", zIndex: 0 }}>
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{
          height: "55%",
          background:
            "radial-gradient(ellipse 90% 60% at 50% 100%, rgba(255,106,0,0.16) 0%, rgba(255,42,42,0.07) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-0 top-0 h-full w-1/3"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 0% 60%, rgba(255,106,0,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-1/3"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 100% 60%, rgba(255,42,42,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-full"
        style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, #ff6a00, #ffc857, #ff6a00, transparent)",
          opacity: 0.35,
        }}
      />
      {runes.map((r, i) => (
        <motion.div
          key={i}
          className="absolute select-none text-2xl"
          style={{
            left: `${5 + i * 11}%`,
            bottom: `${8 + (i % 3) * 7}%`,
            color: "rgba(255,106,0,0.12)",
            fontFamily: "monospace",
          }}
          animate={{ opacity: [0.07, 0.22, 0.07] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity }}
        >
          {r}
        </motion.div>
      ))}
      {embers.map((r, i) => (
        <Ember key={i} r={r} />
      ))}
    </div>
  );
}

function ForgeInput({
  label,
  placeholder,
  value,
  onChange,
  textarea = false,
  rows,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const commonProps = {
    placeholder,
    value,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    disabled,
    className: "w-full px-3 py-2 text-sm outline-none resize-none",
    style: {
      fontFamily: "Rajdhani, sans-serif",
      background: "rgba(0,0,0,0.65)",
      border: `1px solid ${focused ? "#ff6a00" : "#2b2b2b"}`,
      borderRadius: 2,
      color: "#f0e8d0",
      caretColor: "#ff6a00",
      transition: "all 0.2s",
      boxShadow: focused
        ? "0 0 14px rgba(255,106,0,0.35), inset 0 0 8px rgba(255,106,0,0.04)"
        : "inset 0 0 8px rgba(0,0,0,0.5)",
      opacity: disabled ? 0.6 : 1,
    },
  };

  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs uppercase tracking-widest"
        style={{ color: "#ff6a00", fontFamily: "Orbitron, monospace", fontSize: 10 }}
      >
        {label}
      </label>
      {textarea ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} />}
    </div>
  );
}

function ForgeUpload({
  file,
  preview,
  onFileChange,
  disabled,
}: {
  file: File | null;
  preview: string | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs uppercase tracking-widest"
        style={{ color: "#ff6a00", fontFamily: "Orbitron, monospace", fontSize: 10 }}
      >
        Token Image
      </label>
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 py-5"
        style={{
          background: dragging ? "rgba(255,106,0,0.08)" : "rgba(0,0,0,0.5)",
          border: `1px dashed ${dragging ? "#ffc857" : "#2b2b2b"}`,
          borderRadius: 2,
          transition: "all 0.2s",
          boxShadow: dragging ? "0 0 20px rgba(255,200,87,0.15)" : "none",
          opacity: disabled ? 0.6 : 1,
          minHeight: 110,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) onFileChange(e.dataTransfer.files[0] ?? null);
        }}
      >
        {preview ? (
          <img src={preview} alt="Token preview" className="max-h-20 rounded object-contain" />
        ) : (
          <span style={{ fontSize: "1.8rem" }}>\u2692</span>
        )}
        <span className="text-xs" style={{ fontFamily: "Rajdhani, sans-serif", color: "#555" }}>
          {file ? file.name : "Drop image or click to upload"}
        </span>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          disabled={disabled}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function ForgeButton({
  children,
  onClick,
  wide,
  disabled,
}: {
  children: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSparks((s) => [...s, { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    onClick?.(e);
  };

  return (
    <motion.button
      type="button"
      className={`relative overflow-hidden px-8 py-3 text-sm font-bold uppercase tracking-widest ${wide ? "w-full" : ""}`}
      style={{
        fontFamily: "Orbitron, monospace",
        letterSpacing: "0.18em",
        background: hovered
          ? "linear-gradient(135deg, #ff6a00, #ff2a2a)"
          : "linear-gradient(135deg, rgba(255,106,0,0.12), rgba(255,42,42,0.08))",
        border: `1px solid ${hovered ? "#ffc857" : "#ff6a00"}`,
        borderRadius: 2,
        color: hovered ? "#fff" : "#ffc857",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: hovered
          ? "0 0 28px rgba(255,106,0,0.5), 0 0 60px rgba(255,106,0,0.18), inset 0 0 16px rgba(255,106,0,0.08)"
          : "0 0 14px rgba(255,106,0,0.18), inset 0 0 10px rgba(0,0,0,0.5)",
        transition: "all 0.2s",
        opacity: disabled ? 0.55 : 1,
      }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
      disabled={disabled}
    >
      {sparks.map((s) => (
        <SparkBurst key={s.id} x={s.x} y={s.y} onDone={() => setSparks((sp) => sp.filter((x) => x.id !== s.id))} />
      ))}
      {hovered && !disabled ? (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,200,87,0.1), transparent)" }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      ) : null}
      {children}
    </motion.button>
  );
}

function ForgeEmblem() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: 72, height: 72 }}
      animate={{
        filter: [
          "drop-shadow(0 0 8px #ff6a00)",
          "drop-shadow(0 0 22px #ffc857)",
          "drop-shadow(0 0 8px #ff6a00)",
        ],
      }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: "2px solid #ff6a00", opacity: 0.6 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ inset: 7, border: "1px solid #ffc857", opacity: 0.35 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
      />
      <span style={{ fontSize: "1.8rem", zIndex: 1 }}>\u2692</span>
    </motion.div>
  );
}

export default function ForgeApp() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { saveWalletConnection, disconnectWallet } = useWalletDatabase();
  const {
    currentMetadata,
    fetchCurrentTokenMetadata,
    updateTokenMetadata,
    feeInfo,
    isFeeLoading,
    isUpdating,
    progress,
  } = useTokenMetadata();

  const [tokenName, setTokenName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [forged, setForged] = useState(false);
  const processedConnectionRef = useRef<string | null>(null);

  const panelStyle = {
    background: "linear-gradient(160deg, rgba(18,13,8,0.97), rgba(8,8,8,0.95))",
    border: "1px solid #222",
    borderRadius: 2,
    backdropFilter: "blur(16px)",
  } as const;

  const showToast = (message: string, timeout = 2500) => {
    setToast(message);
    window.setTimeout(() => setToast(null), timeout);
  };

  useEffect(() => {
    void fetchCurrentTokenMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const walletAddress = publicKey?.toBase58();
    if (!walletAddress || !wallet || processedConnectionRef.current === walletAddress) return;
    processedConnectionRef.current = walletAddress;
    saveWalletConnection(walletAddress, wallet.adapter.name.toLowerCase()).catch(() => undefined);
  }, [publicKey, wallet, saveWalletConnection]);

  const handleWallet = async () => {
    if (!connected) {
      setVisible(true);
      return;
    }

    const walletAddress = publicKey?.toBase58();
    if (walletAddress) {
      await disconnectWallet(walletAddress);
    }
    processedConnectionRef.current = null;
    await disconnect();
    showToast("Wallet disconnected");
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleForge = async () => {
    if (!publicKey) {
      showToast("Connect wallet first");
      return;
    }
    if (!feeInfo) {
      showToast("Fee still loading");
      return;
    }
    if (!tokenName.trim() || !ticker.trim() || !imageFile) {
      showToast("Name, symbol and image are required");
      return;
    }

    const result = await updateTokenMetadata({
      tokenName: tokenName.trim(),
      ticker: ticker.trim(),
      description: description.trim() || undefined,
      imageFile,
      userWalletAddress: publicKey.toBase58(),
      currentFee: feeInfo.currentFee,
    });

    if (result.success) {
      setForged(true);
      showToast(result.message || "Token metadata updated", 3500);
      void fetchCurrentTokenMetadata();
      window.setTimeout(() => setForged(false), 3000);
    } else if (result.error) {
      showToast(result.error, 3500);
    }
  };

  const walletLabel = connected && publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "Connect Wallet";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@500;600;700&family=Audiowide&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050505; overflow-x: hidden; }
        ::placeholder { color: #333; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #ff6a00; border-radius: 2px; }
        input, textarea { -webkit-appearance: none; }
      `}</style>

      <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ForgeBackground />

        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            borderBottom: "1px solid rgba(255,106,0,0.1)",
          }}
        >
          <motion.span
            style={{
              fontFamily: "Audiowide, sans-serif",
              fontSize: 10,
              color: "#333",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            Forge v1.0 · Solana
          </motion.span>

          <motion.button
            onClick={() => setSound((v) => !v)}
            style={{
              fontFamily: "Orbitron, monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "rgba(0,0,0,0.6)",
              border: `1px solid ${sound ? "#ff6a00" : "#222"}`,
              borderRadius: 2,
              color: sound ? "#ff6a00" : "#444",
              boxShadow: sound ? "0 0 10px rgba(255,106,0,0.25)" : "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span>{sound ? "On" : "Off"}</span> Forge Sound
          </motion.button>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 20,
              width: "100%",
              maxWidth: 1100,
              flexWrap: "wrap",
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{
                ...panelStyle,
                borderLeft: "2px solid #ff6a00",
                padding: "24px 20px",
                width: 220,
                flexShrink: 0,
                boxShadow: "0 0 30px rgba(255,106,0,0.07), inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontFamily: "Orbitron, monospace", fontSize: 9, color: "#ff6a00", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 18 }}>
                Forge Intel
              </div>
              {[
                { icon: "\u2692", text: "Forge powerful SPL token metadata through Solana." },
                { icon: "\u25c8", text: "Current mint state and fee are loaded from Supabase." },
                { icon: "\u2b21", text: "Payment, upload and metadata updates go through the live backend." },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.12 }}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}
                >
                  <span style={{ color: "#ff6a00", fontSize: "1.1rem", lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontFamily: "Rajdhani, sans-serif", color: "#6a5a4a", fontSize: 13, lineHeight: 1.5 }}>{item.text}</span>
                </motion.div>
              ))}
              <div style={{ marginTop: 14, fontFamily: "Rajdhani, sans-serif", color: "#7d6a54", fontSize: 12 }}>
                <div>Mint: {currentMetadata?.mintAddress ? `${currentMetadata.mintAddress.slice(0, 6)}...${currentMetadata.mintAddress.slice(-4)}` : "Loading..."}</div>
                <div>Metadata: {currentMetadata?.isMutable === false ? "Immutable" : currentMetadata ? "Mutable" : "Loading..."}</div>
                <div>Wallet: {connected ? walletLabel : "Disconnected"}</div>
              </div>
              <motion.div style={{ height: 1, background: "linear-gradient(90deg, #ff6a00, transparent)", marginTop: 8 }} animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, flex: "1 1 380px", maxWidth: 480 }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ForgeEmblem />
                <motion.h1
                  style={{ fontFamily: "Orbitron, monospace", fontWeight: 900, fontSize: "clamp(1.8rem,5vw,2.6rem)", letterSpacing: "0.42em", color: "#ffc857" }}
                  animate={{ textShadow: ["0 0 18px rgba(255,200,87,0.4)", "0 0 38px rgba(255,106,0,0.7)", "0 0 18px rgba(255,200,87,0.4)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Forge
                </motion.h1>
                <p style={{ fontFamily: "Rajdhani, sans-serif", color: "#444", fontSize: 12, letterSpacing: "0.18em" }}>
                  Craft · Deploy · Dominate
                </p>
              </div>

              <div
                style={{
                  ...panelStyle,
                  width: "100%",
                  borderTop: "2px solid #ff6a00",
                  padding: "22px 22px 18px",
                  boxShadow: "0 0 50px rgba(255,106,0,0.1), 0 24px 48px rgba(0,0,0,0.75), inset 0 0 24px rgba(0,0,0,0.55)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <span style={{ fontFamily: "Orbitron, monospace", fontSize: 10, color: "#ff6a00", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    Token Console
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#ff2a2a", "#ffc857", "#22ff88"].map((c, i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <ForgeInput label="Name" placeholder="e.g. DragonForge" value={tokenName} onChange={setTokenName} disabled={isUpdating} />
                    <ForgeInput label="Symbol" placeholder="e.g. FORG" value={ticker} onChange={(value) => setTicker(value.toUpperCase())} disabled={isUpdating} />
                  </div>
                  <ForgeInput label="Description" placeholder="Describe your token..." value={description} onChange={setDescription} textarea={true} rows={3} disabled={isUpdating} />
                  <ForgeUpload file={imageFile} preview={imagePreview} onFileChange={handleImageChange} disabled={isUpdating} />
                </div>

                <div style={{ marginTop: 10, minHeight: 36, fontFamily: "Rajdhani, sans-serif", color: "#877361", fontSize: 13 }}>
                  {isUpdating
                    ? progress
                    : currentMetadata?.isMutable === false
                      ? "Current mint is immutable. Metadata update will fail until you switch to a mutable mint."
                      : currentMetadata?.name
                        ? `Current token: ${currentMetadata.name} (${currentMetadata.symbol})`
                        : "Loading current token metadata..."}
                </div>

                <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                  <AnimatePresence mode="wait">
                    {forged ? (
                      <motion.div
                        key="done"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          fontFamily: "Orbitron, monospace",
                          color: "#ffc857",
                          textShadow: "0 0 20px #ffc857",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          padding: "12px 24px",
                          fontSize: 14,
                        }}
                      >
                        Token Forged
                      </motion.div>
                    ) : (
                      <motion.div key="btn" style={{ width: "100%" }}>
                        <ForgeButton onClick={() => void handleForge()} wide disabled={isUpdating || isFeeLoading}>
                          {isUpdating ? progress || "Forging..." : "Forge Token"}
                        </ForgeButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              style={{
                ...panelStyle,
                borderRight: "2px solid #ff6a00",
                padding: "24px 20px",
                width: 200,
                flexShrink: 0,
                boxShadow: "0 0 30px rgba(255,106,0,0.07), inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ fontFamily: "Orbitron, monospace", fontSize: 9, color: "#ff6a00", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>
                Forge Cost
              </div>
              <motion.div style={{ textAlign: "center", padding: "12px 0" }} animate={{ textShadow: ["0 0 18px #ff6a00", "0 0 36px #ffc857", "0 0 18px #ff6a00"] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <div style={{ fontFamily: "Orbitron, monospace", fontSize: 36, fontWeight: 700, color: "#ffc857" }}>
                  {isFeeLoading ? "..." : feeInfo?.currentFee.toFixed(2) ?? "0.10"}
                </div>
                <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 12, color: "#ff6a00", letterSpacing: "0.18em", marginTop: 2 }}>SOL</div>
              </motion.div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {[
                  ["Base Forge", `${feeInfo?.currentFee?.toFixed(2) ?? "0.10"} SOL`],
                  ["Next After Update", `${feeInfo?.nextFeeAfterHijack?.toFixed(2) ?? "0.20"} SOL`],
                  ["Authority", currentMetadata?.updateAuthority ? `${currentMetadata.updateAuthority.slice(0, 4)}...${currentMetadata.updateAuthority.slice(-4)}` : "Loading"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "Rajdhani, sans-serif", color: "#4a4040", borderBottom: "1px solid #1a1a1a", paddingBottom: 6, gap: 8 }}>
                    <span>{k}</span>
                    <span style={{ color: "#ff6a00", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>

              <motion.div style={{ height: 1, background: "linear-gradient(90deg, transparent, #ff6a00)", marginTop: 14 }} animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
            </motion.div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "14px 24px",
            borderTop: "1px solid rgba(255,106,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            {["TG", "X", "WEB"].map((label) => (
              <motion.a
                key={label}
                href="#"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Orbitron, monospace",
                  fontSize: 12,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid #222",
                  color: "#444",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                whileHover={{ borderColor: "#ff6a00", color: "#ff6a00", boxShadow: "0 0 12px rgba(255,106,0,0.4)", scale: 1.12 }}
              >
                {label}
              </motion.a>
            ))}
          </div>

          <ForgeButton onClick={() => void handleWallet()}>
            {connected ? `Wallet ${walletLabel}` : "Connect Wallet"}
          </ForgeButton>

          <motion.span style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 11, color: "#2a2a2a", letterSpacing: "0.12em" }}>
            Powered by Solana
          </motion.span>
        </div>

        <AnimatePresence>
          {toast ? (
            <motion.div
              initial={{ opacity: 0, y: 40, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 30, x: "-50%" }}
              style={{
                position: "fixed",
                bottom: 80,
                left: "50%",
                zIndex: 999,
                padding: "10px 24px",
                fontFamily: "Orbitron, monospace",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#ffc857",
                background: "rgba(8,8,8,0.97)",
                border: "1px solid #ff6a00",
                borderRadius: 2,
                boxShadow: "0 0 28px rgba(255,106,0,0.28)",
                whiteSpace: "nowrap",
              }}
            >
              {toast}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
