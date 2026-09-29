import { DICTATION_HELP } from '../lib/dictation';

// The panel naming the supported browsers, shown while the mic is hovered or has
// keyboard focus. It has no positioned wrapper of its own, so it anchors to the
// input row around it.
export function DictationHelp({ open }: { open: boolean }) {
  return (
    <div
      hidden={!open}
      className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 w-72 max-w-full rounded-xl border border-neutral-200 bg-white p-3 text-xs leading-5 text-neutral-700 shadow-lg"
    >
      <p className="font-semibold text-neutral-900">{DICTATION_HELP.title}</p>
      <ul className="mt-1 list-disc pl-4">
        {DICTATION_HELP.browsers.map(line => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-1.5 text-neutral-600">{DICTATION_HELP.usage}</p>
    </div>
  );
}
