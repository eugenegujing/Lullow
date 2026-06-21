/**
 * Parent Dashboard (route "/parent") — light "soft modern" theme.
 * Tabs: Profile | Safety | Story World | History | Journal | Evals.
 * All data is keyed by the ACTIVE child_id from ProfileContext, and profile
 * edits sync back into the local roster so the picker stays in sync.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  putProfile,
  getSettings, putSettings,
  getStoryWorld, putStoryWorld,
  getStoryHistory,
  postReviseStory, postApproveStory, postAnnotateStory,
  postGenerateVisuals,
  getJournal, getRecentEvals,
} from '../api'
import type {
  ChildProfile, ParentSafetySettings, StoryWorld,
  Story, GrowthJournal,
  AnnotationLabels,
} from '../api'
import { useProfiles } from '../context/ProfileContext'
import WarmBackground from '../components/WarmBackground'
import Brand from '../components/Brand'
import ProfileSwitcher from '../components/ProfileSwitcher'
import {
  Button, Card, ChipInput, SectionHeader, Slider, TextField, Toggle, Avatar,
} from '../components/ui'

// ------------------------------------------------------------------ //
// Small helpers
// ------------------------------------------------------------------ //

type Tab = 'profile' | 'safety' | 'world' | 'history' | 'journal' | 'evals'

/** Inline save-state message. */
function SaveMsg({ msg }: { msg: string }) {
  if (!msg) return null
  const ok = msg.toLowerCase().includes('saved') && !msg.toLowerCase().includes('failed')
  return (
    <p className={`mt-3 text-sm font-medium ${ok ? 'text-sage-500' : 'text-peach-500'}`}>{msg}</p>
  )
}

/** A small green/peach pill used for safety badges. */
function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${
        ok
          ? 'border-sage-200 text-sage-500 bg-sage-50'
          : 'border-peach-200 text-peach-500 bg-peach-50'
      }`}
    >
      <span aria-hidden="true">{ok ? '✓' : '!'}</span> {children}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Profile tab
// ------------------------------------------------------------------ //
function ProfileTab({ childId }: { childId: string }) {
  const { activeProfile, updateProfile } = useProfiles()
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Seed from the local roster (instant) so the dashboard works even offline.
  useEffect(() => {
    if (activeProfile) setProfile(activeProfile.profile)
  }, [activeProfile, childId])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await putProfile(profile)
      updateProfile(childId, { profile })
      setMsg('Saved!')
    } catch {
      // Still persist locally even if the backend is unreachable.
      updateProfile(childId, { profile })
      setMsg('Saved on this device (backend offline).')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2800)
    }
  }

  if (!profile) return <p className="text-ink-100 text-sm">Loading…</p>

  const update = <K extends keyof ChildProfile>(field: K, value: ChildProfile[K]) =>
    setProfile(p => (p ? { ...p, [field]: value } : p))

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader title="Child details" eyebrow="Profile" className="mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField label="Name" value={profile.name} onChange={e => update('name', e.target.value)} />
          <TextField
            label="Age"
            type="number"
            min={2}
            max={12}
            value={String(profile.age)}
            onChange={e => update('age', Math.min(12, Math.max(2, Number(e.target.value) || 5)))}
          />
          <TextField
            label="Language"
            value={profile.preferred_language ?? 'English'}
            onChange={e => update('preferred_language', e.target.value)}
          />
          <div className="flex items-end pb-1">
            <Slider
              label="Story length"
              value={profile.preferred_story_length_minutes}
              onChange={v => update('preferred_story_length_minutes', v)}
              min={2}
              max={15}
              unit="min"
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Character preferences" eyebrow="What they love" className="mb-5" />
        <div className="space-y-5">
          <ChipInput
            label="Favorite animals"
            values={profile.favorite_animals}
            onChange={v => update('favorite_animals', v)}
            placeholder="fox, rabbit…"
          />
          <ChipInput
            label="Favorite settings"
            values={profile.favorite_settings}
            onChange={v => update('favorite_settings', v)}
            placeholder="moon garden…"
            tone="sage"
          />
          <ChipInput
            label="Comfort objects"
            values={profile.comfort_objects}
            onChange={v => update('comfort_objects', v)}
            placeholder="moon lamp…"
            tone="peach"
          />
          <ChipInput
            label="Sensitive topics (handled gently)"
            values={profile.sensitive_topics}
            onChange={v => update('sensitive_topics', v)}
            placeholder="being alone…"
            tone="peach"
          />
        </div>
      </Card>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        <SaveMsg msg={msg} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Safety tab
// ------------------------------------------------------------------ //
function SafetyTab({ childId }: { childId: string }) {
  const [settings, setSettings] = useState<ParentSafetySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    getSettings(childId)
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [childId])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await putSettings(settings)
      setMsg('Saved!')
    } catch {
      setMsg('Save failed — please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2800)
    }
  }

  if (loading) return <p className="text-ink-100 text-sm">Loading…</p>
  if (!settings) return <p className="text-ink-100 text-sm">No settings available.</p>

  const update = <K extends keyof ParentSafetySettings>(field: K, value: ParentSafetySettings[K]) =>
    setSettings(s => (s ? { ...s, [field]: value } : s))

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader title="Story controls" eyebrow="Safety" className="mb-5" />
        <div className="space-y-4">
          <Toggle
            checked={settings.allow_child_initiated_sessions}
            onChange={v => update('allow_child_initiated_sessions', v)}
            label="Allow child to start stories alone"
            description="If off, a grown-up needs to begin the session."
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
          <div className="grid grid-cols-2 gap-4 pt-1">
            <Slider
              label="Max story length"
              value={settings.max_story_length_minutes}
              onChange={v => update('max_story_length_minutes', v)}
              min={2}
              max={20}
              unit="min"
            />
            <TextField
              label="Bedtime cutoff"
              value={settings.bedtime_cutoff ?? ''}
              onChange={e => update('bedtime_cutoff', e.target.value || null)}
              placeholder="20:30"
              hint="Optional. 24h time."
            />
          </div>
          <div>
            <span className="block text-ink-200 text-sm font-semibold mb-2">Default visual mode</span>
            <div className="grid grid-cols-2 gap-3">
              {(['low_stimulation', 'off'] as const).map(m => {
                const active = settings.visual_mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update('visual_mode', m)}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'border-lavender-400 bg-lavender-100 text-lavender-700'
                        : 'border-cream-300 bg-cream-50 text-ink-200 hover:border-lavender-200'
                    }`}
                  >
                    {m === 'low_stimulation' ? '🌙 Picture book' : '🔊 Audio only'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Content filters" eyebrow="Safety" className="mb-5" />
        <div className="space-y-5">
          <ChipInput
            label="Blocked topics"
            values={settings.blocked_topics}
            onChange={v => update('blocked_topics', v)}
            placeholder="monsters, death…"
            tone="peach"
          />
          <ChipInput
            label="Blocked words"
            values={settings.blocked_words}
            onChange={v => update('blocked_words', v)}
            placeholder="Add a word…"
            tone="peach"
          />
        </div>
      </Card>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
        <SaveMsg msg={msg} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Story World tab
// ------------------------------------------------------------------ //
function StoryWorldTab({ childId }: { childId: string }) {
  const { updateProfile } = useProfiles()
  const [world, setWorld] = useState<StoryWorld | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    getStoryWorld(childId)
      .then(setWorld)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [childId])

  const save = async () => {
    if (!world) return
    setSaving(true)
    try {
      await putStoryWorld(childId, world)
      // Keep the local roster's world in sync so it survives backend restarts.
      updateProfile(childId, { world })
      setMsg('Saved!')
    } catch {
      setMsg('Save failed — please try again.')
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 2800)
    }
  }

  if (loading) return <p className="text-ink-100 text-sm">Loading…</p>
  if (!world) return <p className="text-ink-100 text-sm">No story world available.</p>

  const updateWorld = <K extends keyof StoryWorld>(field: K, value: StoryWorld[K]) =>
    setWorld(w => (w ? { ...w, [field]: value } : w))

  const setChar = (ci: number, patch: Partial<StoryWorld['recurring_characters'][number]>) =>
    updateWorld(
      'recurring_characters',
      world.recurring_characters.map((c, j) => (j === ci ? { ...c, ...patch } : c)),
    )

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          title="Story universe"
          eyebrow="Memory"
          description="The recurring world Lullow returns to every night."
          className="mb-5"
        />
        <div className="space-y-5">
          <TextField
            label="Recurring setting"
            value={world.recurring_setting}
            onChange={e => updateWorld('recurring_setting', e.target.value)}
            placeholder="Moonberry Forest"
          />
          <ChipInput
            label="Past themes (story arcs)"
            values={world.past_themes}
            onChange={v => updateWorld('past_themes', v)}
            placeholder="fear of the dark…"
            tone="sage"
          />
          <ChipInput
            label="Successful rituals"
            values={world.successful_rituals}
            onChange={v => updateWorld('successful_rituals', v)}
            placeholder="three moon breaths…"
            tone="sage"
          />
        </div>
      </Card>

      <Card>
        <SectionHeader title="Recurring characters" eyebrow="Story friends" className="mb-5" />
        {world.recurring_characters.length === 0 && (
          <p className="text-ink-50 text-sm mb-4">No story friends yet.</p>
        )}
        <div className="space-y-4">
          {world.recurring_characters.map((char, ci) => (
            <div key={ci} className="border border-cream-300 rounded-2xl p-4 bg-cream-100/60">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  {char.reference_image_url ? (
                    <img
                      src={char.reference_image_url}
                      alt={`${char.name || 'Character'} reference`}
                      className="w-11 h-11 rounded-2xl object-cover border border-cream-300 shrink-0"
                    />
                  ) : (
                    <Avatar emoji="✨" size={44} seed={char.name || `char-${ci}`} />
                  )}
                  <h4 className="text-ink-400 font-display font-bold">
                    {char.name || 'New friend'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateWorld(
                      'recurring_characters',
                      world.recurring_characters.filter((_, j) => j !== ci),
                    )
                  }
                  className="text-ink-50 hover:text-peach-500 text-sm transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <TextField label="Name" value={char.name} onChange={e => setChar(ci, { name: e.target.value })} />
                <TextField
                  label="Species"
                  value={char.species}
                  onChange={e => setChar(ci, { species: e.target.value })}
                />
              </div>
              <ChipInput
                label="Traits"
                values={char.traits}
                onChange={v => setChar(ci, { traits: v })}
                placeholder="gentle, curious…"
              />
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() =>
            updateWorld('recurring_characters', [
              ...world.recurring_characters,
              { name: '', species: '', traits: [], reference_image_url: null },
            ])
          }
        >
          + Add story friend
        </Button>
      </Card>

      <div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save story world'}
        </Button>
        <SaveMsg msg={msg} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// History tab — review trail + safety + revise/approve/annotate
// ------------------------------------------------------------------ //
interface ReviewTrailCardProps {
  story: Story
  onApprove: () => void
  onRevise: (instruction: string) => void
  approving: boolean
  revising: boolean
}

/**
 * The picture-book for a story. If scenes already exist (demo / RAG-hit / already
 * generated) we show the image grid instantly; otherwise the parent can generate
 * one on demand. `animate: false` keeps it fast — images only, no Pika clips.
 */
function StorybookStrip({ story }: { story: Story }) {
  const [s, setS] = useState(story)
  const [gen, setGen] = useState(false)
  const scenes = s.scenes ?? []

  const generate = async () => {
    setGen(true)
    try {
      setS(await postGenerateVisuals({ story_id: s.story_id, child_id: s.child_id, animate: false }))
    } catch {
      /* keep as-is */
    } finally {
      setGen(false)
    }
  }

  if (scenes.length === 0) {
    return (
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={generate} disabled={gen}>
          {gen ? 'Painting…' : '📖 Generate storybook'}
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {scenes.map(sc => (
        <figure key={sc.index}>
          {sc.image_url && (
            <img
              src={sc.image_url}
              alt={sc.text}
              className="w-full aspect-[4/3] object-cover rounded-xl border border-cream-300"
            />
          )}
          <figcaption className="text-ink-100 text-xs mt-1 leading-snug">{sc.text}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function ReviewTrailCard({ story, onApprove, onRevise, approving, revising }: ReviewTrailCardProps) {
  const [showRevise, setShowRevise] = useState(false)
  const [reviseText, setReviseText] = useState('')
  const [showBook, setShowBook] = useState(false)
  const [annotating, setAnnotating] = useState(false)
  const [annotations, setAnnotations] = useState<AnnotationLabels>({})
  const [annoSaving, setAnnoSaving] = useState(false)
  const [annoMsg, setAnnoMsg] = useState('')
  const trail = story.review_trail
  const ev = story.safety_evaluation
  const approved = trail.final_status === 'parent_approved'

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

  const trailItems: [string, string | undefined][] = [
    ['Child said', trail.child_said ? `"${trail.child_said}"` : undefined],
    ['Emotion target', trail.emotion_target || undefined],
    ['Memory used', trail.memory_used.length ? trail.memory_used.join(', ') : undefined],
    [
      'Safety constraints',
      trail.safety_constraints_applied.length ? trail.safety_constraints_applied.join(', ') : undefined,
    ],
    ['Avoided topics', trail.avoided_topics.length ? trail.avoided_topics.join(', ') : undefined],
    ['Parent edits', trail.parent_edits.length ? trail.parent_edits.join(', ') : undefined],
  ]

  return (
    <Card className="mb-4">
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0">
          <h4 className="text-ink-400 font-display font-bold truncate">{story.title}</h4>
          <p className="text-ink-50 text-xs mt-0.5">{new Date(story.created_at).toLocaleString()}</p>
        </div>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${
            approved ? 'border-sage-200 text-sage-500 bg-sage-50' : 'border-cream-300 text-ink-100 bg-cream-100'
          }`}
        >
          {approved ? '✓ Approved' : 'Draft'}
        </span>
      </div>

      <p className="text-ink-100 text-sm leading-relaxed mb-4 italic">
        {story.body.slice(0, 280)}
        {story.body.length > 280 ? '…' : ''}
      </p>

      {/* Review trail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {trailItems
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="bg-cream-100 rounded-xl p-3">
              <span className="text-ink-50 text-xs block mb-1 font-semibold uppercase tracking-wide">
                {k}
              </span>
              <span className="text-ink-300 text-sm">{v}</span>
            </div>
          ))}
      </div>

      {/* Safety eval */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge ok={ev.age_appropriate}>Age appropriate</Badge>
        <Badge ok={ev.sleep_friendly}>Sleep friendly</Badge>
        <Badge ok={ev.parent_constraints_followed}>Parent followed</Badge>
        <Badge ok={!ev.too_scary}>Not too scary</Badge>
        <span className="text-xs px-2.5 py-1 rounded-full border border-cream-300 text-ink-100 bg-cream-100 font-medium">
          warmth {(ev.emotional_warmth * 100).toFixed(0)}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {!approved && (
          <Button variant="soft" size="sm" onClick={onApprove} disabled={approving}>
            {approving ? 'Approving…' : '✓ Approve'}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setShowRevise(v => !v)}>
          ✏ Revise
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setShowBook(b => !b)}>
          📖 Storybook
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setAnnotating(a => !a)}>
          🏷 Label
        </Button>
      </div>

      {/* Picture-book images for this story (generate on demand if missing) */}
      {showBook && <StorybookStrip story={story} />}

      {/* Revision box */}
      {showRevise && (
        <div className="mt-4">
          <TextField
            as="textarea"
            value={reviseText}
            onChange={e => setReviseText(e.target.value)}
            placeholder="e.g. make softer, remove the forest, change animal to rabbit"
            rows={2}
          />
          <Button
            variant="soft"
            size="sm"
            className="mt-2"
            onClick={() => {
              onRevise(reviseText)
              setReviseText('')
              setShowRevise(false)
            }}
            disabled={!reviseText.trim() || revising}
          >
            {revising ? 'Revising…' : 'Submit revision →'}
          </Button>
        </div>
      )}

      {/* Annotation (Terac) */}
      {annotating && (
        <div className="border-t border-cream-300 pt-4 mt-4">
          <p className="text-ink-50 text-xs mb-3 font-semibold uppercase tracking-widest">
            Story labels (Terac)
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(
              [
                ['age_appropriate', 'Age appropriate'],
                ['too_scary', 'Too scary'],
                ['emotionally_warm', 'Emotionally warm'],
                ['moral_clarity', 'Moral clarity'],
                ['parent_approval', 'Parent approval'],
                ['rewrite_needed', 'Rewrite needed'],
              ] as [keyof AnnotationLabels, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annotations[key] === true}
                  onChange={e => setAnnotations(a => ({ ...a, [key]: e.target.checked ? true : null }))}
                  className="w-4 h-4 rounded accent-lavender-500"
                />
                <span className="text-ink-300 text-sm">{label}</span>
              </label>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={saveAnnotation} disabled={annoSaving}>
            {annoSaving ? 'Saving…' : 'Save labels'}
          </Button>
          {annoMsg && <span className="ml-3 text-xs text-sage-500 font-medium">{annoMsg}</span>}
        </div>
      )}
    </Card>
  )
}

function HistoryTab({ childId }: { childId: string }) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [revisingId, setRevisingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getStoryHistory(childId)
      .then(setStories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [childId])

  const approve = useCallback(async (story_id: string) => {
    setApprovingId(story_id)
    try {
      const updated = await postApproveStory(story_id)
      setStories(ss => ss.map(s => (s.story_id === story_id ? updated : s)))
    } catch {
      /* leave as-is */
    } finally {
      setApprovingId(null)
    }
  }, [])

  const revise = useCallback(async (story: Story, instruction: string) => {
    setRevisingId(story.story_id)
    try {
      const result = await postReviseStory({
        story_id: story.story_id,
        child_id: story.child_id,
        instruction,
      })
      if (result.story) {
        setStories(ss => ss.map(s => (s.story_id === story.story_id ? result.story! : s)))
      }
    } catch {
      /* leave as-is */
    } finally {
      setRevisingId(null)
    }
  }, [])

  if (loading) return <p className="text-ink-100 text-sm">Loading stories…</p>
  if (stories.length === 0)
    return (
      <Card>
        <p className="text-ink-100 text-sm">
          No stories yet. Have your child tell Lullow how they feel tonight!
        </p>
      </Card>
    )

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
// Journal tab
// ------------------------------------------------------------------ //
function JournalTab({ childId }: { childId: string }) {
  const [journal, setJournal] = useState<GrowthJournal | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getJournal(childId)
      .then(setJournal)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [childId])

  if (loading) return <p className="text-ink-100 text-sm">Loading journal…</p>
  if (!journal) return <p className="text-ink-100 text-sm">No journal data yet.</p>

  const maxCount = Math.max(1, ...Object.values(journal.emotion_counts))

  return (
    <div className="space-y-5">
      {journal.reflection && (
        <Card className="bg-gradient-to-br from-lavender-50 to-peach-50 border-lavender-200">
          <SectionHeader title="Parent reflection" eyebrow="This week" className="mb-3" />
          <p className="text-ink-300 leading-relaxed italic">"{journal.reflection}"</p>
        </Card>
      )}

      <Card>
        <SectionHeader title={`Emotions ${journal.period.replace('_', ' ')}`} className="mb-5" />
        {Object.keys(journal.emotion_counts).length === 0 ? (
          <p className="text-ink-50 text-sm">No emotion data yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(journal.emotion_counts)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, count]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <span className="text-ink-200 text-sm w-28 capitalize font-medium">
                    {emotion.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-cream-200">
                    <div
                      className="h-2.5 rounded-full gradient-lavender transition-all duration-600"
                      style={{ width: `${Math.min((count / maxCount) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-ink-50 text-xs w-8 text-right">{count}×</span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {journal.helpful_elements.length > 0 && (
        <Card>
          <SectionHeader title="What helped most" className="mb-4" />
          <div className="flex flex-wrap gap-2">
            {journal.helpful_elements.map((el, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full bg-sage-100 border border-sage-200 text-sage-500 text-sm font-medium"
              >
                {el}
              </span>
            ))}
          </div>
        </Card>
      )}

      {journal.entries.length > 0 && (
        <Card>
          <SectionHeader title="Story entries" className="mb-4" />
          <div className="divide-y divide-cream-300">
            {journal.entries.map(entry => (
              <div key={entry.story_id} className="flex items-center gap-3 text-sm py-2.5">
                <span className="text-ink-50 text-xs w-24">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <span className="text-ink-300 flex-1 font-medium">{entry.title}</span>
                <span className="text-ink-100 text-xs capitalize">
                  {entry.emotion.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Evals tab (Arize)
// ------------------------------------------------------------------ //
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
    { label: 'Passed', val: ev.passed ?? false },
    { label: 'Age appropriate', val: ev.age_appropriate ?? true },
    { label: 'Sleep friendly', val: ev.sleep_friendly ?? true },
    { label: 'Parent followed', val: ev.parent_constraints_followed ?? true },
    { label: 'Not too scary', val: !(ev.too_scary ?? false) },
  ]

  return (
    <div className="border border-cream-300 rounded-2xl p-4 bg-cream-100/60">
      <div className="flex items-start justify-between mb-3 gap-4">
        <div className="min-w-0">
          <p className="text-ink-400 text-sm font-display font-bold truncate">
            {ev.title ?? ev.story_id ?? 'Story'}
          </p>
          {ev.created_at && (
            <p className="text-ink-50 text-xs mt-0.5">{new Date(ev.created_at).toLocaleString()}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${
            ev.passed ? 'border-sage-200 text-sage-500 bg-sage-50' : 'border-peach-200 text-peach-500 bg-peach-50'
          }`}
        >
          {ev.passed ? '✓ Passed' : '! Failed'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {badges.map(({ label, val }) => (
          <Badge key={label} ok={val}>
            {label}
          </Badge>
        ))}
        {ev.emotional_warmth !== undefined && (
          <span className="text-xs px-2.5 py-1 rounded-full border border-cream-300 text-ink-100 bg-cream-100 font-medium">
            warmth {(ev.emotional_warmth * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {ev.blocked_topic_hits && ev.blocked_topic_hits.length > 0 && (
        <p className="text-peach-500 text-xs mb-1">Blocked hits: {ev.blocked_topic_hits.join(', ')}</p>
      )}
      {ev.notes && <p className="text-ink-100 text-xs leading-relaxed italic">{ev.notes}</p>}
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

  if (loading) return <p className="text-ink-100 text-sm">Loading evaluations…</p>

  const passed = evals.filter(e => e.passed)
  const failed = evals.filter(e => !e.passed)

  return (
    <div className="space-y-5">
      {evals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: passed.length, label: 'Passed', color: 'text-sage-500' },
            { n: failed.length, label: 'Failed', color: 'text-peach-500' },
            { n: evals.length, label: 'Total', color: 'text-ink-400' },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <p className={`text-3xl font-display font-bold ${s.color}`}>{s.n}</p>
              <p className="text-ink-50 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <SectionHeader title="Recent safety evaluations" eyebrow="Arize" className="mb-5" />
        {evals.length === 0 ? (
          <p className="text-ink-50 text-sm">No evaluations yet.</p>
        ) : (
          <div className="space-y-3">
            {evals.map((ev, i) => (
              // Index-qualified key: eval records can repeat a story_id (a story
              // re-evaluated across runs), so story_id alone is not unique.
              <EvalRow key={`${ev.story_id ?? 'eval'}-${i}`} ev={ev} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main ParentDashboard
// ------------------------------------------------------------------ //
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'safety', label: 'Safety', icon: '🛡️' },
  { id: 'world', label: 'Story World', icon: '🌳' },
  { id: 'history', label: 'History', icon: '📖' },
  { id: 'journal', label: 'Journal', icon: '🌱' },
  { id: 'evals', label: 'Evals', icon: '📊' },
]

export default function ParentDashboard() {
  const { activeProfile, activeChildId } = useProfiles()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('profile')

  const childId = activeChildId ?? ''

  return (
    <div className="relative min-h-screen">
      <WarmBackground />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-100/80 border-b border-cream-300">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brand size="sm" />
            <span className="hidden sm:inline text-ink-50 text-sm">· Parent dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {activeProfile && <ProfileSwitcher destination="/parent" />}
            <Button variant="secondary" size="sm" onClick={() => navigate('/child')}>
              ← Bedtime mode
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden sm:flex flex-col w-52 shrink-0 pt-8 px-4 gap-1">
          {activeProfile && (
            <div className="flex items-center gap-3 px-3 pb-5 mb-2 border-b border-cream-300">
              <Avatar emoji={activeProfile.avatar} size={40} seed={activeProfile.profile.child_id} />
              <div className="min-w-0">
                <p className="text-ink-400 text-sm font-display font-bold truncate">
                  {activeProfile.profile.name}
                </p>
                <p className="text-ink-50 text-xs">Age {activeProfile.profile.age}</p>
              </div>
            </div>
          )}
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? 'bg-lavender-100 text-lavender-700 shadow-soft'
                  : 'text-ink-200 hover:bg-cream-200'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </aside>

        {/* Mobile tab row */}
        <div className="sm:hidden flex overflow-x-auto gap-2 px-4 pt-4 pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-200 ${
                tab === t.id
                  ? 'bg-lavender-100 text-lavender-700 shadow-soft'
                  : 'text-ink-200 bg-cream-50 border border-cream-300'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-3xl">
          {!activeChildId ? (
            <p className="text-ink-100">No active profile selected.</p>
          ) : (
            <div className="animate-fade-in" key={tab}>
              {tab === 'profile' && <ProfileTab childId={childId} />}
              {tab === 'safety' && <SafetyTab childId={childId} />}
              {tab === 'world' && <StoryWorldTab childId={childId} />}
              {tab === 'history' && <HistoryTab childId={childId} />}
              {tab === 'journal' && <JournalTab childId={childId} />}
              {tab === 'evals' && <EvalsTab />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
