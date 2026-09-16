# Known limitations

These are current behavior boundaries, not promises of future implementation:

- `CommandMenu` provides the current searchable action surface; it is not a full command-palette implementation with every focus, grouping, and keyboard convention.
- `DigitInput` exposes independent digit fields; complete OTP paste and automatic advance remain application responsibilities.
- `Avatar` falls back from a missing source; failed-image recovery is not automatic.
- `TabMenuVertical` is a navigation pattern and does not claim the complete WAI-ARIA tabs interaction model.
- `ProgressRing` is a progressbar-style indicator, not a capacity meter with domain-specific semantics.
- `Toast` and `Notification` render messages; queueing, persistence, and delivery policy belong to the application.
- `Table` renders the supplied rows and columns; sorting, pagination, and data fetching belong to the application.

Examples and usage guidance describe only behavior the current public API supports. Accessibility and product requirements still need validation in the consuming application.
