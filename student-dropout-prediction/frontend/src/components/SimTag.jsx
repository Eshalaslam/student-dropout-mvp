// Small inline tag for fields that are simulated/mocked rather than real UCI data.
// See DATA_DICTIONARY.md for which fields need this.
export default function SimTag() {
  return (
    <span className="ml-1.5 align-middle text-xs uppercase tracking-wider text-slate-400 border border-slate-300 rounded px-1">
      sim
    </span>
  );
}
