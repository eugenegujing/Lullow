# Lullow Backend Workflow Diagram

This is the implementation-oriented backend workflow for login, bedtime story
generation, Redis reuse, Deepgram voice, Midjourney images, and parent-approved
memory.

## End-to-End Flow

```text
+-----------------------------+
|        Login Screen         |
| username + password         |
+--------------+--------------+
               |
               v
+-----------------------------+
| Backend Auth API            |
| POST /api/auth/login        |
+--------------+--------------+
               |
               v
+-----------------------------+
| Redis Profile/Auth DB       |
| user:{username}             |
| password_hash               |
| child_profile_id            |
+--------------+--------------+
               |
        +------+------+
        |             |
        v             v
+---------------+  +----------------------+
| Wrong Password|  | Login Success        |
| Try Again     |  | issue session token  |
+---------------+  +----------+-----------+
                              |
                              v
+------------------------------------------------+
|              Child Bedtime UI                  |
| dark calming screen                            |
| touch -> "Ready for a bedtime story?"          |
| touch -> microphone screen                     |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|              Deepgram STT                      |
| child voice -> transcript                      |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|        Backend Story Request API               |
| POST /api/story/generate                       |
| transcript + child_id + session_id             |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|        Emotion + Sentiment Analysis            |
| mood, feeling, trigger, intent                 |
| quotes from child input                        |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|        Load Personalization Context            |
| Redis Profile DB                               |
| - child profile                                |
| - age                                          |
| - favorite animals/settings                    |
| - comfort objects                              |
| - parent safety rules                          |
| - blocked topics/words                         |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|        Safety + Prompt Engineering             |
| - child-safe tone                              |
| - no scary/violent content                     |
| - no diagnosis                                 |
| - no secrecy                                   |
| - soothing bedtime style                       |
| - trusted-adult escalation if danger detected  |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|          Redis Vector Story Search             |
| Search by:                                     |
| - child_id / age band                          |
| - emotion                                      |
| - trigger                                      |
| - story theme                                  |
| - profile preferences                          |
| - safety constraints                           |
+----------------------+-------------------------+
                       |
              +--------+--------+
              |                 |
              v                 v
+------------------------+   +-----------------------------+
| Story Found in Redis   |   | No Good Story Match         |
| reuse story slides     |   | generate new story          |
+-----------+------------+   +--------------+--------------+
            |                               |
            |                               v
            |                 +-----------------------------+
            |                 | LLM Story Generation        |
            |                 | creates title + slide parts |
            |                 | + image prompts             |
            |                 +--------------+--------------+
            |                               |
            +---------------+---------------+
                            |
                            v
+------------------------------------------------+
|        Story Safety Evaluation                 |
| if unsafe -> regenerate once                   |
| if still unsafe -> safe fallback story         |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|              Slide Builder                     |
| story divided into 4-6 parts                   |
| each slide has:                                |
| - line/text                                    |
| - narration text                              |
| - image prompt                                |
| - mood/theme metadata                         |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|        For Each Slide: Image Cache Check       |
+----------------------+-------------------------+
                       |
                       v
        +-----------------------------------------------+
        | Redis Picture Cache                           |
        |                                               |
        | Picture key uses 4-5 matching attributes:     |
        | image:{story_title}:{character}:{setting}:    |
        |       {emotion}:{scene_index}                 |
        |                                               |
        +----------------------+------------------------+
                               |
                    +----------+----------+
                    |                     |
                    v                     v
        +----------------------+   +---------------------------+
        | Cache Hit            |   | Cache Miss                |
        | reuse image          |   | call image provider       |
        +----------+-----------+   +-------------+-------------+
                   |                             |
                   |                             v
                   |                  +----------------------+
                   |                  | Midjourney Image     |
                   |                  | picture-book image   |
                   |                  +----------+-----------+
                   |                             |
                   +-----------------------------+
                                                |
                                                v
+------------------------------------------------+
|          Save Generated Assets                 |
| Redis App DB / Vector DB                       |
| - story:title unique                           |
| - slide data                                   |
| - image URLs                                   |
| - embeddings                                   |
| - metadata keys                                |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|             Return Slide Deck                  |
| frontend receives ordered slides:              |
| [ { text, image, index }, ... ]                |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|             Child Presentation UI              |
| Slide 1: text -> Deepgram voice + picture      |
| Next arrow -> Slide 2                          |
| Next arrow -> Slide 3                          |
| ...                                            |
+----------------------+-------------------------+
                       |
                       v
+------------------------------------------------+
|             Feedback Prompt                    |
| "Did you like this story?"                     |
+----------------------+-------------------------+
                       |
              +--------+--------+
              |                 |
              v                 v
+-------------------------+  +-----------------------------+
| Yes                     |  | No                          |
| save if title missing   |  | do not store as preferred   |
| improve future RAG      |  | optionally store rejection  |
+-------------------------+  +-----------------------------+
```

## Redis Backend Split

```text
+----------------------------------+
| Redis DB 1: Auth + Profile Data  |
+----------------------------------+
| user:{username}                  |
| session:{session_id}             |
| profile:{child_id}               |
| settings:{child_id}              |
| parent:{parent_id}:children      |
+----------------------------------+

+----------------------------------+
| Redis DB 0: Story + Asset Memory |
+----------------------------------+
| story:{title}                    |
| story:{story_id}                 |
| child:{child_id}:stories         |
| slide:{story_title}:{index}      |
| image:{title}:{character}:       |
|       {setting}:{emotion}:{idx}  |
| rag:story:{story_id}             |
| rag:image:{image_id}             |
+----------------------------------+
```

## Provider Responsibilities

Deepgram:

```text
voice input -> STT transcript
story lines -> soothing TTS narration
```

Midjourney:

```text
slide image prompt -> picture-book image
```

Sentry:

```text
errors + traces + provider failures + latency
```

Sentry should not receive raw child audio, raw child text, full prompts, or
profile details.

## Cache / Reuse Rules

Avoid provider API calls when Redis already has:

- Matching story title.
- Matching vector story result.
- Matching picture key.

Picture key should include 4-5 attributes for safer matching:

```text
image:{story_title}:{character}:{setting}:{emotion}:{scene_index}
```

Audio is not stored in Redis. Store slide text only, then send `narration_text`
to Deepgram when the child plays that slide.

## Security Note

Do not store raw passwords. Store `password_hash` and compare login attempts
against the hash.
