# Sidebar and AI prompt input implementation plan

Approved design: preserve previous layouts and features using atomic shared owners. Two UI blocks, no app shell, network service, commits or publication. Execution stays in this worktree and this agent.

## Sidebar
- [x] Test filtering, Escape focus restoration, current navigation, project actions.
- [x] Add NavigationList component (links, icons, current state, trailing action slot); expose compact Menu trigger configuration.
- [x] Compose SidebarPanel from Surface, Stack, Heading, NavigationList, SearchField, Button and Menu. App supplies links, projects and callbacks. Search toggles the header, filters projects and restores focus.
## Prompt
- [x] Test empty/busy submission guard, keyboard submission, file rejection, removal.
- [x] Add AttachmentArea owning picker/drop validation and canonical attachment toolbar; TextArea gains embedded/hidden-label options owned by its stylesheet.
- [x] Compose PromptInput using Form, AttachmentArea, TextArea, Tag, Button and Alert. Caller owns text/files/request state; preserve draft on error. Cmd/Ctrl+Enter sends, plain Enter adds a line.
## Delivery
- [x] Export blocks and new components; add catalog navigation/specimens and independent consumer examples.
- [x] Run atomic tests, boundaries, types, builds and packed consumer; inspect desktop/mobile once and correct in one batch.

## Verified outcome
69 atomic tests, 6 boundary tests, source boundaries, TypeScript, library/catalog builds and independent installed consumer pass. The consumer covers 46 Components and both UI blocks through public exports.
Desktop/390px checks cover sidebar menu icons, unpin, search and Escape; prompt layout, failure with retained draft, and successful keyboard retry. No horizontal overflow at 390px. Impeccable preserved the existing system and its targeted detector found no issues.
Package preview refreshed at http://127.0.0.1:5211/ . Catalog sections: #block-sidebar and #block-prompt-input on port 5210.
Existing full-Lucide chunk-size warning remains. No backend integration, commit or publishing performed. Unrelated Observatory harness runtime crash was recorded in the prior review pass; Observatory behavior was not changed here.
