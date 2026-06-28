const LoadingState = () => (
  <div className="grid min-h-64 place-items-center rounded-3xl border border-white/5 bg-white/[0.025]">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-white" />
    <span className="sr-only">Loading</span>
  </div>
);

export default LoadingState;
