# Component usage guidance

Content specification · 16 September 2026 · Brutalist Design System

## Purpose and publishing contract

This document provides Usage guidance copy for the current atomic library. Its audience is developers and agents choosing components while building a product. It explains the task each component supports, realistic contexts, alternatives, and the decisions the consuming application must make.

The inventory is based on the `docs-basics` worktree: `src/atomic/components/index.ts`, `src/atomic/screens/docs/componentContent.tsx`, `docsNavigation.ts`, the corresponding implementations, and the public atomic entry point. All 65 component documentation records are covered below. The combined Select page has separate guidance for its three exports. Supplemental sections cover the Basics primitives and the three currently documented UI blocks.

Each **Page key** identifies the existing component content record. The paragraphs labelled **Use when**, **In context**, **Choose and compose**, and **Behavior and content** are publication copy. Keep their meaning when fitting them into the existing Usage guidance section. They can be rendered as labelled paragraphs using shared typography; they do not require a new interactive component, variant, demo, or API.

Everything in **Implementation handoff** is agent-facing editorial information, not copy for the product page. Recommended behavior is not a claim that the library implements it automatically. Verify the component's current API before wiring an example. This delivery changes documentation only; frontend integration is a subsequent task.

## Shared selection principles

Choose by the user's task before choosing by appearance. An action changes something; a selection stores a choice; navigation changes the user's location; a status communicates what is happening. Controls that look alike can have different semantics.

Keep the default example simple. Describe meaningful variations by the problem they solve: a stepper with descriptions explains unfamiliar stages, a compact control fits repeated row actions, and a removable tag represents an editable selection. Size or color alone should not redefine what a component does.

Use the established text, spacing, shape, and semantic color tokens. Keep status wording consistent across tags, tables, alerts, and notifications. A person should not have to infer meaning from color or an icon. Custom brand colors require a deliberate product purpose and readable text and focus states.

State changes belong to the application. Components expose controls and callbacks; the product owns data persistence, permissions, async work, recovery, and route changes. Only show completion after the underlying operation has succeeded. Keep unsaved input available after failures.

## Actions

### Button

**Page key:** `button` · **Export:** `Button`

**Use when:** The user explicitly initiates an operation: create a campaign, save changes, upload a selection, or open a dialog. For navigation to another resource, use a link through TextAction.

**In context:** A campaign editor ends with a primary “Save changes” button and a secondary “Cancel” action. In a project row, “Duplicate” is a supporting action with less emphasis than the page's main creation action.

**Choose and compose:** Use primary emphasis for the main action within a decision area; use neutral or quiet styles for supporting actions. Reserve danger for destructive consequences. A routine “Try again” action is not destructive merely because it follows an error. Use named sizes to match surrounding density, and retain a usable pointer target in compact layouts.

**Behavior and content:** Name the outcome with a verb and object. Explain unavailable actions near the control. While a request is pending, show busy state and prevent duplicate submission; after failure, provide a useful recovery message. Give icon-only buttons an accessible name. Actions use button semantics, while resource navigation uses link semantics. [Button pattern, W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

### Button Group

**Page key:** `button-group` · **Export:** `ButtonGroup`

**Use when:** Several actions operate on the same object and should be understood together. Examples include “Save / Save as draft / More,” or “Download PDF / Download CSV.”

**In context:** In a report header, show the common export action beside a Menu for less frequent export commands. Keep the group near the report it affects. A separate destructive action should not look like an equally safe continuation of the main task.

**Choose and compose:** Use attached buttons when the actions form one compact unit; use separated buttons when their boundaries need more emphasis. Assign importance and color to each child according to its consequence. For Grid/List selection, use SegmentedControl; for content sections, use Tabs. A text editor's Bold/Italic commands may be grouped, but each independent toggle needs its own pressed state and the editor must own formatting behavior.

**Behavior and content:** Grouping does not create selection state, mutual exclusivity, split-button behavior, or toolbar keyboard navigation. Keep every child individually named and operable. If a group becomes crowded, promote frequent actions and move secondary commands into Menu. Do not shrink labels until the choices become ambiguous.

### Compact Button

**Page key:** `compact-button` · **Export:** `CompactButton`

**Use when:** A supporting action repeats inside a dense surface, such as editing a table row, removing an attachment, or opening an item's action menu.

**In context:** A file list has a compact remove action beside each filename. The page-level “Upload files” action remains a regular Button because it is a more prominent task.

**Choose and compose:** Use the compact variant when context already explains the target. Prefer text plus an icon when the symbol is unfamiliar. Avoid filling a mobile page with small icon-only actions simply to preserve desktop density.

**Behavior and content:** Give repeated controls specific accessible names, such as “Remove campaign-brief.pdf.” Preserve focus visibility and sufficient separation between adjacent actions. Compact appearance does not reduce the need for a usable touch target.

### Fancy Button

**Page key:** `fancy-button` · **Export:** `FancyButton`

**Use when:** One action needs a short supporting line before the user can confidently choose it. This is useful for starting setup, opening a workspace chooser, or beginning an import with a meaningful consequence.

**In context:** “Import contacts” can have the subtitle “Review a CSV before adding people.” The second line tells the user what will happen next; it should not repeat “Import contacts.”

**Choose and compose:** Use a regular Button when its label fully explains the action. Keep FancyButton for occasional, prominent decisions rather than repeated table actions. A choice among plans with prices and features needs a richer selection pattern.

**Behavior and content:** Keep the title action-led and the subtitle brief. Preserve the shared spacing between text and icon, and allow wrapping without clipping. A trailing arrow does not change the control into a link; use link semantics when the operation is purely navigation.

### Feedback Button

**Page key:** `feedback-button` · **Export:** `FeedbackButton`

**Use when:** A small operation can acknowledge success in the same control, such as copying a code sample or a share link.

**In context:** “Copy link” changes to “Copied” only after the clipboard operation succeeds. When the underlying link changes, the action becomes available for the new value.

**Choose and compose:** Use Button with workflow-level feedback for actions that need an ongoing progress view, repeated execution, or a substantial result. FeedbackButton is suited to an operation that completes once for the current content.

**Behavior and content:** Supply an accurate success label and handle failures through the surrounding workflow. The current component suppresses repeat execution after completion until reset; use resetKey when the content or operation identity changes. Do not describe this as an automatically timed confirmation.

### Link Button / Text action

**Page key:** `text-action` · **Export:** `TextAction`

**Use when:** Navigation or a secondary action should sit comfortably within prose, metadata, or a compact message. Examples include “View invoice,” “Read the guide,” and “Clear filters.”

**In context:** An export notification offers “View export details” as a link. A search summary offers “Clear filters” as a button styled with the same low emphasis.

**Choose and compose:** Provide href for a destination; use the action form for changes in the current interface. Use a regular Button when the task is the primary decision or needs a stronger visual target.

**Behavior and content:** Write a label that identifies the destination or effect without surrounding text. Avoid repeated “Click here” links. Underlining must remain recognizable, and keyboard focus must be visible. Explain unavailable navigation in the surrounding UI rather than assuming a link supports the same disabled behavior as a button.

### Form actions

**Page key:** `form-actions` · **Export:** `FormActions`

**Use when:** A form has one submission point and an optional way to abandon changes. Use it for account settings, a new project form, or editing a contact.

**In context:** After campaign settings, “Save changes” commits the whole form and “Cancel” returns to the previous state. A nearby message confirms the completed save or explains what still needs attention.

**Choose and compose:** Put this row at the end of Form, close enough that its scope is clear. Use a specific submit label such as “Create project.” For immediate per-field updates, provide feedback beside the changed field instead of implying that another save is required.

**Behavior and content:** The application owns submission, cancellation, validation, and dirty-state handling. Use busy during submission and preserve entered values on failure. Ensure the user can find invalid fields; a status message beneath the buttons should not be the only explanation.

### Inline confirmation

**Page key:** `inline-confirmation` · **Export:** `InlineConfirmation`

**Use when:** A localized destructive action needs one short confirmation while its target remains visible, such as deleting a draft from a row.

**In context:** “Delete draft” expands beside the named draft to explain that the draft will be removed. Cancel restores the original row without changing the data.

**Choose and compose:** Use Dialog when the consequences involve multiple objects, substantial explanation, or another required decision. Prefer a recoverable action with undo where that is appropriate to the product. Avoid confirmation for routine, harmless operations.

**Behavior and content:** Name the affected object and consequence in the question. Keep failure feedback beside the decision and allow retry. The current confirmation action uses a generic “Confirm” label, so make the question self-contained; a customizable action label requires a shared-component enhancement.

## Displaying data

### Avatar

**Page key:** `avatar` · **Export:** `Avatar`

**Use when:** Recognizing a person helps the user scan ownership, comments, activity, or assignments.

**In context:** Show an avatar beside the author's name in a comment, or beside the assignee in a task row. In an unfamiliar team, the visible name matters more than the portrait alone.

**Choose and compose:** Use the shared circular sizes and match neighboring controls. Initials cover people without a supplied image. Show presence only when the application has trustworthy, current presence data; online status is different from permission or task completion.

**Behavior and content:** Supply a meaningful name even when an image exists. Keep people identifiable without relying on portrait recognition or color. Avatar itself is an identity marker, so provide a separate accessible action if users can open a profile. Handle unavailable image sources in the consuming data flow.

### Avatar Group

**Page key:** `avatar-group` · **Export:** `AvatarGroup`

**Use when:** A small collection of people can be summarized visually, such as project collaborators or assigned reviewers.

**In context:** A project header shows a few collaborators and an overflow count, with an explicit “View members” action nearby. The full member list supplies names, roles, and any management actions.

**Choose and compose:** Keep all avatars in one group at the same size. Set the visible limit to fit the context without making overlap obscure identity. Use a named list when the user needs to compare or select individuals.

**Behavior and content:** Give the group a contextual label such as “Project reviewers.” The overflow count indicates hidden members; it is not an automatic expandable control. Provide access to the full list and do not imply the order represents rank unless that meaning is explicit.

### Avatar Group Compact

**Page key:** `avatar-group-compact` · **Export:** `AvatarGroupCompact`

**Use when:** People are secondary metadata inside a dense row, card, or activity summary.

**In context:** A campaign table can show a compact reviewer group alongside owner and status columns. A campaign detail header can use the regular AvatarGroup for greater prominence.

**Choose and compose:** Use the compact group consistently within comparable rows. Keep a visible route to names and the complete member list. If identifying each person is the task, choose a list rather than progressively smaller portraits.

**Behavior and content:** Label the group by its relationship to the item. Overflow remains a summary, not a built-in action. Ensure the neighboring row action supplies enough context that the miniature avatars do not have to communicate permissions or responsibilities on their own.

### Badge

**Page key:** `badge` · **Export:** `Badge`

**Use when:** A brief, non-interactive annotation helps users scan a record: “New,” “Beta,” “Approved,” or a plan category.

**In context:** A feature name may carry a “Beta” badge, or a table row may show an approval state. The surrounding text identifies what the badge qualifies.

**Choose and compose:** Use a neutral tone for categories, and semantic color only when the label describes a meaningful state. Use Tag for editable metadata or removable selections. Use StatusBadge when the shared status mapping fits the product's vocabulary.

**Behavior and content:** Keep labels concise and understandable without their color. Badges are not buttons or filters. If the label becomes an action, choose a control with matching interaction semantics. Do not alternate Badge and Tag for the same status merely for visual variety.

### Status Badge

**Page key:** `status-badge` · **Export:** `StatusBadge` · **Publishing home:** Badge family

**Use when:** A repeatable state needs the library's predefined status treatment, such as pending review, successful completion, or a blocking problem.

**In context:** A publishing queue uses “Pending,” “Published,” and “Failed” consistently across rows and item details. An alert explains a failure; the badge remains a compact state summary.

**Choose and compose:** StatusBadge provides status treatment through Tag. Publish its guidance as a named variant within the Badge family, consistent with the merged sidebar grouping. Use neutral tags for arbitrary categories and an Alert for messages requiring explanation or recovery.

**Behavior and content:** Always provide a visible state label. Decide status from actual application data, and keep pending, unavailable, and failed distinct. A status badge does not announce a completed operation, retry it, or enforce a workflow transition.

### Tag

**Page key:** `tag` · **Export:** `Tag`

**Use when:** An item needs a short label, category, active filter, or workflow state. The plain form is a white tag with a black outline and no icon.

**In context:** A campaign can have a neutral “Email” category. A filter summary can show a removable “Owner: Mira” tag. A board can use “Planned,” “In progress,” “In review,” “Approved,” and “Blocked” with consistent state treatments.

**Choose and compose:** Add an icon when it improves recognition. Use semantic tones for status, not arbitrary decoration. Use a removable variant only when the user can remove that selection or association. A clickable filter choice belongs in a selection control; a tag alone is a label.

**Behavior and content:** Keep the shared 600 text weight and concise wording. Name removal precisely: “Remove owner filter” communicates a different consequence from deleting the person. Reflect the changed selection after removal and preserve a clear empty-filter state.

### Banner

**Page key:** `banner` · **Export:** `Banner`

**Use when:** A condition affects the whole workspace or a substantial area of the current task, such as maintenance, read-only mode, or an integration outage.

**In context:** Place a maintenance banner above the workspace content so users see it before attempting edits. Its message explains the impact, and a short “Details” action provides further context.

**Choose and compose:** Use Alert for a problem confined to one form or panel. Use Notification for an event such as a completed export. Keep workspace banners scarce and prioritize overlapping messages.

**Behavior and content:** State the condition, user impact, and useful next step. Offer dismissal only when hiding the message will not make the current state misleading. The application decides how long dismissal lasts and when the banner returns. Use the established link-like action treatment and maintain separation from close controls.

### Data Table

**Page key:** `table` · **Export:** `Table`

**Use when:** Users compare records across the same attributes, such as campaign name, owner, status, and last update.

**In context:** An operations view uses sortable campaign rows to find recent work. Row actions remain separate from the data, and a nearby result count explains the scope of the table.

**Choose and compose:** Use a list or cards when each item has substantially different content or visual scanning is more important than column comparison. Keep column labels and units consistent. Place filters and Pagination around the table when needed.

**Behavior and content:** The application must actually reorder or refetch rows when sort changes; a sort indicator alone is insufficient. Preserve stable row identity. On narrow screens, retain readable content through the shared scroll region rather than compressing everything. Distinguish no records, no filter matches, loading, and load failure.

### Divider

**Page key:** `divider` · **Export:** `Divider` from Basics

**Use when:** Adjacent content groups need a stronger boundary than spacing alone, such as separating account details from destructive account actions.

**In context:** A settings panel can use one divider before “Delete workspace,” making its distinct purpose visible without boxing every field.

**Choose and compose:** Start with meaningful headings and spacing. Use dividers at real changes of subject or action scope. Repeated lines between every paragraph or control add noise without explaining structure.

**Behavior and content:** A divider provides separation, not a section name or interaction. Keep it aligned with the content it divides. Do not use it as a fake progress track, loading indicator, or focus boundary.

### Keyboard Shortcut

**Page key:** `kbd` · **Export:** `Kbd`

**Use when:** A real keyboard shortcut can speed up an action users already understand.

**In context:** A command launcher can show the supported shortcut next to “Search commands.” A save action can advertise its shortcut without requiring the user to memorize it.

**Choose and compose:** Keep the ordinary clickable action available. Display platform-appropriate modifiers and key names. Place the shortcut beside its action, not as an unexplained string of symbols.

**Behavior and content:** Kbd styles key names; it does not register a keyboard handler. Only advertise shortcuts that the application implements. Avoid intercepting typing or established browser commands unexpectedly, and describe combinations clearly enough to be understood when read aloud.

### Progress Bar

**Page key:** `progress-bar` · **Export:** `ProgressBar`

**Use when:** The user is waiting for work with measurable completion, such as uploading files, generating assets, or exporting a report. The horizontal form leaves room for a task label and useful detail.

**In context:** An export panel shows “Exporting 12 assets” and progress based on completed work. After processing finishes, it replaces the progress state with a download action or a recoverable error.

**Choose and compose:** Supply a value and maximum when completion is known. Omit the value for indeterminate work; never simulate accuracy with an invented percentage. Use WorkflowSteps for named stages, Spinner for a small unknown wait, and ProgressRing for compact completion summaries. Static storage capacity is a meter use case, not task progress.

**Behavior and content:** Label the operation and explain the measure when necessary: files processed is not elapsed time remaining. Keep long-running work close to relevant cancel or retry actions. Reaching 100% must not imply success while another stage can still fail. Provide a final outcome separately.

### Progress Circle / Progress ring

**Page key:** `progress-ring` · **Export:** `ProgressRing`

**Use when:** A compact, known completion ratio belongs beside a named task or summary, such as “8 of 10 onboarding tasks complete.”

**In context:** An onboarding summary places the ring next to its title and a description explaining what remains. Users open a stepper or checklist to see the individual requirements.

**Choose and compose:** Use ProgressBar for a long-running operation whose detail deserves a row. Use a stepper when sequence matters. The current ring requires a value; use Spinner for unknown progress. Avoid repeated rings when users primarily need to compare exact values across many records.

**Behavior and content:** Include a meaningful label and denominator or explanatory description. Do not equate checklist completion with time remaining. Although a ring can visually resemble a capacity gauge, this component exposes progressbar semantics; use a future shared meter component for static quota or capacity readings.

### Rating

**Page key:** `rating` · **Export:** `Rating`

**Use when:** Users express a subjective score on a short, ordered scale, such as rating the usefulness of a template after using it.

**In context:** Ask “How useful was this template?” after the user completes the task, with a consistent five-point scale and an optional explanation field nearby.

**Choose and compose:** Use RadioGroup when every option needs a distinct verbal meaning, such as satisfaction levels. Use a numeric field for objective quantities. Avoid using interactive rating controls as an approximate visualization of unrelated metrics.

**Behavior and content:** Explain the scale and how a response is saved. Keep a genuine unanswered state where needed; do not preselect a flattering score. The current control is for choosing whole-number ratings, not displaying fractional aggregate reviews. A static average needs appropriate text and display semantics.

## Feedback

### Alert

**Page key:** `alert` · **Export:** `Alert`

**Use when:** An important message belongs beside the content it explains: a validation summary, a delayed export, a save result, or a condition that changes the user's next step.

**In context:** An import form shows “Two columns need mapping” directly above the affected controls and offers “Review columns.” A completed save can show a quieter confirmation in the same area.

**Choose and compose:** Choose tone by meaning and surface strength by prominence. Filled treatment suits an exceptional message requiring attention; light and stroke treatments integrate with ordinary content. A larger variant suits a message with explanation and an action. Use Banner for workspace-wide conditions, Toast for brief feedback, and Dialog when a response is required before proceeding.

**Behavior and content:** Explain what happened and what can be done. Use live announcement deliberately for newly appearing important messages; do not repeatedly announce every render. An alert should not take keyboard focus simply to be noticed. [Alert pattern, W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)

### Notification

**Page key:** `notification` · **Export:** `Notification`

**Use when:** A completed event or update deserves a durable message with a follow-up action, such as an export becoming ready or a review being assigned.

**In context:** “Export complete” includes the file context and a “Download” action. It remains available long enough for the user to act, even if another task currently has their attention.

**Choose and compose:** Use the shared white surface and black text treatment. Use Banner for an ongoing workspace condition and Alert for a problem inside the current task. A Notification is an individual message surface; it does not itself provide an inbox or notification history.

**Behavior and content:** The product owns message persistence, read state, dismissal, and action outcomes. Do not treat dismissing a notification as resolving its underlying issue. Keep essential results discoverable elsewhere when the message can be closed.

### Toast

**Page key:** `toast` · **Export:** `Toast`

**Use when:** Brief feedback confirms an action without interrupting the current activity, such as saving a draft or changing a setting.

**In context:** After a successful rename, “Project renamed” confirms the result while the updated title remains visible. Failure to rename also needs a recovery path near the editable title.

**Choose and compose:** Use FeedbackButton for a small action whose confirmation fits inside the control. Use Alert or Notification when information must remain available or requires a follow-up decision. Avoid making a toast the only place to discover a failed submission.

**Behavior and content:** Keep messages concise and avoid repeated announcements for the same event. The component provides dismissal but does not schedule its own expiry or manage a queue. If the application adds timed dismissal, essential information and actions must remain accessible through a persistent surface.

### Tooltip

**Page key:** `tooltip` · **Export:** `Tooltip`

**Use when:** A short, optional explanation helps users understand a term or control without expanding the whole page.

**In context:** Beside an export setting, a help trigger explains how the setting affects image quality. The setting's name and required instructions remain visible without opening the tooltip.

**Choose and compose:** Use Hint for field requirements and persistent instructions. Use Popover for links, controls, or longer contextual information. A tooltip should not contain a form, a decision, or the only explanation of an error.

**Behavior and content:** Write one concise thought and avoid repeating the trigger label. Ensure equivalent help is available to touch users when it is necessary to complete the task. The current Tooltip supplies its own labelled help button; arbitrary child-trigger composition is not part of its public API.

### Spinner

**Page key:** `spinner` · **Export:** `Spinner`

**Use when:** An operation is running but its completion cannot be measured, and the surrounding area can remain compact.

**In context:** “Loading preview” appears in the preview region while an asset is fetched. The editor around it can stay usable if that operation does not block editing.

**Choose and compose:** Use Button's busy state for an action already represented by a button. Use Skeleton when the future content shape is predictable. Use ProgressBar when measurable progress is available.

**Behavior and content:** Name the actual operation. Replace the spinner with content, an empty state, or a recoverable error when work ends. Do not leave an indefinite spinner after a failed request or cover unrelated controls merely because one region is loading.

### Skeleton

**Page key:** `skeleton` · **Export:** `Skeleton`

**Use when:** Text-like content is loading and preserving its approximate space makes the page easier to follow.

**In context:** A details panel reserves several lines while its description loads, preventing surrounding content from jumping when the response arrives.

**Choose and compose:** Match the placeholder's extent to the expected content. The current component provides placeholder lines; it is not a general builder for avatars, charts, or every possible card shape. Use Spinner when no meaningful content shape is known.

**Behavior and content:** Identify the loading region and remove the placeholder when the request resolves. Empty responses need an empty state, and failures need an error explanation. Avoid showing a new skeleton over readable content during a minor refresh when that content can remain useful.

### Empty state

**Page key:** `empty-state` · **Export:** `EmptyState`

**Use when:** A collection or workspace has no content to show and the reason or next step needs explanation.

**In context:** A first-use campaign list says “No campaigns yet” and offers “Create campaign.” A filtered list says “No campaigns match these filters” and offers “Clear filters.”

**Choose and compose:** Tailor the message to first use, no search matches, unavailable access, or a legitimately empty result. Use Alert for a failed load rather than implying the collection is empty. Place the empty state in the region where results would normally appear.

**Behavior and content:** Offer an action the current user can actually perform. Avoid repeated onboarding instructions for experienced users viewing a narrow filter. Keep the title specific and the description focused on how to proceed.

## Forms and selection

### Form

**Page key:** `form` · **Export:** `Form`

**Use when:** Related inputs contribute to one submission, such as creating a workspace or saving campaign settings.

**In context:** A campaign form groups its title, launch date, and distribution settings, then ends with FormActions. Each field explains its own constraints.

**Choose and compose:** Group fields by the user's mental model and place dependent questions after the choice that reveals them. Use a multi-step workflow only when task complexity justifies dividing the work. Do not wrap every independent immediate setting in a large save form.

**Behavior and content:** Give the form a meaningful name. Define submission, validation, and persistence in the application; Form supplies structure rather than a form-state engine. Preserve values on failure and make invalid fields easy to find. Avoid nested forms.

### Input / Text field

**Page key:** `text-field` · **Export:** `TextField`

**Use when:** The user enters a short, single-line value such as a project name, email address, or reference identifier.

**In context:** “Campaign name” includes a brief naming rule beneath the field. A placeholder can show an example, while the persistent label continues to identify the value after typing.

**Choose and compose:** Use TextArea for prose, SearchField for queries, PasswordField for secrets, and a selection control when only predefined values are valid. Use readOnly for a value people should still inspect or copy; disabled means temporarily unavailable.

**Behavior and content:** Match native type and autocomplete to the data. Explain the expected format before submission when it is not obvious. Error text should identify a correction, such as “Enter a work email address,” and remain associated with the field. Avoid errors while the user is still making an ordinary incomplete entry.

### Search field

**Page key:** `search-field` · **Export:** `SearchField`

**Use when:** A query narrows or locates content, such as campaigns, people, files, or documentation pages.

**In context:** “Search campaigns” sits above the campaign results. Clearing it restores the unfiltered results while preserving unrelated filter selections.

**Choose and compose:** Use Combobox when the result is one selected value, and CommandMenu when the result is an action. Keep search scope explicit; a search of the current project should not imply a workspace-wide search.

**Behavior and content:** Choose whether results update while typing or on submission, and make that behavior consistent. The application owns filtering, request timing, stale responses, result count, and empty results. Preserve the query during navigation when that helps users return to their work.

### Password field

**Page key:** `password-field` · **Export:** `PasswordField`

**Use when:** The user enters a secret, such as a sign-in password or a replacement password in account settings.

**In context:** A new-password field explains requirements before entry and allows the user to reveal the value while checking it. A sign-in field supports the browser's existing-password autofill.

**Choose and compose:** Use appropriate autocomplete for current versus new passwords. Do not substitute DigitInput for an ordinary password or block paste and password-manager entry.

**Behavior and content:** Keep the visible label and validation message clear. The application handles authentication and saving; the field's visibility toggle only changes local presentation. Avoid exposing the secret in confirmation text, notifications, or error messages.

### Textarea

**Page key:** `textarea` · **Export:** `TextArea`

**Use when:** The user writes multiple lines: a campaign brief, comment, rationale, or description.

**In context:** A brief field explains the information needed—audience, goal, and key message—rather than merely repeating “Enter brief.” Its initial height reflects the expected answer length.

**Choose and compose:** Use TextField for short values and InlineText for small edits within existing content. Use embedded presentation only inside another labelled input surface. Choose a dedicated editor when structured rich text is essential.

**Behavior and content:** Explain actual format support and limits. A textarea does not add Markdown rendering or rich-text behavior by itself. Preserve drafts after failures, allow readable wrapping, and keep multiline typing distinct from any submission shortcut supplied by the surrounding workflow.

### Checkbox

**Page key:** `checkbox` · **Export:** `Checkbox`

**Use when:** Choices are independent: include motion, select several records, or agree to a specific condition before submitting a form.

**In context:** An export form lets the user choose PDF and PNG independently. In a bulk-action table, a parent checkbox reflects whether none, some, or all rows are selected.

**Choose and compose:** Use RadioGroup for exactly one option and Toggle for an immediate on/off setting. Use indeterminate only for a mixed collection state, not as an ambiguous third answer.

**Behavior and content:** State the option positively so checked has a clear meaning. The application must synchronize parent and child selection and define whether select-all affects the current page or all results. Make consent and optional preferences explicit rather than silently preselecting them.

### Radio group

**Page key:** `radio-group` · **Export:** `RadioGroup`

**Use when:** The user must choose one option and benefits from seeing every alternative at once, such as export orientation or a delivery method.

**In context:** A format choice shows Square, Portrait, and Landscape together, allowing quick comparison without opening a menu.

**Choose and compose:** Use Select when the list would occupy too much space, and SegmentedControl for a small immediate mode change such as Grid/List. Use customOption only when a genuine “Other” answer is meaningful and can be handled by the product. Use `variant="tags"` for a short set of choices that reads better as wrapping tags, such as a goal; it keeps radio behaviour, and its custom answer field appears only while that option is selected.

**Behavior and content:** Give the set a question or descriptive label and keep option wording parallel. Explain why a necessary option is unavailable. Choose a default only when it is safe and helpful; do not disguise a required conscious choice with an arbitrary preselection.

### Switch / Toggle

**Page key:** `toggle` · **Export:** `Toggle`

**Use when:** A persistent setting can be understood as on or off and takes effect immediately, such as email notifications or a preview mode.

**In context:** “Email notifications” toggles delivery preferences. If saving fails, the interface restores the previous state and explains the failure beside the setting.

**Choose and compose:** Use Checkbox when the choice is collected for a later form submission. Use a Button for a one-time command such as sending an email. A potentially destructive operation should not be disguised as a casual preference switch.

**Behavior and content:** Keep the label stable across states and describe the enabled condition. The application owns saving, pending state, rollback, and feedback. Avoid contradictory wording such as an enabled switch labelled “Disable notifications.”

### Select family

**Page key:** `dropdowns` · **Exports:** `Select`, `Combobox`, `MultiSelect`

**Use when:** A field chooses values from a defined set. Decide first whether the answer is one item or several, and whether users need to search.

**In context:** A campaign form can use Select for priority, Combobox for one client in a larger directory, and MultiSelect for distribution channels. These are different data questions even though all can reveal choices in a popup.

**Choose and compose:** Prefer RadioGroup for a short list that benefits from visible comparison. Use Menu for commands such as duplicate or delete; a command menu does not represent a saved form value. The following three sections belong together on the current combined page but should remain separately identifiable.

**Behavior and content:** Keep the saved value, displayed label, available options, and form submission synchronized. Represent loading, unavailable choices, and no matching results explicitly. Do not use a placeholder as the only field label.

#### Select

**Export:** `Select` · **Publishing home:** `dropdowns`

**Use when:** One value must come from a known list that does not need search, such as a publishing channel or a priority level.

**In context:** A report configuration asks for a single output format. The selected label stays visible after the popup closes.

**Choose and compose:** Use RadioGroup when seeing the alternatives improves the decision. Use Combobox when locating a particular option becomes difficult. An optional custom answer is appropriate only when the product accepts and validates that answer.

**Behavior and content:** Define whether an empty selection is allowed. Use instructions to explain consequences that option names cannot capture. Handle removed or unavailable saved options deliberately instead of silently selecting the first available value.

#### Combobox

**Export:** `Combobox` · **Publishing home:** `dropdowns`

**Use when:** The user selects one known item from a list large enough to benefit from typing, such as choosing a client or project.

**In context:** Typing part of a client's name narrows the choices; selecting a match stores that client's identity, not the transient search text.

**Choose and compose:** Use SearchField when the query should return a results view rather than a selected value. The current Combobox selects existing options; it is not free-form creation or an async directory service.

**Behavior and content:** Keep labels distinguishable when names are similar. The application owns option loading and any remote query behavior. If the desired item is absent, explain a separate next step rather than pretending unmatched text has been saved as a valid selection.

#### MultiSelect

**Export:** `MultiSelect` · **Publishing home:** `dropdowns`

**Use when:** Several independent values can be selected from a defined set, such as regions, channels, or reviewers.

**In context:** A campaign filter lets users choose several channels, then shows the selections as removable tags so the filter remains understandable when the popup is closed.

**Choose and compose:** Use visible Checkboxes when the list is short and every option benefits from exposure. The current MultiSelect presents a checkbox list with tags; it does not include search or bulk selection. Large directories need an enhanced shared pattern before adoption.

**Behavior and content:** Explain whether zero selections means “All” or “None.” Keep removal and checkbox state synchronized, preserve unavailable selected values when appropriate, and state any selection limit before users encounter it.

### Datepicker

**Page key:** `date-picker` · **Export:** `DatePicker`

**Use when:** A user chooses a calendar date, such as a launch day, due date, or reporting cutoff.

**In context:** A launch-date field limits selection to dates permitted by the campaign schedule and explains the earliest allowed day.

**Choose and compose:** Use explicit date fields for precise calendar choices. A relative preset such as “Last 7 days” may suit a reporting filter better, but requires separate product logic. Do not imply that a single date field supports ranges, recurring schedules, or time selection.

**Behavior and content:** Explain constraints beside the field. Keep date-only values distinct from timestamps so timezone conversion does not shift the chosen calendar day. The application owns scheduling rules and validation against other fields; a selected date alone does not schedule work.

### Number stepper

**Page key:** `number-stepper` · **Export:** `NumberStepper`

**Use when:** The user adjusts a bounded quantity and often changes it by a small increment, such as copies, seats, or generated variations.

**In context:** An export configuration offers “Number of variations” with direct numeric entry and increment/decrement controls. It explains any practical limit.

**Choose and compose:** Use Slider for approximate tuning across a scale, or a plain numeric field when users usually type large, precise values. NumberStepper edits a quantity; WorkflowSteps tracks stages in a process.

**Behavior and content:** State units and choose sensible minimum, maximum, and increment values. Keep the displayed value consistent with the quantity actually submitted. Explain unavailable increments at a domain limit rather than allowing the resulting request to fail without context.

### Slider

**Page key:** `slider` · **Export:** `Slider`

**Use when:** Adjusting a value relative to a known range is more important than entering an exact number, such as preview zoom or image quality.

**In context:** An image editor lets the user tune quality while seeing the result and the current percentage nearby.

**Choose and compose:** Set bounds and increments that match the domain. Use NumberStepper or a numeric field for exact quantities, especially when small differences matter. Use RangeSlider for a lower and upper bound together.

**Behavior and content:** Show meaningful units and describe what the ends of the range mean. Preserve keyboard adjustment and keep the numeric value readable. The application decides whether to preview changes immediately or apply them later; expensive processing should not unexpectedly restart on every small movement.

### Range slider

**Page key:** `range-slider` · **Export:** `RangeSlider`

**Use when:** Users define an interval within known bounds, such as a budget or duration filter.

**In context:** A project search narrows results to budgets between a minimum and maximum amount. Both selected endpoints remain visible with the same unit.

**Choose and compose:** Use this for exploratory filtering; provide precise entry when the task depends on exact boundaries. Use separate date fields for calendar intervals. A range slider should not be used to indicate work completed.

**Behavior and content:** Give each endpoint a distinct name and keep lower and upper values ordered. Explain whether the endpoints are inclusive when it matters. The current component coordinates two range inputs; do not promise a single shared-track interaction that the implementation does not provide.

### Color Picker

**Page key:** `color-picker` · **Export:** `ColorPicker`

**Use when:** Choosing an actual color is part of the user's work, such as configuring a brand accent or editing a visual asset.

**In context:** A brand settings panel provides common presets and a visible hex value that can be copied from an existing brand specification.

**Choose and compose:** Use named semantic styles when users are assigning meaning, such as task status, rather than asking them to invent colors for that meaning. The current picker supports solid hex colors; gradients and opacity are separate capabilities.

**Behavior and content:** Keep the exact value visible and validate manual entry. Show the effect of the choice in its real context. The application must preserve readable text and focus states when the selected color affects controls; selecting a color does not certify its contrast.

### Digit Input

**Page key:** `digit-input` · **Export:** `DigitInput`

**Use when:** A short, fixed-length numeric code benefits from separated positions, such as a verification code.

**In context:** A verification step identifies where the code was sent, displays the expected number of cells, and keeps resend and correction guidance nearby.

**Choose and compose:** Use a normal field for variable-length identifiers, phone numbers, or alphanumeric codes. A segmented layout should not prevent pasting a whole code or using platform autofill; verify those capabilities before choosing it for production authentication.

**Behavior and content:** Use a string so leading zeros retain meaning. Keep expiry, resend, submission, and server validation in the application. The current control exposes basic digit cells and does not supply a complete verification flow. Preserve usable cell widths and a layout that fits narrow screens.

### File Upload / File dropzone

**Page key:** `file-dropzone` · **Export:** `FileDropzone`

**Use when:** Selecting one or more files is a main step, such as importing a contact list or uploading campaign assets.

**In context:** An import panel explains accepted formats and per-file limits before selection. Chosen files appear in FileList; actual upload state replaces idle instructions during transfer.

**Choose and compose:** Keep the file-picker button available alongside drag and drop. Use AttachmentArea for optional files accompanying a note. Use meaningful state feedback for uploading, completed, and failed work.

**Behavior and content:** FileDropzone selects and checks files locally; the application performs the upload, repeats validation at the receiving service, and supplies progress and recovery. Display only measured progress. Make clear whether a failed selection rejected the whole batch or individual files, and preserve valid selections when recovery permits.

### File list

**Page key:** `file-list` · **Export:** `FileList`

**Use when:** Users need to review files selected for a task or already associated with a record.

**In context:** Below an upload area, a list shows filenames and sizes so users can catch an accidental selection before submitting.

**Choose and compose:** Add removal only when it has a defined meaning. Removing a pending attachment is different from deleting an uploaded file for everyone. Use a richer table when users need to compare dates, owners, versions, or transfer status.

**Behavior and content:** Keep filenames legible and identify each remove action with its file. The current list does not automatically provide downloads, previews, upload state, or storage deletion. Implement those responsibilities through shared components and product logic when the context requires them.

### Attachment area

**Page key:** `attachment-area` · **Export:** `AttachmentArea`

**Use when:** Files support a primary writing task, such as adding evidence to a note or a document to a prompt.

**In context:** A reviewer writes a comment, attaches a reference PDF, sees the selected file above the action row, and submits both as one contribution.

**Choose and compose:** Compose the editor, file summary, and submit action using shared components. Use FileDropzone when collecting files is the primary task. Do not introduce a second competing upload surface inside the same composer.

**Behavior and content:** Explain file restrictions and preserve the note when attachment selection or submission fails. The application owns the selected-file collection and uploading. Disabling attachment intake does not automatically make all composed child controls read-only; coordinate the state of the entire task.

### Inline text editing

**Page key:** `inline-text` · **Export:** `InlineText`

**Use when:** A small, existing value can be edited directly in its context, such as renaming a project or adjusting a short description.

**In context:** A project title becomes editable without opening a separate settings page. Saving updates the title; failure leaves the draft available for correction or retry.

**Choose and compose:** Use a Form for several dependent fields and TextArea for substantial writing. Avoid immediate inline saving for changes whose consequences require review before committing.

**Behavior and content:** Make editability discoverable and label the editable value. Enter saves, Shift+Enter inserts a line, Escape cancels, and blur attempts to save. Explain this when unfamiliar users could lose their place. The application owns persistence and must not report success before saving completes.

### Label

**Page key:** `label` · **Export:** `Label`

**Use when:** A standalone input needs a persistent visible name. Prefer the built-in label prop when the shared field already provides one.

**In context:** A composed settings control has the label “Workspace name,” a separate instruction about naming rules, and an input connected to that label.

**Choose and compose:** Labels identify the value; Hint explains constraints. Placeholder examples supplement both. Keep labels brief and use consistent terminology across summaries, forms, and errors.

**Behavior and content:** Associate standalone labels with their input. A visible required marker communicates a requirement but does not enforce it; set the corresponding input behavior and validation. Avoid adding a second visible label around a component that already renders its own.

### Hint

**Page key:** `hint` · **Export:** `Hint`

**Use when:** A field needs short, persistent guidance or a nearby correction message.

**In context:** Under a project slug, show “Use lowercase letters and hyphens.” After invalid input, explain exactly what needs to change.

**Choose and compose:** Prefer a field's instructions and error props when available, since they keep support text attached to the correct control. Use Hint for custom compositions. Use Tooltip only for optional supplementary explanation.

**Behavior and content:** Answer a likely question rather than restating the label. Associate standalone support text with the control and keep it available while typing. Danger styling alone does not connect a message to a field or announce it; the composed control must supply the appropriate relationship.

## Layout and content organization

### Panel

**Page key:** `panel` · **Export:** `Panel`

**Use when:** A coherent set of content and controls needs a named boundary, such as campaign details, an activity summary, or a documentation example.

**In context:** A “Campaign assets” panel contains filters, the asset list, and actions scoped to that collection. Unrelated account actions live outside the panel.

**Choose and compose:** Use split presentation when separating the header from the body clarifies scope. Use compact density for dense operational content. Prefer headings and spacing when a visible frame adds no useful grouping.

**Behavior and content:** Choose the heading level from the page hierarchy. Keep titles descriptive and actions scoped to the panel. Panel is a container, not a clickable card, disclosure, or dialog. Avoid nested panels whose competing borders make relationships harder to read.

### Accordion

**Page key:** `accordion` · **Export:** `Accordion`

**Use when:** Users need to inspect selected sections of related information without reading every section at once, such as FAQs or optional configuration details.

**In context:** An export help area exposes topic summaries and expands the relevant explanation in place. Multiple-open mode lets users compare two answers.

**Choose and compose:** Use single-open behavior for focused inspection and multiple-open behavior when comparison matters. Use normal headings for content everyone must read, and Tabs for distinct peer views. Avoid hiding required form fields or blocking errors inside an unexplained collapsed section.

**Behavior and content:** Write summaries that predict the content. Keep the right-side affordance aligned with the heading, preserve readable body text, and accommodate long answers. Opening a section should not unexpectedly jump the user to another location. Respect reduced-motion preferences for expansion transitions.

### Segmented Control

**Page key:** `segmented-control` · **Export:** `SegmentedControl`

**Use when:** One option from a small visible set changes the current mode or presentation immediately, such as Grid/List or Day/Week/Month.

**In context:** In an asset browser, choosing List changes the presentation of the same results while preserving the current query and selection.

**Choose and compose:** Use Tabs for separately labelled content panels, RadioGroup for a form decision needing comparison, and ButtonGroup for commands. Choose default or compact density according to the surrounding controls; document those sizes as separate examples without changing their meaning.

**Behavior and content:** Label the set and keep option names parallel and short. Preserve one selected value and a clear keyboard path. If option text or count makes the control difficult to scan, switch to a more spacious selection pattern rather than squeezing or abbreviating the labels.

### Tab Menu Horizontal / Tabs

**Page key:** `tabs` · **Export:** `Tabs`

**Use when:** Peer content sections share one context and the user benefits from switching between them, such as Overview, Activity, and Files within a project.

**In context:** The project header remains stable while the selected tab changes the content panel. The tab names tell users where to find information without opening every panel.

**Choose and compose:** Use SegmentedControl for modes of the same content and NavigationList for distinct destinations in the application. Choose compact tabs when the surrounding content is dense. Keep content-panel tabs distinct from the component's compatibility support for segmented options.

**Behavior and content:** Preserve relevant work when switching, make selection clear, and connect tabs to their panels. If a view needs a shareable URL, the application must synchronize it. Tab semantics describe layered content panels rather than arbitrary navigation. [Tabs pattern, W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

### Tab Menu Vertical

**Page key:** `tab-menu-vertical` · **Export:** `TabMenuVertical`

**Use when:** A persistent vertical list of related sections makes a larger settings or details surface easier to scan.

**In context:** Workspace settings presents General, Members, and Integrations beside the selected content. The section list remains visible while users edit one topic.

**Choose and compose:** Use NavigationList when entries represent separate routed destinations. Use horizontal Tabs when the number and length of labels fit a compact row. On narrow screens, retain access to all section labels without compressing the content column beyond readability.

**Behavior and content:** Preserve or clearly resolve unsaved work when changing sections. The current component switches content through buttons; do not assume it includes the full keyboard and semantic behavior of the separate Tabs component. Validate that behavior before presenting it as an equivalent orientation of Tabs.

## Navigation and workflow

### Breadcrumbs

**Page key:** `breadcrumbs` · **Export:** `Breadcrumbs`

**Use when:** A page belongs to a meaningful hierarchy and users may need to move to its parents.

**In context:** “Projects / Nordic spring / Brief” shows how the brief relates to its project. Earlier levels link to their destinations; the last label identifies the current page.

**Choose and compose:** Use NavigationList for the main application structure and WorkflowSteps for a sequence of tasks. Breadcrumbs describe location, not browser history, completion, or the sequence in which someone happened to open pages.

**Behavior and content:** Keep names consistent with destination headings. Omit meaningless structural levels. Preserve the shared link underline and focus treatment. Long names may wrap or require a deliberate truncation strategy, but users must retain enough context to identify the current item and its parent.

### Navigation list

**Page key:** `navigation-list` · **Export:** `NavigationList`

**Use when:** Users need stable access to pages or major sections of an application.

**In context:** A workspace sidebar lists Campaigns, Assets, and Settings with one current destination. Project-specific navigation can form a separately labelled group.

**Choose and compose:** Use links for destinations and Menu for contextual commands. Use Tabs for peer content panels within one view. Maintain consistent ordering; the component documentation sidebar uses A–Z ordering within its established groups.

**Behavior and content:** Use clear destination names and one current item per navigation context. Provide real href values and keep selected state synchronized with routing. Icons reinforce labels. Do not rely on a navigation list alone to define page access or enforce permissions.

### Pagination

**Page key:** `pagination` · **Export:** `Pagination`

**Use when:** Users browse a finite result set in pages and benefit from a stable position, such as an audit log or campaign directory.

**In context:** A result table shows the total count and current page. Moving to another page retains the current filters and sorting.

**Choose and compose:** Use Pagination when returning to a particular range matters. A small list may need no pagination at all. DotStepper represents position in a short sequence, while WorkflowSteps represents task stages; neither replaces result pagination.

**Behavior and content:** Keep page and page count consistent after filtering or deletion. The application fetches or slices results, handles loading and errors, and manages the URL when needed. Make the new result range discoverable to keyboard and assistive-technology users without unexpectedly moving focus on every update.

### Horizontal Stepper / Workflow steps

**Page key:** `workflow-steps` · **Export:** `WorkflowSteps`

**Use when:** A process has named stages and users need to understand both position and completion, such as Brief, Review, and Publish.

**In context:** Campaign setup shows the current stage, permits returning to completed work, and makes Publish unavailable until required checks are satisfied.

**Choose and compose:** Use horizontal orientation for a short sequence with concise labels. Choose vertical orientation or VerticalStepper for longer explanations. Use ProgressBar for measurable background work and Tabs for sections that have no progression or completion relationship. NumberStepper changes a quantity and serves a different task.

**Behavior and content:** Keep current, complete, and disabled states distinct. Completion comes from valid application data, not from visiting a stage. The application owns validation and transition rules. Keep descriptions under their headings and marker alignment consistent, so one longer description does not suggest a different stage hierarchy.

### Vertical Stepper

**Page key:** `vertical-stepper` · **Export:** `VerticalStepper`

**Use when:** A staged process needs persistent names and, when useful, explanations alongside the work. Typical contexts are onboarding, setup, and review preparation.

**In context:** A workspace setup flow lists Create account, Review details, and Finish setup. The description variant tells users what each stage requires; the header-only variant suits returning users who already understand the process.

**Choose and compose:** Use descriptions when stage names alone cannot explain the task. Keep headers only when the sequence is clear. Use WorkflowSteps when disabled future steps are required by the current API. Use a checklist for tasks that can be completed independently without a meaningful order.

**Behavior and content:** Store current stage and completion separately. Preserve data when users return to earlier stages. VerticalStepper's current API does not expose a disabled state per step, so do not treat its styling as a validation gate. Choose or enhance the shared component before using it for a strictly locked sequence.

### Dot Stepper

**Page key:** `dot-stepper` · **Export:** `DotStepper`

**Use when:** A short, low-complexity sequence needs a compact position indicator and the current screen already explains the content.

**In context:** A short optional introduction shows which screen is active while its heading supplies the topic. Visible next/back actions remain available.

**Choose and compose:** Use a labelled stepper for processes where stage names, requirements, or errors matter. Avoid dots for long workflows or for navigating an arbitrary number of result pages.

**Behavior and content:** Give every position a meaningful accessible name and keep selection synchronized with the displayed screen. The current dots are buttons; connect their actions if shown as interactive. Do not imply restricted transitions or independent completion states: the component derives its earlier-step treatment from the current position.

## Overlays and contextual actions

### Dropdown / Menu

**Page key:** `menu` · **Export:** `Menu`

**Use when:** An object has several contextual commands that do not all need permanent visibility, such as Edit, Duplicate, Download, and Delete.

**In context:** A campaign row has a “More campaign actions” trigger. Frequent primary work remains visible; less common commands are available in the menu.

**Choose and compose:** Use Select for choosing a saved value and NavigationList for normal navigation. Use ButtonGroup when a few related actions deserve to remain visible. The current menu is a flat command list, not a nested application menubar.

**Behavior and content:** Use verb-led item labels and mark destructive consequences clearly. An icon-only trigger still needs an accessible name identifying its scope. Explain unavailable capabilities where users can discover the reason. Selecting a destructive command may open a separate confirmation; opening the menu must not execute it.

### Modal / Dialog

**Page key:** `dialog` · **Export:** `Dialog`

**Use when:** A focused decision or short task needs to temporarily interrupt the current flow, such as confirming workspace deletion or editing a small set of critical details.

**In context:** Before deleting a workspace, the dialog names it, explains the consequence, and gives explicit cancel and delete actions.

**Choose and compose:** Use InlineConfirmation for a short localized confirmation, Popover for contextual controls, and a dedicated page for long tasks or extensive content. Avoid opening modal dialogs for routine success messages.

**Behavior and content:** Make the title and action labels explain the decision. Preserve a clear close or cancel path, meaningful focus on opening, and a sensible return destination on closing. The application owns submission and whether successful completion closes the dialog. Resolve unsaved work intentionally and avoid nested dialogs where a single clear task is possible.

### Drawer

**Page key:** `drawer` · **Export:** `Drawer`

**Use when:** Supporting navigation or a focused detail task can enter from the edge while retaining visual context of the underlying page.

**In context:** On a narrow viewport, a navigation drawer exposes workspace destinations. In an operational view, a drawer may present a short record-editing task.

**Choose and compose:** The current Drawer is modal: background content is not simultaneously interactive. If users must compare and edit the underlying page at the same time, use a persistent panel or a dedicated split layout. Use Dialog for a compact central decision.

**Behavior and content:** Provide a clear title and close action. Preserve readable content, reachable actions, and appropriate scrolling on small screens. The application owns draft retention and any warning before closing with unsaved changes. Do not choose a drawer simply to avoid deciding where a complex feature belongs.

### Popover

**Page key:** `popover` · **Export:** `Popover`

**Use when:** A small amount of contextual content or a few controls should appear near their trigger, such as display options or a compact filter panel.

**In context:** An asset view opens display preferences beside the view controls, allowing the user to adjust local presentation without leaving the collection.

**Choose and compose:** Use Tooltip for a brief optional explanation, Menu for a list of commands, and Dialog for a substantial task or consequential decision. Use the field-like trigger only when it represents a field interaction in the surrounding composition.

**Behavior and content:** Name the trigger by what will open. Keep the content short enough to remain usable within the viewport. Define whether changes apply immediately or require an explicit action, and keep closing behavior from silently discarding substantial work. Preserve keyboard access to both trigger and contents.

### Command Menu

**Page key:** `command-menu` · **Export:** `CommandMenu`

**Use when:** Experienced users benefit from searching a set of application actions, such as creating a project or opening settings.

**In context:** A visible “Search commands” launcher supplements normal navigation. Typing narrows the available commands, and selecting one runs the identified action.

**Choose and compose:** Use Menu for a short object-specific action list, SearchField for searching content, and Combobox for selecting a field value. Keep core tasks discoverable through the ordinary interface so the command menu remains an accelerator.

**Behavior and content:** Use distinct action names and expose only actions appropriate to the current context. The current implementation provides basic label filtering and selection; global shortcuts, command grouping, a complete keyboard selection model, and robust dialog focus behavior need separate verification or shared-component work before being promised.

## Basics used in component composition

These entries belong in Basics guidance rather than new Components pages. They cover runtime primitives exported by `src/atomic/atoms/index.ts`; token data and TypeScript types are not separate controls.

### Text

**Export:** `Text` · **Publishing home:** Typography

**Use when:** Presenting body copy, descriptions, metadata, or inline labels within a composition.

**In context:** A settings panel uses body text for its explanation and smaller secondary text for supplemental detail. A status description remains readable and does not shrink simply because the interface is dense.

**Choose and compose:** Use established text roles instead of arbitrary font sizes. Use Heading for real sections, Label for field names, and TextAction for interactions. A heading-like visual variant on Text does not create a semantic heading.

**Behavior and content:** Choose paragraph or inline markup according to the sentence structure. Use secondary tone for supporting information, never to hide an important requirement. Preserve readable line lengths, natural wrapping, and enough contrast at zoom. Keep instructions specific to the decision the user is making.

### Heading

**Export:** `Heading` · **Publishing home:** Typography

**Use when:** Naming a page, section, or subsection so users can scan and navigate the content structure.

**In context:** A documentation page has a page heading, section headings for Examples and Usage guidance, and lower-level headings for individual examples.

**Choose and compose:** Select the semantic level from the hierarchy and the visual variant from the intended prominence. Use Text for emphasis that does not introduce a section. Avoid skipping hierarchy levels merely to obtain a smaller font.

**Behavior and content:** Make headings concise and predictive. Keep related headings parallel, and name the topic rather than the visual container. A sequence of generic “Details” headings makes both scanning and assistive navigation harder.

### Icon

**Export:** `Icon` · **Publishing home:** Icons

**Use when:** A familiar symbol reinforces an action, status, or object type.

**In context:** A paperclip supports an attachment action and a warning icon reinforces an error message. The visible label or accessible name supplies the actual meaning.

**Choose and compose:** Use the shared icon set and sizes. Prefer labelled controls for unfamiliar actions. Reuse the same symbol for the same meaning across the product.

**Behavior and content:** An icon is not an interactive control. Put actions in Button or another appropriate component. Keep decorative icons out of the naming path and provide text for meaningful standalone information. Do not use shape or color as the only indication of a state.

### Stack and Inline

**Exports:** `Stack`, `Inline` · **Publishing home:** Layout

**Use when:** Arranging related content vertically or horizontally with shared spacing. Stack fits field groups and prose; Inline fits compact metadata and action rows.

**In context:** A panel stacks its heading, explanation, and content. A file row uses Inline for its icon, filename, and remove action.

**Choose and compose:** Use spacing to express relationships: closely related elements stay together, distinct sections receive more separation. Choose Grid when both columns and rows matter.

**Behavior and content:** Layout alone does not create grouping semantics or control behavior. Preserve a logical reading and focus order, allow text to wrap, and avoid fixed widths that force actions or labels outside their container.

### Grid and Container

**Exports:** `Grid`, `Container` · **Publishing home:** Layout

**Use when:** Grid organizes comparable items in columns; Container establishes the content area's width and alignment.

**In context:** A statistics collection can use equal-width columns inside the page container, then reduce the number of columns as available space narrows.

**Choose and compose:** Use shared responsive behavior and spacing rather than sizing for one screenshot. Keep prose in a readable measure and allow tables or complex controls the space they need.

**Behavior and content:** Preserve source order when columns change. Do not reorder interactive content visually in a way that contradicts keyboard navigation. A grid of items does not automatically become an ARIA grid or gain spreadsheet keyboard behavior.

### Surface

**Export:** `Surface` · **Publishing home:** Layout / Elevation

**Use when:** A composition needs the shared background, border, radius, or padding treatment without Panel's header structure.

**In context:** A compact confirmation region can use a surface to distinguish the revealed decision from its surrounding row.

**Choose and compose:** Use Panel when a named header, description, and header actions form a reusable group. Choose surface treatment according to hierarchy rather than adding elevation to every region.

**Behavior and content:** A surface does not imply that its whole area is clickable. Keep interactions in shared controls, and use borders and spacing consistently so passive containers are not mistaken for buttons.

### Scroll Area

**Export:** `ScrollArea` · **Publishing home:** Layout

**Use when:** A bounded region genuinely needs independent scrolling, such as a wide data table or an options list.

**In context:** A comparison table retains readable columns on a narrow screen and makes horizontal overflow available inside a named region.

**Choose and compose:** Prefer normal page flow for prose and ordinary forms. Avoid multiple nested scrolling regions that compete for the same gesture. Do not constrain content height solely to match a reference image.

**Behavior and content:** Give the region an understandable name, retain keyboard access, and make overflow discoverable. Important actions should not be clipped or stranded outside a scrollable region without a clear relationship to it.

### AtomsRoot

**Export:** `AtomsRoot` · **Publishing home:** Installation / Layout

**Use when:** Establishing the shared foundation for a product surface using this design system.

**In context:** The application root provides the atomic typography and token environment so fields, buttons, panels, and overlays share one visual language.

**Choose and compose:** Use the documented installation pattern and stylesheet. Additional foundations for isolated or portalled content should follow the library's existing composition rules.

**Behavior and content:** AtomsRoot supplies styling context, not a page landmark, navigation model, or accessibility guarantee. Use appropriate semantic elements and the shared controls inside it rather than treating the root wrapper as a substitute for them.

## Supplemental UI block guidance

These sections map to `blockContent.tsx`, not component records. They cover the three UI blocks currently documented in this worktree.

### Sidebar panel

**Block key:** `sidebar` · **Export:** `SidebarPanel`

**Use when:** A workspace needs a persistent navigation structure with a primary creation action, project access, and account controls.

**In context:** A campaign workspace places its main destinations above pinned and recent projects. Each project's menu offers actions affecting that project, while account controls remain clearly separate.

**Choose and compose:** Keep navigation destinations predictable and project actions contextual. Use the existing Drawer composition for narrow layouts when navigation cannot remain visible. Avoid adding unrelated status messages or dense form controls to the sidebar.

**Behavior and content:** The application owns routes, active destination, permissions, pinning, deletion, and account actions. Preserve discoverability when lists grow and give ambiguous project names enough context. Destructive project actions must identify the affected project.

### AI prompt input

**Block key:** `prompt-input` · **Export:** `PromptInput`

**Use when:** A user submits a written instruction, optionally with files, to start a generation or assistance task.

**In context:** A campaign assistant accepts a request and a brief document, shows the attachment near the editor, and keeps the send action easy to find.

**Choose and compose:** Use TextArea for ordinary form prose and AttachmentArea when a custom note composer is needed. Keep optional attachment controls subordinate to the writing task. Place selected attachments above the action row.

**Behavior and content:** Keep the draft and attachments available if sending fails. Make busy, disabled, and read-only states reflect the real workflow. Ctrl/Cmd+Enter is an additional send path; keep the visible action. The application performs uploads and generation, handles results, and decides when the composer clears.

### Code example

**Block key:** `code-example` · **Export:** `CodeExample`

**Use when:** Documentation needs a live preview, its exact source, and an action to copy that source.

**In context:** A Vertical Stepper page has one base Overview and distinct Examples for headers only and descriptions. Each example copies the variant shown in its own preview.

**Choose and compose:** Give each meaningful variant its own panel. A preview should illustrate one understandable pattern; move unrelated components to their own pages. Use code-only presentation for installation instructions.

**Behavior and content:** Keep source and preview consistent, include necessary imports and state in usable examples, and describe any surrounding application responsibilities. Copy must return the exact intended variant. Use a meaningful filename and heading hierarchy. A successful copy means clipboard completion, not that the pasted component has been integrated into an application.

## Implementation handoff — do not publish as Usage guidance

### Content placement

1. Use each Page key to update the matching content record, preserving existing routes and aliases. Do not create new pages merely because an export has a separate entry in this document.
2. Render Usage guidance independently of whether a page has custom Examples. Currently `ComponentDocs.tsx` uses `page.examples` to switch between Composition and Usage guidance, so pages such as Button, Alert, Tag, and Vertical Stepper can lose their guidance entirely. Retain both sections where relevant and include Usage guidance in the page index.
3. Keep component-specific prose in the content layer. The existing `notes: string[]` can represent the paragraphs, or a small structured content model can preserve labels. Use shared typography for rendering. No new private control is needed.
4. Keep StatusBadge guidance within the Badge family and retain valid direct-link behavior for its existing record. The current map still contains a separate `status-badge` record despite the merged navigation; do not silently assume the alias performs a redirect.
5. Keep Select, Combobox, and MultiSelect separately identifiable within the current `dropdowns` page. The distinct input, file, loading, and form exports also need their own matching guidance wherever they are exposed, even when absent from the sidebar.
6. Route Basics guidance to the relevant Basics page; route supplemental UI block copy to the matching block key. Preserve component taxonomy and A–Z ordering inside existing groups.
7. The requested Statistics block is not in this worktree's public exports or block registry at the time of review. Do not fabricate API guidance for it. When its implementation is available, document its composition, metric units, denominator, time period, provenance, and empty or unavailable data states.

### Capability checks and editorial corrections

These findings constrain what the documentation may promise. They are not an instruction to implement unrelated fixes as part of this text handoff.

- **Button examples:** The current danger example describes recovery and labels the action “Try again.” Routine retry should not teach destructive styling. Align example copy with the guidance during the relevant example-editing task.
- **ButtonGroup:** The implementation is a grouping container with an attached treatment. It does not supply a roving-focus toolbar, toggle state, or split-button behavior. A formatting toolbar needs those semantics in the appropriate shared controls.
- **FeedbackButton:** Completion suppresses further execution until resetKey changes. It is not an automatically resetting repeat-action button.
- **InlineConfirmation:** The confirm label is currently fixed to “Confirm.” Do not publish an example relying on an unsupported confirmLabel prop.
- **Avatar:** Initials cover the absence of src; automatic fallback after an image-load failure is not implemented in the reviewed component.
- **ProgressRing:** It requires a value and exposes progressbar semantics. The current description suggests storage capacity, but static capacity calls for meter semantics. Do not teach the capacity example as semantically interchangeable without a shared-library change. A meter represents a bounded measurement. [Meter entry, W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
- **Rating:** The public API supports a selectable numeric rating with a disabled state. It does not expose a dedicated fractional or read-only aggregate presentation.
- **Toast / Notification:** Neither is a complete queue, persistent inbox, storage mechanism, or timer service. Do not imply automatic expiry or persistence.
- **TextArea:** Supporting text mentioning Markdown does not implement Markdown parsing, preview, or rich text.
- **Table:** Sorting callbacks and state are available; the consuming application must actually sort or fetch the ordered records.
- **FileDropzone:** Upload progress defaults to a number; the current uploading presentation does not automatically switch to indeterminate progress. Do not claim unknown progress is supported there without verifying or extending the shared API.
- **DigitInput:** The reviewed implementation has independent one-character fields without complete-code paste distribution, automatic advancement, or OTP autocomplete handling. Joining empty positions can also lose positional identity. Prefer a validated standard field for production verification until these behaviors are addressed in the shared component.
- **TabMenuVertical:** The implementation is a nav of buttons switching content. It does not currently expose the same tablist/tab/tabpanel semantics and keyboard model as the dedicated Tabs implementation.
- **VerticalStepper:** Its step shape has no disabled field, and the current marker state is visual. Verify current-step accessibility before relying on it. WorkflowSteps already supports disabled steps and aria-current.
- **DotStepper:** It renders buttons even without onChange and derives previous-step completion from the active index. Do not promise separate per-step completion or disabled transition support.
- **CommandMenu:** The reviewed implementation displays “Esc to close” but has no corresponding Escape handler, focus trap, or focus restoration. It also lacks actual command groups and an arrow-key selection model. Do not repeat the stronger claims from its existing page description. Resolve these in the shared component before calling it a complete command palette.
- **Drawer:** It reuses the modal Dialog primitive. The background is visually retained but is not available for simultaneous interaction.
- **Tooltip:** It accepts label and content and supplies its own trigger; it is not a generic arbitrary-child tooltip wrapper.
- **RangeSlider:** It is two coordinated sliders, not a custom shared rail with independently movable thumbs.
- **Label and Hint:** Required markers and error colors do not independently enforce validation, create accessible descriptions, or announce changes. Compose the corresponding input semantics.

### Acceptance criteria for the later implementation

- Every existing component record has the relevant guidance, including records not directly exposed in the sidebar.
- Every guidance section explains a real task and at least one context; alternatives are specific enough for an agent to choose correctly.
- Pages with custom Examples retain Usage guidance and a working section link; Composition remains separate where present.
- Existing variants, previews, source copying, and routes continue to work. Guidance changes do not imply unsupported props or features.
- The Select family retains distinct guidance for each selection model; Badge and StatusBadge share their publishing family without contradictory advice.
- Desktop and narrow layouts preserve readable text with shared typography. The prose is not hidden behind a new interaction or clipped to a fixed-height container.
- Unsupported behavior is tracked as shared-component work rather than recreated privately in documentation screens.

### Evidence and review scope

The component-specific recommendations above are editorial design judgments for this library, grounded in its current exports and implementations. W3C references support the limited semantic distinctions cited inline; they do not certify the library's accessibility or prescribe this document's product-specific choices.

Reviewed source families: documentation registry and rendering; public component and atom exports; ReferenceComponents; buttons and confirmations; forms and special fields; select, combobox and multi-select; progress and loading; files and attachments; table; inline editing; tabs and segmented controls; workflow navigation; and overlays. Existing UI block guidance and registry were also checked.

This is a content deliverable. No frontend, CSS, component API, or interaction behavior is changed by this document.
