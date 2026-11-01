import { useUi } from '../state/uiStore'
import { Modal } from './Modal'
import { StylePicker } from './StylePicker'

export function StyleDialog() {
  const close = useUi((s) => s.close)
  return (
    <Modal title="Choose your style" onClose={close} width="46rem" initialFocus="input[name='reverie-style']:checked">
      <div className="px-6 pb-6">
        <p className="mb-5 font-serif text-[16px] text-ink-muted">
          Pick the look that feels like yours. Your writing stays exactly as it is; you can change this any time.
        </p>
        <StylePicker />
      </div>
    </Modal>
  )
}
