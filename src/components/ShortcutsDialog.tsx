import { useUi } from '../state/uiStore'
import { SHORTCUTS } from '../lib/shortcuts'
import { Modal } from './Modal'

export function ShortcutsDialog() {
  const close = useUi((s) => s.close)
  return (
    <Modal title="Keyboard" onClose={close} width="40rem">
      <div className="grid gap-x-8 gap-y-6 px-6 pb-7 sm:grid-cols-2">
        {SHORTCUTS.map((group) => (
          <section key={group.group}>
            <h3 className="mb-2 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">{group.group}</h3>
            <dl className="flex flex-col gap-1.5">
              {group.items.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-3">
                  <dt className="font-serif text-[16px]">{s.label}</dt>
                  <dd>
                    <kbd>{s.keys}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
