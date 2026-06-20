/**
 * Parent Dashboard — warm dark card layout, full controls.
 * Tabs: Profile | Safety | Story World | History | Journal | Evals
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  getProfile, putProfile,
  getSettings, putSettings,
  getStoryWorld, putStoryWorld,
  getStoryHistory,
  postReviseStory, postApproveStory, postAnnotateStory,
  getJournal, getRecentEvals,
} from '../api'
import type {
  ChildProfile, ParentSafetySettings, StoryWorld,
  Story, GrowthJournal,
  AnnotationLabels,
} from '../api'

const CHILD_ID = 'child_001'

// ------------------------------------------------------------------ //
// Shared primitives
// ------------------------------------------------------------------ //

type Tab = 'profile' | 'safety' | 'world' | 'history' | 'journal' | 'evals'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-night-900/60 border border-night-700/50 rounded-3xl p-6 mb-6">
      <h3 className="text-moon-300 text-lg font-semibold mb-4 border-b border-night-700/50 pb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-moon-400 text-sm mb-1.5 font-light">{children}</label>
}

function Input({
  value, onChange, placeholder, type = 'text', disabled
}: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="
        w-full px-4 py-2.5 rounded-xl
        bg-night-800/60 border border-night-600/50
        text-moon-200 placeholder-night-500 text-sm
        focus:outline-none focus:border-glow-amber/40
        disabled:opacity-40 transition-all duration-300
      "
    />
  )
}

function TextArea({
  value, onChange, placeholder, rows = 3
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="
        w-full px-4 py-2.5 rounded-xl resize-none
        bg-night-800/60 border border-night-600/50
        text-moon-200 placeholder-night-500 text-sm
        focus:outline-none focus:border-glow-amber/40
        transition-all duration-300
      "
    />
  )
}

function SaveButton({ onClick, saving, label = 'Save' }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="
        mt-4 px-6 py-2.5 rounded-xl
        bg-night-700/60 border border-night-500/60
        text-moon-200 text-sm font-light
        hover:border-glow-amber/50 hover:text-glow-amber
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-400
      "
    >
      {saving ? 'Saving…' : label}
    </button>
  )
}

function TagList({
  tags, onRemove, onAdd, placeholder
}: {
  tags: string[]; onRemove: (i: number) => void; onAdd: (v: string) => void; placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const v = draft.trim()
    if (v && !tags.includes(v)) { onAdd(v); setDraft('') }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-night-700/60 border border-night-600/50 text-moon-300 text-xs"
          >
            {t}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-night-500 hover:text-glow-peach transition-colors"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } }}
          placeholder={placeholder ?? 'Add…'}
          className="flex-1 px-3 py-1.5 rounded-xl bg-night-800/50 border border-night-600/40 text-moon-200 placeholder-night-500 text-xs focus:outline-none focus:border-glow-amber/30 transition-all duration-300"
        />
        <button
          type="button"
          onClick={commit}
          className="px-3 py-1.5 rounded-xl bg-night-700/50 border border-night-600/40 text-moon-400 text-xs hover:border-glow-amber/40 transition-all duration-300"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-300 ${checked ? 'bg-glow-amber/60' : 'bg-night-700'}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-moon-200 shadow transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`}
        />
      </div>
      <span className="text-moon-300 text-sm font-light">{label}</span>
    </label>
  )
}

// ------------------------------------------------------------------ //
// Profile tab
// ------------------------------------------------------------------ //
function ProfileTab() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    getProfile(CHILD_ID).then(setProfile).catch(() => {})
  }, [])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await putProfile(profile)
      setMsg('Saved!')
    } catch {
      setMsg('Save failed — please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2500)
    }
  }

  if (!profile) return <p className="text-moon-500 text-sm">Loading…</p>

  const update = (field: keyof ChildProfile, value: unknown) =>
    setProfile(p => p ? { ...p, [field]: value } as ChildProfile : p)

  const listField = (field: keyof ChildProfile) => profile[field] as string[]

  return (
    <div>
      <SectionCard title="Child details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Name</Label><Input value={profile.name} onChange={v => update('name', v)} /></div>
          <div><Label>Age</Label><Input type="number" value={String(profile.age)} onChange={v => update('age', parseInt(v) || 4)} /></div>
          <div><Label>Language</Label><Input value={profile.preferred_language ?? 'English'} onChange={v => update('preferred_language', v)} /></div>
          <div><Label>Story length (min)</Label><Input type="number" value={String(profile.preferred_story_length_minutes)} onChange={v => update('preferred_story_length_minutes', parseInt(v) || 5)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Character preferences">
        <div className="space-y-4">
          <div>
            <Label>Favorite animals</Label>
            <TagList
              tags={listField('favorite_animals')}
              onRemove={i => update('favorite_animals', listField('favorite_animals').filter((_, j) => j !== i))}
              onAdd={v => update('favorite_animals', [...listField('favorite_animals'), v])}
              placeholder="fox, rabbit…"
            />
          </div>
          <div>
            <Label>Favorite settings</Label>
            <TagList
              tags={listField('favorite_settings')}
              onRemove={i => update('favorite_settings', listField('favorite_settings').filter((_, j) => j !== i))}
              onAdd={v => update('favorite_settings', [...listField('favorite_settings'), v])}
              placeholder="moon garden…"
            />
          </div>
          <div>
            <Label>Comfort objects</Label>
            <TagList
              tags={listField('comfort_objects')}
              onRemove={i => update('comfort_objects', listField('comfort_objects').filter((_, j) => j !== i))}
              onAdd={v => update('comfort_objects', [...listField('comfort_objects'), v])}
              placeholder="moon lamp…"
            />
          </div>
          <div>
            <Label>Sensitive topics (to handle gently)</Label>
            <TagList
              tags={listField('sensitive_topics')}
              onRemove={i => update('sensitive_topics', listField('sensitive_topics').filter((_, j) => j !== i))}
              onAdd={v => update('sensitive_topics', [...listField('sensitive_topics'), v])}
              placeholder="being alone…"
            />
          </div>
        </div>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} />
      {msg && <p className={`mt-2 text-sm ${msg.startsWith('Save failed') ? 'text-glow-peach' : 'text-green-400'}`}>{msg}</p>}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Safety settings tab
// ------------------------------------------------------------------ //
function SafetyTab() {
  const [settings, setSettings] = useState<ParentSafetySettings | null>(null)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    getSettings(CHILD_ID).then(setSettings).catch(() => {})
  }, [])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await putSettings(settings)
      setMsg('Saved!')
    } catch {
      setMsg('Save failed.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2500)
    }
  }

  if (!settings) return <p className="text-moon-500 text-sm">Loading…</p>

  const update = (field: keyof ParentSafetySettings, value: unknown) =>
    setSettings(s => s ? { ...s, [field]: value } as ParentSafetySettings : s)

  return (
    <div>
      <SectionCard title="Story controls">
        <div className="space-y-4">
          <Toggle
            checked={settings.allow_child_initiated_sessions}
            onChange={v => update('allow_child_initiated_sessions', v)}
            label="Allow child to start stories alone"
          />
          <Toggle
            checked={settings.requires_parent_review_for_new_themes}
            onChange={v => update('requires_parent_review_for_new_themes', v)}
            label="Require parent review for new themes"
          />
          <Toggle
            checked={settings.emergency_contact_enabled}
            onChange={v => update('emergency_contact_enabled', v)}
            label="Enable emergency help button"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max story length (min)</Label>
              <Input
                type="number"
                value={String(settings.max_story_length_minutes)}
                onChange={v => update('max_story_length_minutes', parseInt(v) || 8)}
              />
            </div>
            <div>
              <Label>Bedtime cutoff (e.g. 20:30)</Label>
              <Input
                value={settings.bedtime_cutoff ?? ''}
                onChange={v => update('bedtime_cutoff', v || null)}
                placeholder="20:30"
              />
            </div>
          </div>
          <div>
            <Label>Visual mode</Label>
            <div className="flex gap-3 mt-1">
              {(['low_stimulation', 'off'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update('visual_mode', m)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-all duration-300 ${settings.visual_mode === m ? 'border-glow-amber/60 text-glow-amber bg-night-700/60' : 'border-night-600/50 text-night-400 hover:border-night-500'}`}
                >
                  {m === 'low_stimulation' ? '🌙 Picture book' : '🔊 Audio only'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Content filters">
        <div className="space-y-4">
          <div>
            <Label>Blocked topics</Label>
            <TagList
              tags={settings.blocked_topics}
              onRemove={i => update('blocked_topics', settings.blocked_topics.filter((_, j) => j !== i))}
              onAdd={v => update('blocked_topics', [...settings.blocked_topics, v])}
              placeholder="monsters, death…"
            />
          </div>
          <div>
            <Label>Blocked words</Label>
            <TagList
              tags={settings.blocked_words}
              onRemove={i => update('blocked_words', settings.blocked_words.filter((_, j) => j !== i))}
              onAdd={v => update('blocked_words', [...settings.blocked_words, v])}
              placeholder="Add a word…"
            />
          </div>
        </div>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} />
      {msg && <p className={`mt-2 text-sm ${msg.startsWith('Save') && !msg.includes('failed') ? 'text-green-400' : 'text-glow-peach'}`}>{msg}</p>}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Story World tab
// ------------------------------------------------------------------ //
function StoryWorldTab() {
  const [world, setWorld]     = useState<StoryWorld | null>(null)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    getStoryWorld(CHILD_ID).then(setWorld).catch(() => {})
  }, [])

  const save = async () => {
    if (!world) return
    setSaving(true)
    try {
      await putStoryWorld(CHILD_ID, world)
      setMsg('Saved!')
    } catch {
      setMsg('Save failed.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2500)
    }
  }

  if (!world) return <p className="text-moon-500 text-sm">Loading…</p>

  const updateWorld = (field: keyof StoryWorld, value: unknown) =>
    setWorld(w => w ? { ...w, [field]: value } as StoryWorld : w)

  return (
    <div>
      <SectionCard title="Story universe">
        <div className="space-y-4">
          <div>
            <Label>Recurring setting</Label>
            <Input value={world.recurring_setting} onChange={v => updateWorld('recurring_setting', v)} placeholder="Moonberry Forest" />
          </div>
          <div>
            <Label>Past themes (story arcs)</Label>
            <TagList
              tags={world.past_themes}
              onRemove={i => updateWorld('past_themes', world.past_themes.filter((_, j) => j !== i))}
              onAdd={v => updateWorld('past_themes', [...world.past_themes, v])}
              placeholder="fear of the dark…"
            />
          </div>
          <div>
            <Label>Successful rituals</Label>
            <TagList
              tags={world.successful_rituals}
              onRemove={i => updateWorld('successful_rituals', world.successful_rituals.filter((_, j) => j !== i))}
              onAdd={v => updateWorld('successful_rituals', [...world.successful_rituals, v])}
              placeholder="three moon breaths…"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recurring characters">
        {world.recurring_characters.length === 0 && (
          <p className="text-night-500 text-sm mb-4">No characters yet.</p>
        )}
        {world.recurring_characters.map((char, ci) => (
          <div key={ci} className="border border-night-700/40 rounded-2xl p-4 mb-3">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {/* Character reference image — displayed when backend provides one (P2-3) */}
                {char.reference_image_url ? (
                  <img
                    src={char.reference_image_url}
                    alt={`${char.name || 'Character'} reference`}
                    className="w-10 h-10 rounded-xl object-cover border border-night-600/60 shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl border border-night-700/50 bg-night-800/50 flex items-center justify-center shrink-0"
                    title="No reference image yet"
                  >
                    <span className="text-night-600 text-lg" aria-hidden="true">?</span>
                  </div>
                )}
                <h4 className="text-moon-200 text-sm font-semibold">{char.name || 'New character'}</h4>
              </div>
              <button
                type="button"
                onClick={() => updateWorld('recurring_characters', world.recurring_characters.filter((_, j) => j !== ci))}
                className="text-night-600 hover:text-glow-peach text-xs transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={char.name}
                  onChange={v => updateWorld('recurring_characters', world.recurring_characters.map((c, j) => j === ci ? { ...c, name: v } : c))}
                />
              </div>
              <div>
                <Label>Species</Label>
                <Input
                  value={char.species}
                  onChange={v => updateWorld('recurring_characters', world.recurring_characters.map((c, j) => j === ci ? { ...c, species: v } : c))}
                />
              </div>
            </div>
            <div>
              <Label>Traits</Label>
              <TagList
                tags={char.traits}
                onRemove={ti => updateWorld('recurring_characters', world.recurring_characters.map((c, j) => j === ci ? { ...c, traits: c.traits.filter((_, k) => k !== ti) } : c))}
                onAdd={v => updateWorld('recurring_characters', world.recurring_characters.map((c, j) => j === ci ? { ...c, traits: [...c.traits, v] } : c))}
                placeholder="gentle, curious…"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateWorld('recurring_characters', [...world.recurring_characters, { name: '', species: '', traits: [] }])}
          className="text-sm text-moon-500 hover:text-glow-amber border border-night-600/40 hover:border-glow-amber/30 px-4 py-2 rounded-xl transition-all duration-300"
        >
          + Add character
        </button>
      </SectionCard>

      <SaveButton onClick={save} saving={saving} />
      {msg && <p className={`mt-2 text-sm ${msg.startsWith('Save') && !msg.includes('failed') ? 'text-green-400' : 'text-glow-peach'}`}>{msg}</p>}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Story History tab
// ------------------------------------------------------------------ //

interface ReviewTrailCardProps {
  story: Story
  onApprove: () => void
  onRevise: (instruction: string) => void
  approving: boolean
  revising: boolean
}

function ReviewTrailCard({ story, onApprove, onRevise, approving, revising }: ReviewTrailCardProps) {
  const [showRevise, setShowRevise]       = useState(false)
  const [reviseText, setReviseText]       = useState('')
  const [annotating, setAnnotating]       = useState(false)
  const [annotations, setAnnotations]     = useState<AnnotationLabels>({})
  const [annoSaving, setAnnoSaving]       = useState(false)
  const [annoMsg, setAnnoMsg]             = useState('')
  const trail = story.review_trail
  const eval_ = story.safety_evaluation

  const saveAnnotation = async () => {
    setAnnoSaving(true)
    try {
      await postAnnotateStory(story.story_id, { story_id: story.story_id, labels: annotations })
      setAnnoMsg('Labels saved!')
    } catch {
      setAnnoMsg('Failed to save.')
    } finally {
      setAnnoSaving(false)
      setTimeout(() => setAnnoMsg(''), 2500)
    }
  }

  return (
    <div className="border border-night-700/40 rounded-3xl p-5 mb-4 bg-night-900/40">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-moon-200 font-semibold">{story.title}</h4>
          <p className="text-night-400 text-xs mt-0.5">{new Date(story.created_at).toLocaleString()}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${trail.final_status === 'parent_approved' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-night-600 text-night-400'}`}>
          {trail.final_status === 'parent_approved' ? 'Approved' : 'Draft'}
        </span>
      </div>

      {/* Story body preview */}
      <p className="text-moon-400 text-sm leading-relaxed line-clamp-3 mb-4 italic">
        {story.body.slice(0, 300)}{story.body.length > 300 ? '…' : ''}
      </p>

      {/* Review trail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
        {trail.child_said && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Child said</span>
            <span className="text-moon-400 italic">"{trail.child_said}"</span>
          </div>
        )}
        {trail.emotion_target && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Emotion target</span>
            <span className="text-moon-400">{trail.emotion_target}</span>
          </div>
        )}
        {trail.memory_used.length > 0 && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Memory used</span>
            <span className="text-moon-400">{trail.memory_used.join(', ')}</span>
          </div>
        )}
        {trail.safety_constraints_applied.length > 0 && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Safety constraints</span>
            <span className="text-moon-400">{trail.safety_constraints_applied.join(', ')}</span>
          </div>
        )}
        {trail.avoided_topics.length > 0 && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Avoided topics</span>
            <span className="text-moon-400">{trail.avoided_topics.join(', ')}</span>
          </div>
        )}
        {trail.parent_edits.length > 0 && (
          <div className="bg-night-800/40 rounded-xl p-3">
            <span className="text-night-500 block mb-1">Parent edits</span>
            <span className="text-moon-400">{trail.parent_edits.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Safety eval scores */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'Age appropriate', val: eval_.age_appropriate },
          { label: 'Sleep friendly',  val: eval_.sleep_friendly },
          { label: 'Parent followed', val: eval_.parent_constraints_followed },
          { label: 'Too scary',       val: !eval_.too_scary, invert: true },
        ].map(({ label, val }) => (
          <span
            key={label}
            className={`text-xs px-2.5 py-1 rounded-full border ${val ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-glow-peach/40 text-glow-peach bg-glow-peach/10'}`}
          >
            {val ? '✓' : '!'} {label}
          </span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded-full border border-night-600 text-night-400">
          warmth {(eval_.emotional_warmth * 100).toFixed(0)}%
        </span>
      </div>

      {/* Actions: revise + approve */}
      <div className="flex gap-3 flex-wrap mb-4">
        {trail.final_status !== 'parent_approved' && (
          <button
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/40 text-green-400 text-sm hover:bg-green-500/20 disabled:opacity-40 transition-all duration-300"
          >
            {approving ? 'Approving…' : '✓ Approve'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowRevise(v => !v)}
          className="px-4 py-2 rounded-xl bg-night-700/50 border border-night-600/40 text-moon-400 text-sm hover:border-glow-amber/40 transition-all duration-300"
        >
          ✏ Revise
        </button>
        <button
          type="button"
          onClick={() => setAnnotating(a => !a)}
          className="px-4 py-2 rounded-xl bg-night-700/50 border border-night-600/40 text-moon-400 text-sm hover:border-glow-amber/40 transition-all duration-300"
        >
          🏷 Label
        </button>
      </div>

      {/* Revision box — controlled by dedicated showRevise boolean (P1-5) */}
      {showRevise && (
        <div className="mb-4">
          <TextArea
            value={reviseText}
            onChange={setReviseText}
            placeholder="e.g. make softer, remove the forest, change animal to rabbit"
            rows={2}
          />
          <button
            type="button"
            onClick={() => { onRevise(reviseText); setReviseText(''); setShowRevise(false) }}
            disabled={!reviseText.trim() || revising}
            className="mt-2 px-4 py-2 rounded-xl bg-night-700/50 border border-night-500/50 text-moon-300 text-sm disabled:opacity-40 hover:border-glow-amber/40 transition-all duration-300"
          >
            {revising ? 'Revising…' : 'Submit revision →'}
          </button>
        </div>
      )}

      {/* Annotation (Terac) */}
      {annotating && (
        <div className="border-t border-night-700/40 pt-4 mt-2">
          <p className="text-night-400 text-xs mb-3 uppercase tracking-widest">Story labels (Terac)</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              ['age_appropriate',  'Age appropriate'],
              ['too_scary',        'Too scary'],
              ['emotionally_warm', 'Emotionally warm'],
              ['moral_clarity',    'Moral clarity'],
              ['parent_approval',  'Parent approval'],
              ['rewrite_needed',   'Rewrite needed'],
            ] as [keyof AnnotationLabels, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annotations[key] === true}
                  onChange={e => setAnnotations(a => ({ ...a, [key]: e.target.checked ? true : null }))}
                  className="rounded accent-glow-amber"
                />
                <span className="text-moon-400 text-xs">{label}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveAnnotation}
            disabled={annoSaving}
            className="px-4 py-2 rounded-xl bg-night-700/50 border border-night-600/40 text-moon-400 text-sm disabled:opacity-40 hover:border-glow-amber/40 transition-all duration-300"
          >
            {annoSaving ? 'Saving…' : 'Save labels'}
          </button>
          {annoMsg && <span className="ml-3 text-xs text-green-400">{annoMsg}</span>}
        </div>
      )}
    </div>
  )
}

function HistoryTab() {
  const [stories, setStories]           = useState<Story[]>([])
  const [loading, setLoading]           = useState(true)
  const [approvingId, setApprovingId]   = useState<string | null>(null)
  const [revisingId, setRevisingId]     = useState<string | null>(null)

  useEffect(() => {
    getStoryHistory(CHILD_ID)
      .then(setStories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const approve = useCallback(async (story_id: string) => {
    setApprovingId(story_id)
    try {
      const updated = await postApproveStory(story_id)
      setStories(ss => ss.map(s => s.story_id === story_id ? updated : s))
    } catch {}
    finally { setApprovingId(null) }
  }, [])

  const revise = useCallback(async (story: Story, instruction: string) => {
    setRevisingId(story.story_id)
    try {
      const result = await postReviseStory({ story_id: story.story_id, child_id: story.child_id, instruction })
      // Replace in list only if the backend returned a non-null story
      if (result.story) {
        setStories(ss => ss.map(s => s.story_id === story.story_id ? result.story! : s))
      }
    } catch {}
    finally { setRevisingId(null) }
  }, [])

  if (loading) return <p className="text-moon-500 text-sm">Loading stories…</p>
  if (stories.length === 0) return <p className="text-moon-500 text-sm">No stories yet. Have Leo tell Lullow how he feels tonight!</p>

  return (
    <div>
      {stories.map(story => (
        <ReviewTrailCard
          key={story.story_id}
          story={story}
          onApprove={() => approve(story.story_id)}
          onRevise={instr => revise(story, instr)}
          approving={approvingId === story.story_id}
          revising={revisingId === story.story_id}
        />
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Growth Journal tab
// ------------------------------------------------------------------ //
function JournalTab() {
  const [journal, setJournal] = useState<GrowthJournal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJournal(CHILD_ID)
      .then(setJournal)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-moon-500 text-sm">Loading journal…</p>
  if (!journal) return <p className="text-moon-500 text-sm">No journal data yet.</p>

  return (
    <div>
      {journal.reflection && (
        <SectionCard title="Parent reflection">
          <p className="text-moon-300 font-light leading-relaxed italic">"{journal.reflection}"</p>
        </SectionCard>
      )}

      <SectionCard title={`Emotions this ${journal.period.replace('_', ' ')}`}>
        {Object.keys(journal.emotion_counts).length === 0 ? (
          <p className="text-night-500 text-sm">No emotion data yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(journal.emotion_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, count]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <span className="text-moon-400 text-sm w-28 capitalize">{emotion.replace('_', ' ')}</span>
                  <div className="flex-1 h-2 rounded-full bg-night-700/60">
                    <div
                      className="h-2 rounded-full bg-glow-amber/60 transition-all duration-600"
                      style={{ width: `${Math.min((count / Math.max(...Object.values(journal.emotion_counts))) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-night-400 text-xs w-6 text-right">{count}×</span>
                </div>
              ))}
          </div>
        )}
      </SectionCard>

      {journal.helpful_elements.length > 0 && (
        <SectionCard title="What helped most">
          <div className="flex flex-wrap gap-2">
            {journal.helpful_elements.map((el, i) => (
              <span key={i} className="px-3 py-1.5 rounded-2xl bg-night-700/50 border border-night-600/40 text-moon-300 text-sm">
                {el}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {journal.entries.length > 0 && (
        <SectionCard title="Story entries">
          <div className="space-y-2">
            {journal.entries.map(entry => (
              <div key={entry.story_id} className="flex items-center gap-3 text-sm py-2 border-b border-night-700/30 last:border-0">
                <span className="text-night-500 text-xs w-24">{new Date(entry.date).toLocaleDateString()}</span>
                <span className="text-moon-300 flex-1">{entry.title}</span>
                <span className="text-night-400 text-xs capitalize">{entry.emotion.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Evals tab (Arize) — styled dashboard, mirrors ReviewTrailCard badges
// ------------------------------------------------------------------ //

/** Subset of SafetyEvaluation fields expected in each eval record */
interface EvalRecord {
  story_id?: string
  title?: string
  created_at?: string
  passed?: boolean
  too_scary?: boolean
  age_appropriate?: boolean
  sleep_friendly?: boolean
  parent_constraints_followed?: boolean
  emotional_warmth?: number
  notes?: string
  blocked_topic_hits?: string[]
}

function EvalRow({ ev }: { ev: EvalRecord }) {
  const badges = [
    { label: 'Passed',         val: ev.passed          ?? false },
    { label: 'Age appropriate', val: ev.age_appropriate ?? true  },
    { label: 'Sleep friendly',  val: ev.sleep_friendly  ?? true  },
    { label: 'Parent followed', val: ev.parent_constraints_followed ?? true },
    // "too_scary" is a failure flag — badge is green when NOT scary
    { label: 'Too scary',       val: !(ev.too_scary ?? false) },
  ]

  return (
    <div className="border border-night-700/40 rounded-2xl p-4 bg-night-900/40">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="min-w-0">
          <p className="text-moon-200 text-sm font-semibold truncate">
            {ev.title ?? ev.story_id ?? 'Story'}
          </p>
          {ev.created_at && (
            <p className="text-night-500 text-xs mt-0.5">
              {new Date(ev.created_at).toLocaleString()}
            </p>
          )}
        </div>
        {/* Passed / Failed chip — mirrors the large badge in ReviewTrailCard */}
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${
            ev.passed
              ? 'border-green-500/40 text-green-400 bg-green-500/10'
              : 'border-glow-peach/40 text-glow-peach bg-glow-peach/10'
          }`}
        >
          {ev.passed ? '✓ Passed' : '! Failed'}
        </span>
      </div>

      {/* Safety badge row — same style as ReviewTrailCard ~599-616 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {badges.map(({ label, val }) => (
          <span
            key={label}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              val
                ? 'border-green-500/40 text-green-400 bg-green-500/10'
                : 'border-glow-peach/40 text-glow-peach bg-glow-peach/10'
            }`}
          >
            {val ? '✓' : '!'} {label}
          </span>
        ))}
        {ev.emotional_warmth !== undefined && (
          <span className="text-xs px-2.5 py-1 rounded-full border border-night-600 text-night-400">
            warmth {(ev.emotional_warmth * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Blocked topics */}
      {ev.blocked_topic_hits && ev.blocked_topic_hits.length > 0 && (
        <p className="text-glow-peach text-xs mb-2">
          Blocked hits: {ev.blocked_topic_hits.join(', ')}
        </p>
      )}

      {/* Notes */}
      {ev.notes && (
        <p className="text-night-400 text-xs leading-relaxed italic">{ev.notes}</p>
      )}
    </div>
  )
}

function EvalsTab() {
  const [evals, setEvals] = useState<EvalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecentEvals()
      .then(data => setEvals(data as EvalRecord[]))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-moon-500 text-sm">Loading evaluations…</p>

  const passed  = evals.filter(e => e.passed)
  const failed  = evals.filter(e => !e.passed)

  return (
    <div>
      {/* Summary header */}
      {evals.length > 0 && (
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-night-900/50 border border-night-700/40 rounded-2xl p-4 text-center">
            <p className="text-2xl font-light text-green-400">{passed.length}</p>
            <p className="text-night-400 text-xs mt-1 uppercase tracking-widest">Passed</p>
          </div>
          <div className="flex-1 bg-night-900/50 border border-night-700/40 rounded-2xl p-4 text-center">
            <p className="text-2xl font-light text-glow-peach">{failed.length}</p>
            <p className="text-night-400 text-xs mt-1 uppercase tracking-widest">Failed</p>
          </div>
          <div className="flex-1 bg-night-900/50 border border-night-700/40 rounded-2xl p-4 text-center">
            <p className="text-2xl font-light text-moon-200">{evals.length}</p>
            <p className="text-night-400 text-xs mt-1 uppercase tracking-widest">Total</p>
          </div>
        </div>
      )}

      <SectionCard title="Recent safety evaluations (Arize)">
        {evals.length === 0 ? (
          <p className="text-night-500 text-sm">No evaluations yet.</p>
        ) : (
          <div className="space-y-3">
            {evals.map((ev, i) => (
              <EvalRow key={ev.story_id ?? i} ev={ev} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main ParentDashboard
// ------------------------------------------------------------------ //
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'safety',  label: 'Safety' },
  { id: 'world',   label: 'Story World' },
  { id: 'history', label: 'History' },
  { id: 'journal', label: 'Journal' },
  { id: 'evals',   label: 'Evals' },
]

export default function ParentDashboard() {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #1a1530 0%, #0e0e20 50%, #07091e 100%)',
      }}
    >
      {/* Header */}
      <header className="border-b border-night-700/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">🌙</span>
          <div>
            <h1 className="text-moon-200 text-xl font-light tracking-wide">Lullow</h1>
            <p className="text-night-500 text-xs">Parent dashboard</p>
          </div>
        </div>
        <Link
          to="/"
          className="text-sm text-night-500 hover:text-moon-400 border border-night-700/50 hover:border-night-600 px-4 py-2 rounded-xl transition-all duration-300"
        >
          ← Bedtime mode
        </Link>
      </header>

      <div className="flex max-w-4xl mx-auto">
        {/* Sidebar tabs (desktop) */}
        <aside className="hidden sm:flex flex-col w-44 shrink-0 pt-6 px-4 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`
                text-left px-4 py-2.5 rounded-xl text-sm font-light
                transition-all duration-300
                ${tab === t.id
                  ? 'bg-night-700/60 border border-night-600/60 text-glow-amber'
                  : 'text-night-400 hover:text-moon-400 hover:bg-night-800/40'
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </aside>

        {/* Mobile tab row */}
        <div className="sm:hidden flex overflow-x-auto gap-2 px-4 pt-4 pb-2 border-b border-night-700/40">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-light transition-all duration-300 ${tab === t.id ? 'bg-night-700/60 border border-night-600/60 text-glow-amber' : 'text-night-400 hover:text-moon-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-2xl">
          {tab === 'profile' && <ProfileTab />}
          {tab === 'safety'  && <SafetyTab />}
          {tab === 'world'   && <StoryWorldTab />}
          {tab === 'history' && <HistoryTab />}
          {tab === 'journal' && <JournalTab />}
          {tab === 'evals'   && <EvalsTab />}
        </main>
      </div>
    </div>
  )
}
