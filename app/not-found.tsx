export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <p className="kicker">404</p>
      <h1 className="font-display mt-3 text-4xl font-bold text-[#103f35]">This page took a wrong turn in Venice</h1>
      <p className="mt-4 text-[#202824]/75">
        The page you are looking for does not exist or has moved. Let us get you back on the right canal.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a className="btn-gold" href="/">Back to home</a>
        <a className="btn-ghost" href="/eligibility/">Check my eligibility</a>
        <a className="btn-ghost" href="/universities/">Explore universities</a>
      </div>
    </div>
  );
}
