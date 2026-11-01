import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Palette, ShieldCheck, Upload } from 'lucide-react'
import { getAesthetic } from '../themes/aesthetics'
import { useJournal } from '../state/journalStore'
import { confirmAction, useUi } from '../state/uiStore'
import { BackupValidationError, parseBackup, restoreBackup, type RestoreMode } from '../db/backup'
import { downloadBackup, exportCurrentEntryMarkdown, exportJournalMarkdown } from '../lib/commands'
import type { ThemePreference } from '../db/types'
import { Modal } from './Modal'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-6 py-5 first:border-t-0">
      <h3 className="mb-4 font-sans text-[11px] uppercase tracking-[0.22em] text-ink-muted">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Row({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={htmlFor} className="font-serif text-[17px]">
        {label}
      </label>
      {children}
    </div>
  )
}

function useStoragePersistence() {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])
  const request = async () => setPersisted((await navigator.storage?.persist?.()) ?? false)
  return { persisted, request }
}

export function SettingsDialog() {
  const close = useUi((s) => s.close)
  const showToast = useUi((s) => s.showToast)
  const prefs = useJournal((s) => s.prefs)
  const setPrefs = useJournal((s) => s.setPrefs)
  const reload = useJournal((s) => s.reload)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const { persisted, request } = useStoragePersistence()

  const onFile = async (file: File | undefined) => {
    setRestoreError(null)
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const summary = `${backup.entries.length} entries and ${backup.annotations.length} margin notes`
      const ok = await confirmAction(
        mode === 'replace'
          ? {
              title: 'Replace your journal?',
              message: `Everything currently in Reverie will be replaced by this backup (${summary}). A backup of your current journal will be downloaded first.`,
              confirmLabel: 'Replace journal',
              danger: true,
            }
          : {
              title: 'Merge this backup?',
              message: `${summary} will be added. Where an entry exists in both, the most recently edited version is kept.`,
              confirmLabel: 'Merge backup',
            },
      )
      if (!ok) return
      if (mode === 'replace') await downloadBackup()
      const result = await restoreBackup(backup, mode)
      await reload()
      showToast(`Restored ${result.entries} entries and ${result.annotations} notes`)
      close()
    } catch (err) {
      setRestoreError(err instanceof BackupValidationError ? err.message : `Restore failed: ${String(err)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Modal title="Settings" onClose={close} width="34rem">
      <Section title="Appearance">
        <Row label={`Style · ${getAesthetic(prefs.aesthetic).name}`}>
          <button type="button" className="btn" onClick={() => useUi.getState().open('style')}>
            <Palette size={14} aria-hidden /> Choose a style…
          </button>
        </Row>
        <Row label="Light or dark" htmlFor="pref-theme">
          <select
            id="pref-theme"
            value={prefs.theme}
            onChange={(e) => setPrefs({ theme: e.target.value as ThemePreference })}
            className="select-quiet"
          >
            <option value="system">Match my computer</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Row>
        <Row label={`Text size · ${prefs.fontSize}px`} htmlFor="pref-size">
          <input
            id="pref-size"
            type="range"
            min={15}
            max={28}
            step={1}
            value={prefs.fontSize}
            onChange={(e) => setPrefs({ fontSize: Number(e.target.value) })}
            className="range"
          />
        </Row>
        <Row label={`Line spacing · ${prefs.lineHeight.toFixed(2)}`} htmlFor="pref-leading">
          <input
            id="pref-leading"
            type="range"
            min={1.4}
            max={2.2}
            step={0.05}
            value={prefs.lineHeight}
            onChange={(e) => setPrefs({ lineHeight: Number(e.target.value) })}
            className="range"
          />
        </Row>
        <Row label="Typewriter mode — keep the line you write centered" htmlFor="pref-typewriter">
          <input
            id="pref-typewriter"
            type="checkbox"
            className="toggle"
            checked={prefs.typewriterMode}
            onChange={(e) => setPrefs({ typewriterMode: e.target.checked })}
          />
        </Row>
        <Row label="Show margins on wide screens" htmlFor="pref-margins">
          <input
            id="pref-margins"
            type="checkbox"
            className="toggle"
            checked={prefs.showMargins}
            onChange={(e) => setPrefs({ showMargins: e.target.checked })}
          />
        </Row>
      </Section>

      <Section title="Export">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => void exportCurrentEntryMarkdown()}>
            <FileText size={14} aria-hidden /> This entry (.md)
          </button>
          <button type="button" className="btn" onClick={() => void exportJournalMarkdown()}>
            <FileText size={14} aria-hidden /> Whole journal (.md)
          </button>
        </div>
        <p className="font-serif text-[15px] italic text-ink-muted">Margin notes become footnotes beside their paragraphs.</p>
      </Section>

      <Section title="Backup & restore">
        <p className="font-serif text-[16px] leading-relaxed text-ink-muted">
          Your journal is stored only in this browser, on this computer. <strong className="text-ink">Clearing browsing data
          for this site will erase it.</strong> Keep a backup somewhere safe.
          {prefs.lastBackupAt ? ` Last backup: ${new Date(prefs.lastBackupAt).toLocaleString()}.` : ' No backup yet.'}
        </p>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => void downloadBackup()}>
            <Download size={14} aria-hidden /> Download backup (.json)
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Restore mode" className="segmented font-sans text-[12px]">
            <button type="button" role="radio" aria-checked={mode === 'merge'} onClick={() => setMode('merge')}>
              Merge
            </button>
            <button type="button" role="radio" aria-checked={mode === 'replace'} onClick={() => setMode('replace')}>
              Replace
            </button>
          </div>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={14} aria-hidden /> Restore from backup…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Backup file"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        {restoreError && (
          <p role="alert" className="font-sans text-[13px] text-danger">
            {restoreError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 font-sans text-[13px] text-ink-muted">
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} aria-hidden />
            {persisted === null
              ? 'Checking storage protection…'
              : persisted
                ? 'The browser will not clear this journal to free up space.'
                : 'The browser may clear this journal if the disk runs low.'}
          </span>
          {persisted === false && (
            <button type="button" className="quiet-link" onClick={() => void request()}>
              Ask to keep it
            </button>
          )}
        </div>
      </Section>

      <Section title="Privacy">
        <p className="font-serif text-[16px] leading-relaxed text-ink-muted">
          Reverie has no account, no server, no analytics and no AI. Nothing you write leaves this device unless you export it.
          Entries are <em>not encrypted</em>: anyone with access to this browser profile could read them.
        </p>
      </Section>
    </Modal>
  )
}
