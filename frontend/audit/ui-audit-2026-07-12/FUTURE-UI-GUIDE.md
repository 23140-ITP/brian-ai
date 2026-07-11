# Future UI guide

New Brian AI UI should compose the existing primitives and tokens before adding styles.

Use:

- Layout: `Layout`, `AppHeader`, `AppSidebar`, `Card`, `CardHeader`, `CardContent`, `CardFooter`.
- Actions: `Button`, `DropdownMenu`, `Select`, `Dialog`, `Sheet`, `Tooltip`.
- Forms: `Field`, `FieldLabel`, `Input`, `Textarea`, `InputGroup`.
- Feedback: `Alert`, `Badge`, `Progress`, `Skeleton`, `Empty`.
- Data: `Table`, `ScrollArea`.

Use semantic classes and tokens such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, and the existing chart/status tokens. Do not add raw hex values or page-local shadows/radii for one-off fixes.

Every new flow needs default, hover, focus-visible, active, disabled, loading, empty, error, and success states. Give every control a visible or programmatic label, keep mobile targets at least 44px, and test at 390px and 1440px before merging.

Keep remote/demo behavior in `frontend/src/services/api.ts`; page components should consume the same typed result and render the state. New routes must be added to `navigation.ts`, use one H1, preserve the shared shell, and leave the body free of horizontal overflow.
