import { RippleGameLoader } from "@/components/RippleGameLoader";
import { THEME } from "@/lib/theme";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: THEME.ink }}>
          Ripple
        </h1>
        <p className="mt-1 max-w-sm text-sm" style={{ color: THEME.inkMuted }}>
          A short, calm session to train your attention.
        </p>
      </div>
      <RippleGameLoader />
    </div>
  );
}
