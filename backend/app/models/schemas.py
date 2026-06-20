"""Pydantic data models for Lullow.

These mirror the data model in Lullow_Project_Plan.md (sections 12 & 15) and
are the shared contract between services, routers, and the frontend. Keep them
stable: the frontend's API_CONTRACT.md is generated from these shapes.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class Emotion(str, Enum):
    SCARED = "scared"
    LONELY = "lonely"
    SAD = "sad"
    MISSING_PARENT = "missing_parent"
    WORRIED = "worried"
    OVERSTIMULATED = "overstimulated"
    ANGRY = "angry"
    CANT_SLEEP = "cant_sleep"
    UNSURE = "unsure"


class SpeakerType(str, Enum):
    CHILD = "child"
    PARENT = "parent"


class VisualMode(str, Enum):
    OFF = "off"               # audio-only / lights-out bedtime mode
    LOW_STIMULATION = "low_stimulation"  # picture-book mode


# --------------------------------------------------------------------------- #
# Memory: Child profile, parent safety settings, story world
# --------------------------------------------------------------------------- #
class ChildProfile(BaseModel):
    child_id: str
    name: str
    age: int = Field(ge=2, le=12)
    preferred_language: str = "English"
    favorite_animals: list[str] = Field(default_factory=list)
    favorite_settings: list[str] = Field(default_factory=list)
    comfort_objects: list[str] = Field(default_factory=list)
    sensitive_topics: list[str] = Field(default_factory=list)
    preferred_story_length_minutes: int = 5


class ParentSafetySettings(BaseModel):
    child_id: str
    allow_child_initiated_sessions: bool = True
    blocked_topics: list[str] = Field(
        default_factory=lambda: ["death", "monsters", "violence"]
    )
    blocked_words: list[str] = Field(default_factory=list)
    max_story_length_minutes: int = 8
    visual_mode: VisualMode = VisualMode.LOW_STIMULATION
    requires_parent_review_for_new_themes: bool = True
    emergency_contact_enabled: bool = True
    bedtime_cutoff: Optional[str] = None  # "20:30"


class RecurringCharacter(BaseModel):
    name: str
    species: str
    traits: list[str] = Field(default_factory=list)
    reference_image_url: Optional[str] = None  # locked-character master image


class StoryWorld(BaseModel):
    child_id: str
    story_world_id: str = "moonberry_forest"
    recurring_setting: str = "Moonberry Forest"
    recurring_characters: list[RecurringCharacter] = Field(default_factory=list)
    past_themes: list[str] = Field(default_factory=list)
    successful_rituals: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------- #
# Voice
# --------------------------------------------------------------------------- #
class TranscriptResult(BaseModel):
    text: str
    is_mock: bool = False


class TTSResult(BaseModel):
    # base64-encoded audio (mp3) so it can be returned over JSON for the demo
    audio_base64: str
    mime_type: str = "audio/mpeg"
    is_mock: bool = False


# --------------------------------------------------------------------------- #
# Emotion check-in
# --------------------------------------------------------------------------- #
class EmotionExtraction(BaseModel):
    emotion: Emotion
    trigger: Optional[str] = None
    target_outcome: str
    avoid: list[str] = Field(default_factory=list)
    safety_flag: bool = False  # True if input suggests danger -> escalation
    reflection: str  # gentle spoken validation, voice/tone compliant
    confidence: float = 0.0


class CheckInRequest(BaseModel):
    child_id: str
    speaker: SpeakerType = SpeakerType.CHILD
    text: str


class CheckInResponse(BaseModel):
    extraction: EmotionExtraction
    escalation: Optional["SafetyEscalation"] = None


# --------------------------------------------------------------------------- #
# Safety
# --------------------------------------------------------------------------- #
class SafetyEscalation(BaseModel):
    triggered: bool
    category: Optional[str] = None  # e.g. "self_harm", "abuse", "alone_unsafe"
    spoken_response: str = ""       # warm, clear "find a trusted adult" message
    show_help_button: bool = True


class SafetyEvaluation(BaseModel):
    age_appropriate: bool = True
    too_scary: bool = False
    parent_constraints_followed: bool = True
    sleep_friendly: bool = True
    emotional_warmth: float = 0.0
    blocked_topic_hits: list[str] = Field(default_factory=list)
    notes: str = ""
    passed: bool = True


# --------------------------------------------------------------------------- #
# Story pipeline
# --------------------------------------------------------------------------- #
class StoryRequest(BaseModel):
    child_id: str
    input_source: Literal["voice", "text"] = "text"
    speaker: SpeakerType = SpeakerType.CHILD
    raw_input: str
    visual_mode: Optional[VisualMode] = None  # overrides parent default per session
    extraction: Optional["EmotionExtraction"] = None  # checkin passes its result to skip re-extraction


class StoryPlan(BaseModel):
    theme: str
    tone: str = "gentle"
    conflict_intensity: Literal["none", "low", "medium"] = "low"
    avoid: list[str] = Field(default_factory=list)
    resolution: str
    ritual: str
    main_character: Optional[str] = None
    setting: Optional[str] = None


class StoryScene(BaseModel):
    index: int
    text: str               # narration text for this page
    image_prompt: str       # safety-filtered prompt for the image model
    image_url: Optional[str] = None
    clip_url: Optional[str] = None       # Pika low-motion animation
    narration_audio_base64: Optional[str] = None
    is_image_mock: bool = False
    is_clip_mock: bool = False


class Ritual(BaseModel):
    name: str
    steps: list[str]
    spoken: str  # the gentle spoken ritual, voice/tone compliant


class ReviewTrail(BaseModel):
    story_id: str
    title: str
    child_said: Optional[str] = None
    parent_request: Optional[str] = None
    emotion_target: str
    memory_used: list[str] = Field(default_factory=list)
    safety_constraints_applied: list[str] = Field(default_factory=list)
    avoided_topics: list[str] = Field(default_factory=list)
    parent_edits: list[str] = Field(default_factory=list)
    final_status: Literal["draft", "parent_approved"] = "draft"


class Story(BaseModel):
    story_id: str
    child_id: str
    title: str
    body: str                       # full narration text
    plan: StoryPlan
    scenes: list[StoryScene] = Field(default_factory=list)
    ritual: Ritual
    review_trail: ReviewTrail
    safety_evaluation: SafetyEvaluation
    emotion: "Emotion"              # resolved emotion for this story
    visual_mode: VisualMode = VisualMode.LOW_STIMULATION
    created_at: str


class StoryGenerateResponse(BaseModel):
    story: Optional[Story] = None   # null when a danger input blocks generation
    escalation: Optional["SafetyEscalation"] = None
    used_mock: dict[str, bool] = Field(default_factory=dict)


class StoryReviseRequest(BaseModel):
    story_id: str
    child_id: str
    instruction: str  # e.g. "make softer", "remove the forest", "change animal to rabbit"


# --------------------------------------------------------------------------- #
# Visual pipeline
# --------------------------------------------------------------------------- #
class VisualGenerateRequest(BaseModel):
    story_id: str
    child_id: str
    animate: bool = True  # if False, image-only (static page fallback by choice)


# --------------------------------------------------------------------------- #
# Growth journal
# --------------------------------------------------------------------------- #
class JournalEntry(BaseModel):
    story_id: str
    date: str
    emotion: Emotion
    theme: str
    title: str


class GrowthJournal(BaseModel):
    child_id: str
    period: str = "this_week"
    emotion_counts: dict[str, int] = Field(default_factory=dict)
    helpful_elements: list[str] = Field(default_factory=list)
    entries: list[JournalEntry] = Field(default_factory=list)
    reflection: str = ""  # parent-facing reflection, non-diagnostic


# --------------------------------------------------------------------------- #
# Annotation (Terac)
# --------------------------------------------------------------------------- #
class AnnotationLabels(BaseModel):
    age_appropriate: Optional[bool] = None
    too_scary: Optional[bool] = None
    emotionally_warm: Optional[bool] = None
    moral_clarity: Optional[bool] = None
    parent_approval: Optional[bool] = None
    rewrite_needed: Optional[bool] = None


class AnnotationRequest(BaseModel):
    story_id: str
    labels: AnnotationLabels
    annotator: str = "parent"
    notes: str = ""


# Resolve forward refs
CheckInResponse.model_rebuild()
StoryRequest.model_rebuild()
StoryGenerateResponse.model_rebuild()
Story.model_rebuild()
