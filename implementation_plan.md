# Implementation Plan: Enhancing UI Contrast and Layout in Permission Manager

## Goal Description
The user reported that the background color and the card colors in the Permissions Manager page blend together too much, making it difficult to read and distinguish individual user cards from the background. We need to improve the visual hierarchy and contrast.

## Proposed Changes

### 1. `src/pages/PageCommon.css` or `src/index.css`
- Ensure that the main background color (`--bg-color`) has a clear distinction from the card background color. If `--bg-color` is completely white, we will change it to a very light gray (e.g., `#f8f9fa`) so that white cards stand out.
- Ensure that the `.card-style` class has a distinct box-shadow and a clean white background.

### 2. `src/pages/PermissionManager.css`
- **Update `.perm-user-card`**: Add a stronger box-shadow (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);`), ensure background is solid white (`background: #ffffff;`), and perhaps add a subtle border (`border: 1px solid var(--border-light);`).
- **Update `.perm-info`**: Make the information banner at the top more prominent with a slightly stronger background or border to separate it from the content area.
- Add some breathing room (padding/margin) around the elements inside the card to make them feel less cramped.

## Verification Plan
### Manual Verification
1. Open the Permissions Manager page (`/permissions`) logged in as Admin.
2. Verify that the user cards are clearly distinguishable from the page background.
3. Check that the shadows and borders provide a pleasant, premium look without being overwhelming.
