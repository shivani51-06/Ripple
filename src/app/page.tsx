export default function Home() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "#f4f1ec" }}
    >
      <h1 className="text-4xl font-semibold tracking-tight" style={{ color: "#2f3e46" }}>
        Ripple
      </h1>
      <p className="max-w-sm text-base" style={{ color: "#52616b" }}>
        A short, calm session to train your attention. Not another feed to scroll.
      </p>
      <p className="text-sm" style={{ color: "#9aa5ab" }}>
        Game loop coming soon.
      </p>
    </div>
  );
}
