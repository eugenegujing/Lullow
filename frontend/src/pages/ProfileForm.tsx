/**
 * ProfileForm — create or edit a child profile (route "/create" or "/edit/:id").
 *
 * Fields mirror ChildProfile, plus an avatar/emoji picker and an optional
 * "story friend" companion. On save we persist to the backend (PUT /profile,
 * and PUT /profile/{id}/world if a companion exists), save the full profile to
 * the localStorage roster, set it active, and navigate to the child home.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfiles } from '../context/ProfileContext'
import { putProfile, putStoryWorld } from '../api'
import type { ChildProfile } from '../api'
import {
  buildWorld,
  emptyProfile,
  newChildId,
  suggestAvatar,
  type LocalProfile,
} from '../lib/profileStore'
import WarmBackground from '../components/WarmBackground'
import Brand from '../components/Brand'
import {
  Button,
  Card,
  ChipInput,
  EmojiPicker,
  SectionHeader,
  Slider,
  TextField,
  Avatar,
} from '../components/ui'

/**
 * Outer guard: waits for the roster to load, then renders the form keyed by the
 * resolved profile so all `useState` initializers see the correct data on the
 * first render (no post-mount hydration effect / cascading renders needed).
 */
export default function ProfileForm() {
  const { id } = useParams<{ id: string }>()
  const { profiles, ready } = useProfiles()

  const existing = useMemo(
    () => (id ? profiles.find(p => p.profile.child_id === id) ?? null : null),
    [id, profiles],
  )

  if (!ready) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <WarmBackground />
        <p className="text-ink-100 animate-pulse">Loading…</p>
      </div>
    )
  }

  return <ProfileFormInner key={id ?? 'new'} isEdit={!!id} existing={existing} />
}

function ProfileFormInner({
  isEdit,
  existing,
}: {
  isEdit: boolean
  existing: LocalProfile | null
}) {
  const navigate = useNavigate()
  const { createProfile, updateProfile, selectProfile } = useProfiles()

  // Form state — initialized once from `existing` (correct because we're keyed).
  const [childId] = useState(() => existing?.profile.child_id ?? newChildId())
  const [profile, setProfile] = useState<ChildProfile>(
    () => existing?.profile ?? emptyProfile(childId),
  )
  const [avatar, setAvatar] = useState(
    () => existing?.avatar ?? suggestAvatar(existing?.profile ?? emptyProfile(childId)),
  )
  const [avatarTouched, setAvatarTouched] = useState(!!existing)

  // Companion (RecurringCharacter) — seeded from the existing world if present
  const existingCompanion = existing?.world?.recurring_characters[0]
  const [companionName, setCompanionName] = useState(existingCompanion?.name ?? '')
  const [companionSpecies, setCompanionSpecies] = useState(existingCompanion?.species ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')

  const set = <K extends keyof ChildProfile>(key: K, value: ChildProfile[K]) => {
    setProfile(p => ({ ...p, [key]: value }))
    // Keep the avatar in step with the first favorite animal until the user
    // explicitly picks one (no effect needed — derive on change).
    if (key === 'favorite_animals' && !avatarTouched) {
      const suggested = suggestAvatar({ ...profile, [key]: value } as ChildProfile)
      if (suggested !== '🌙') setAvatar(suggested)
    }
  }

  const save = async () => {
    if (!profile.name.trim()) {
      setNameError("Please add your child's name.")
      return
    }
    setNameError('')
    setSaving(true)
    setError('')

    const cleanProfile: ChildProfile = { ...profile, name: profile.name.trim() }
    const hasCompanion = companionName.trim() && companionSpecies.trim()
    const world = hasCompanion
      ? buildWorld(childId, { name: companionName, species: companionSpecies })
      : existing?.world

    try {
      await putProfile(cleanProfile)
      if (hasCompanion && world) {
        await putStoryWorld(childId, world)
      }
    } catch {
      // Backend may be down — still save locally so the roster is the source of truth.
      setError('Saved on this device. (Backend sync will retry when you select this profile.)')
    }

    const entry: LocalProfile = { profile: cleanProfile, avatar, world }
    if (isEdit) {
      updateProfile(childId, entry)
    } else {
      createProfile(entry)
    }

    // Select + go to the child home (for new profiles especially).
    await selectProfile(childId)
    setSaving(false)
    navigate('/child')
  }

  return (
    <div className="relative min-h-screen px-5 py-8 sm:py-12">
      <WarmBackground />

      <div className="max-w-2xl mx-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-ink-100 hover:text-lavender-600 transition-colors duration-200"
          >
            ← Back
          </button>
          <Brand size="sm" />
          <span className="w-12" />
        </div>

        <div className="text-center mb-8">
          <Avatar emoji={avatar} size={88} seed={childId} ring />
          <h1 className="font-display text-3xl font-bold text-ink-400 mt-4">
            {isEdit ? `Edit ${profile.name || 'profile'}` : 'Create a profile'}
          </h1>
          <p className="text-ink-100 mt-2">
            This shapes the stories Lullow tells — gently and just for them.
          </p>
        </div>

        {/* Basics */}
        <Card className="mb-5">
          <SectionHeader title="The basics" eyebrow="Step 1" className="mb-5" />
          <div className="space-y-5">
            <TextField
              label="Name"
              value={profile.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Leo"
              error={nameError}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Age"
                type="number"
                min={2}
                max={12}
                value={String(profile.age)}
                onChange={e => set('age', Math.min(12, Math.max(2, Number(e.target.value) || 5)))}
              />
              <TextField
                label="Language"
                value={profile.preferred_language ?? 'English'}
                onChange={e => set('preferred_language', e.target.value)}
                placeholder="English"
              />
            </div>
            <Slider
              label="Preferred story length"
              value={profile.preferred_story_length_minutes}
              onChange={v => set('preferred_story_length_minutes', v)}
              min={2}
              max={15}
              unit="min"
            />
          </div>
        </Card>

        {/* Avatar */}
        <Card className="mb-5">
          <SectionHeader title="Pick an avatar" eyebrow="Step 2" className="mb-5" />
          <EmojiPicker
            value={avatar}
            onChange={v => {
              setAvatar(v)
              setAvatarTouched(true)
            }}
          />
        </Card>

        {/* Preferences */}
        <Card className="mb-5">
          <SectionHeader
            title="Things they love"
            eyebrow="Step 3"
            description="Lullow weaves these into the story world."
            className="mb-5"
          />
          <div className="space-y-5">
            <ChipInput
              label="Favorite animals"
              values={profile.favorite_animals}
              onChange={v => set('favorite_animals', v)}
              placeholder="fox, rabbit…"
              tone="lavender"
            />
            <ChipInput
              label="Favorite settings"
              values={profile.favorite_settings}
              onChange={v => set('favorite_settings', v)}
              placeholder="moon garden, treehouse…"
              tone="sage"
            />
            <ChipInput
              label="Comfort objects"
              values={profile.comfort_objects}
              onChange={v => set('comfort_objects', v)}
              placeholder="moon lamp, blue blanket…"
              tone="peach"
            />
            <ChipInput
              label="Sensitive topics (handled gently)"
              hint="Lullow will steer around these with extra care."
              values={profile.sensitive_topics}
              onChange={v => set('sensitive_topics', v)}
              placeholder="being alone, big dogs…"
              tone="peach"
            />
          </div>
        </Card>

        {/* Story friend */}
        <Card className="mb-6">
          <SectionHeader
            title="A story friend"
            eyebrow="Optional"
            description="A recurring companion who appears every night — Lullow's signature touch."
            className="mb-5"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Friend's name"
              value={companionName}
              onChange={e => setCompanionName(e.target.value)}
              placeholder="Nino"
            />
            <TextField
              label="What are they?"
              value={companionSpecies}
              onChange={e => setCompanionSpecies(e.target.value)}
              placeholder="fox"
            />
          </div>
          {companionName.trim() && companionSpecies.trim() && (
            <p className="text-sage-500 text-sm mt-3 font-medium">
              ✓ {companionName.trim()} the {companionSpecies.trim()} will join every story.
            </p>
          )}
        </Card>

        {error && (
          <p className="text-peach-500 text-sm mb-4 text-center bg-peach-50 border border-peach-200 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} fullWidth>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create & start ✦'}
          </Button>
        </div>
      </div>
    </div>
  )
}
