---
name: PlanThing
description: A calm, tactile planning workspace for boards, notes, drawings, and real-time collaboration.
colors:
  paper-bg: "#F5F3EE"
  paper-panel: "#E8E4DD"
  header-wash: "#E9E4DC"
  ink: "#111111"
  ink-deep: "#1A1A1A"
  sprout-red: "#E63B2E"
  sidebar-cream: "#F5F3EE"
  muted-text: "rgba(0, 0, 0, 0.55)"
  subtle-text: "rgba(0, 0, 0, 0.35)"
  whisper-border: "rgba(0, 0, 0, 0.08)"
  whisper-border-strong: "rgba(0, 0, 0, 0.14)"
  link-blue: "#0075de"
typography:
  display:
    fontFamily: "Inter, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Inter, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  body:
    fontFamily: "Inter, -apple-system, system-ui, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Space Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "0.08em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "2rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-bg}"
    rounded: "{rounded.xl}"
    padding: "0 20px"
    height: "40px"
    typography: "{typography.body}"
  button-secondary:
    backgroundColor: "{colors.paper-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0 20px"
    height: "40px"
    typography: "{typography.body}"
  card-board:
    backgroundColor: "{colors.paper-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
---

# Design System: PlanThing

## 1. Overview

**Creative North Star: "The Working Garden"**

PlanThing should feel like a quiet workbench where plans can grow from rough notes into organized action. The interface is calm and clean first, then tactile and fast in the hand: boards, cards, notes, and drawing surfaces should feel direct, not precious.

The baseline borrows Notion's clarity and warm restraint, but the product must never read as a generic Notion clone. PlanThing's identity comes from planning, growth, and adaptable structure: a warm paper field, dark anchored navigation, red sprout-like accent, and controls that feel sturdy enough for daily use.

**Key Characteristics:**
- Warm paper backgrounds instead of sterile white or cold gray.
- Dark, grounded sidebar for navigation and workspace memory.
- Red accent used for brand punctuation, danger, and small moments of energy.
- Rounded tactile controls with clear hover and focus states.
- Dense product surfaces that stay calm through hierarchy, not decoration.
- Motion is quick feedback only, with reduced-motion support.

## 2. Colors

The palette is restrained: warm neutrals carry most surfaces, black anchors the workspace, and red appears sparingly as a living accent.

### Primary
- **Paper Field**: The main workspace background. Use it for the app canvas and quiet empty states.
- **Ink Black**: The primary text and primary-action color. Use it for decisive actions and high-contrast labels.
- **Sprout Red**: The brand accent. Use it for the PlanThing mark, destructive actions, and rare emphasis.

### Secondary
- **Paper Panel**: The card and secondary-button surface. It creates tactile separation without looking like a floating card deck.
- **Header Wash**: A slightly distinct warm surface for headers, tab strips, and top-level framing.
- **Link Blue**: Utility link color only. It should not compete with the brand accent.

### Neutral
- **Sidebar Cream**: Text on the dark sidebar.
- **Muted Text**: Secondary copy, dates, owner metadata, and non-critical supporting labels.
- **Subtle Text**: Empty helper text, inactive icon color, and low-priority metadata.
- **Whisper Border**: Default division line for cards and panels.
- **Strong Whisper Border**: Hover or selected border reinforcement.

### Named Rules

**The Red Is Alive Rule.** Red is punctuation, not wallpaper. If multiple red elements compete on one screen, the screen is shouting.

**The Paper Before Chrome Rule.** Default to warm paper surfaces and border contrast before adding shadows, gradients, or decorative effects.

## 3. Typography

**Display Font:** Inter with system fallbacks.
**Body Font:** Inter with system fallbacks.
**Label/Mono Font:** Space Mono for section labels, counts, and small mechanical metadata.

**Character:** The type system is practical and product-native, with small brand touches. Inter keeps repeated daily use familiar; Space Mono gives labels and counts a crisp planning-tool rhythm; serif italic appears only as a restrained brand accent in headings and the wordmark.

### Hierarchy
- **Display** (700, 30px, 1.2): Page titles such as Workspace.
- **Headline** (700, 24px, 1.2): Empty-state headings, modal headings, major panel titles.
- **Title** (700, 22px, 1.15): Board cards, note cards, and prominent item names.
- **Body** (400-500, 16px, 1.5): Standard readable copy and content descriptions. Keep prose to 65-75ch when possible.
- **Label** (700, 10-12px, 0.08em tracking): Section labels, counts, filters, compact metadata.

### Named Rules

**The Product Type Rule.** UI labels, data, and controls use Inter or Space Mono. Serif italic is a brand accent, never the default language of the interface.

## 4. Elevation

PlanThing uses a hybrid depth model: most surfaces are separated by warm tonal contrast and whisper borders; important cards get soft layered elevation. Shadows should feel embedded in paper, not like floating SaaS panels.

### Shadow Vocabulary
- **Card Elevation** (`rgba(0, 0, 0, 0.04) 0 4px 18px, rgba(0, 0, 0, 0.027) 0 2.025px 7.84688px, rgba(0, 0, 0, 0.02) 0 0.8px 2.925px, rgba(0, 0, 0, 0.01) 0 0.175px 1.04062px`): Board cards, note cards, and reusable content tiles.
- **Card Hover Elevation** (`rgba(0, 0, 0, 0.06) 0 6px 22px, rgba(0, 0, 0, 0.04) 0 3px 10px, rgba(0, 0, 0, 0.03) 0 1px 4px, rgba(0, 0, 0, 0.02) 0 0.25px 1.5px`): Hover feedback for clickable cards.
- **Drawer Elevation** (`0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Sidebar peek states, context menus, and task panels.

### Named Rules

**The Flat Until Useful Rule.** Surfaces are flat by default. Elevation appears when it helps scanning, interaction, or temporary layering.

## 5. Components

### Buttons
- **Shape:** Rounded pill controls for shared button components (2rem radius), with tighter 12px rounded buttons in dense page headers.
- **Primary:** Ink black background, paper text, 40px height, bold readable label. It is the default for create, save, and confirm actions.
- **Hover / Focus:** Hover deepens to ink-deep. Focus uses a visible 2px ink ring. Loading uses a spinner plus disabled state.
- **Secondary / Ghost / Danger:** Secondary uses Paper Panel with a strong border on hover. Ghost uses transparent backgrounds and text hover. Danger uses Sprout Red, reserved for destructive actions.

### Chips
- **Style:** Rounded or pill labels with low-chroma backgrounds. Board colors may tint icon wells or small status dots.
- **State:** Selected chips strengthen background or border, never relying on color alone. Shared and favorite states include icons.

### Cards / Containers
- **Corner Style:** Board and note cards use 12px corners. Icon wells use 8-10px corners.
- **Background:** Paper Panel on the Paper Field, with Ink text and Muted Text metadata.
- **Shadow Strategy:** Use Card Elevation for scannable workspace objects. Use hover elevation only on clickable cards.
- **Border:** Whisper Border at rest, Strong Whisper Border on hover or active state.
- **Internal Padding:** 20px for cards, 12-16px for compact list rows.

### Inputs / Fields
- **Style:** Transparent or paper backgrounds, 2px low-opacity ink border, 16-32px radius depending on density.
- **Focus:** Border strengthens to Ink Black. Error fields use Sprout Red and retain visible focus.
- **Error / Disabled:** Error copy sits close to the field in Sprout Red. Disabled fields reduce opacity and keep the same shape.

### Navigation
- **Style:** The sidebar is dark, resizable, and task-focused. It groups Favorites, Boards, Notes, and Drawings with compact mono section labels.
- **Active State:** Active items invert into Paper Panel with Ink text. Icons carry item color or Sprout Red for note and draw anchors.
- **Mobile Treatment:** Sidebar becomes an overlay with a dimmed backdrop and clear close behavior. Desktop can collapse or peek.

### Workspace Cards

Workspace cards are the signature primitive. Each card contains a colored icon well, a bold item title, compact metadata, and quiet owner or shared-state signals. The card must scan quickly in a grid without turning into an identical decorative card wall.

## 6. Do's and Don'ts

### Do:
- **Do** keep PlanThing calm and clean even when boards, notes, and drawings grow dense.
- **Do** use Paper Field, Paper Panel, and Ink Black as the main structural palette.
- **Do** make customization visible through board colors, icon wells, labels, views, and flexible workspace organization.
- **Do** provide visible focus states, reduced-motion alternatives, color-blind safe labels, and keyboard-first workflows for core actions.
- **Do** use Notion as a clarity baseline while giving PlanThing its own planning and growth identity.

### Don't:
- **Don't** make PlanThing feel like corporate Jira.
- **Don't** make PlanThing feel like a generic Notion clone.
- **Don't** use neon AI dashboard styling, glowing dark gradients, or decorative AI visual tropes.
- **Don't** make the interface feel like a childish task app.
- **Don't** let boards become a cluttered Trello board without hierarchy.
- **Don't** use over-designed startup SaaS hero patterns inside product surfaces.
- **Don't** rely on color alone for labels, statuses, selection, errors, or permissions.
