# AI generation

**Status:** Current · **Source reviewed:** 17 September 2026

How the code uses AI today. The target role of AI is described in the [product concept](../product/concept.md): AI produces text and imagery, templates produce layout, people decide.

## Operations

| Operation | Used for | Model (approved list) | Output |
| --- | --- | --- | --- |
| `analyseBrief` | Brief stage | `gemini-3.5-flash` | Title, summary, audience, objective, channels, formats, themes, warnings; with sources, a briefing proposal (found copy, visual keywords) |
| `generateCopy` | Copy stage | `gemini-3.5-flash` | Exactly 5 variants: headline, body, optional offer, CTA and an image prompt |
| `generateDirections` | Visuals stage | `gemini-3.5-flash` | Image prompts: 5 campaign-wide, or 1 per selected copy |
| `generateImage` | Visuals stage | `gemini-3.1-flash-image` | One image with no text or logos, leaving space for layout |
| Video | Visuals stage | Veo, set by `GEMINI_VIDEO_MODEL` | Short video for a visual direction |
| `brandInspectMaterials` | Brand library | `gemini-3.5-flash` | A normalised brand draft with evidence for inferred values |
| `brandProposeChanges` | Brand library | `gemini-3.5-flash` | Small changes limited to colors and type scale |

AI never lays out banners, approves work or publishes brands. Layout is produced by the deterministic renderer from template manifests.

## Where things live

| Concern | Location |
| --- | --- |
| Provider contract and validation | `server/providers/provider.js`: every input and output is checked against zod schemas in `shared/contracts.js` |
| Approved providers, models and regions | `server/providers/registry.js`: Gemini in region `eu`, and a mock provider for tests and demos |
| Prompts | `systemInstructions` in `server/providers/geminiProvider.js` |
| Job lifecycle | `server/services/generationService.js`, `server/repositories/generationJobRepository.js` |
| Video jobs | `server/services/videoGenerationService.js`, `server/providers/veoProvider.js`, `server/services/videoWorker.js` |
| Readiness check | `server/services/generationReadinessService.js`, `GET /api/v1/me/ai/readiness` |
| Personal credentials | `server/services/personalAiService.js`, `server/services/credentialVault.js` |

## Safeguards

- **Untrusted data framing.** User content is sent as data and prompts instruct the model never to follow instructions inside it.
- **Schema validation** of every request and response; invalid responses fail.
- **Cost caps per operation** (microunits): brief analysis 1,000, copy 3,000, directions 5,000, image 250,000, brand operations 5,000.
- **Region and model allowlist.** Only registered provider/model/region combinations run.
- **Idempotency.** Every generation request carries an idempotency key; replays return the stored result.
- **Evidence checks.** Found copy in a briefing proposal is verified against the uploaded sources.
- **No implicit generation.** Opening or refreshing a page never dispatches a job.

## Job statuses

| Status | Meaning |
| --- | --- |
| `pending` | Dispatched and running |
| `succeeded` | Result stored |
| `failed` | Known failure: configuration missing before dispatch, invalid input or output, a provider rejection (HTTP 400, 401, 403, 404) or a known limit |
| `blocked` | Rejected by provider safety |
| `unknown` | Outcome uncertain: a timeout, abort, network or server error after the request was sent |

A `pending` or `unknown` job blocks copy changes, keeping supplied copy and visual uploads for that project.

- **Reasons.** Every failed, blocked or unknown job carries a code (`errorCode`, `unknownReason`) that the studio shows in plain language through `generationReasonMessage` in `shared/generationErrors.js`; raw codes and provider text are never shown ([D33](../product/decisions.md)).
- **Mark as failed.** 40 seconds after an unknown job's timeout, the requester or an admin can call `POST /api/v1/generation-jobs/:jobId/resolve` with `{ "resolution": "marked_failed" }`. The job becomes `failed`, keeps its unknown reason, counts its reservation as cost and is audited as `generation.marked_failed`; replaying the original request returns the resolved job. Video jobs also move their phase to `failed`.
- **Readiness before dispatch.** When generation readiness is not `ready`, a generation request returns `409 generation_unavailable` before any job is created; a paused kill switch keeps its own error ([D37](../product/decisions.md)).

## Credentials

| Context | How credentials are supplied |
| --- | --- |
| Project briefing (always on, [D37](../product/decisions.md)) | Vertex AI with application default credentials: `VERTEX_AI_PROJECT_ID` and `VERTEX_AI_LOCATION=eu`. Personal keys and other regions are rejected; the local mock provider is used in development and tests. |
| Local development API | `GEMINI_TEXT_API_KEY` and `GEMINI_MEDIA_API_KEY` in the root `.env`. When set, they take precedence; missing keys fail closed. |
| Personal connections | Users connect a key in **Settings → Text & analysis**. Keys are checked server-side, encrypted with `PERSONAL_CREDENTIAL_ENCRYPTION_KEY` and never returned to the browser. |

Never prefix credentials with `VITE_`, place them in client storage or record them in documents.

## Gaps against the target

- No brand information reaches copy, direction or image prompts ([D2](../product/decisions.md)).
- No AI review of rendered assets ([D3](../product/decisions.md)).
- Prompts are fixed in code per operation; recipe guidance does not exist yet ([D8](../product/decisions.md)).
