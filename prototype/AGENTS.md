# Mobile Prototype Agent Guide

## Prototype Instructions

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Project Design Decisions

- Product: mobile App for private-yard IoT control, shared by homeowners and temporarily authorized installers.
- Selected visual source: `reference/selected-device-home.png`.
- Visual language: premium nighttime courtyard, deep charcoal/ink surfaces, warm amber-gold interaction accents, muted blue-gray neutral and system-status accents.
- Keep the nighttime visual as the default prototype at `/`. A second selectable visual direction is being developed in the same codebase at `/?visual=warm`: warm ivory daylight surfaces, deep garden green controls, a golden-hour courtyard hero, white elevated device cards, and the same shared device state and interactions. A page-level `深色｜暖白` switcher changes the visual in place, updates the URL without reloading, returns to the Devices root, and preserves shared device state. During selection, do not replace or delete either direction; complete the warm direction screen-by-screen after user review.
- The warm Devices top is a separate composition from the nighttime top rather than a CSS recolor of `AppTopBar + garden-hero`: its yard selector/actions, faded golden-hour image, and floating health card form one continuous header. Keep the warm ivory fade baked into the hero raster so there is no hard image boundary, while sharing only device state and actions with the night implementation.
- Keep the warm direction visually light and soft: use a near-white warm ivory app background around `#FCFAF6`, brighter header surfaces around `#FDFBF7`, restrained card shadows, and slightly reduced saturation/contrast on the garden hero. Avoid drifting toward yellow-gray or darkening the warm direction.
- The warm direction is now a complete independent visual system across every existing screen and flow: root module headers, all device details, Add Device, scenes and the scene editor, schedules and linkages with their editors/sheets, Me, physical-device management, the 12-channel controller, and per-channel settings. Warm pages may use dedicated markup or warm-only styling without preserving dark-layout compromises; only business state, navigation, validation, and actions must remain shared with the night direction. Use white elevated cards, garden-green primary actions, pale-green system states, light ivory page backgrounds, and low-contrast separators consistently throughout.
- Preserve separate icon art directions. Night device cards/details use generated silver dimensional pictograms on near-black blue tiles for fountain, gate, and irrigation; the night light-strip card keeps its photographic thumbnail. Warm device cards/details use generated garden-green line pictograms on warm-ivory circular medallions for light strip, fountain, gate, and irrigation. Night bottom navigation maps to house, sunrise, connected-nodes, and person icons; warm maps to filled leaf, sunrise, history-clock, and person, with its active leaf inside the green rounded square. Do not collapse these back to one shared generic icon set.
- Primary accent: warm amber around `#D99A3E`; brighter active highlight around `#F0B45A`.
- Navigation: `设备｜场景｜自动化｜我的`; the Devices tab is the home screen.
- Automations stay split into `定时｜联动`.
- Sensitive gate actions remain available on the home screen but must open a security confirmation before execution.
- Irrigation and temporary runs support both continuous and timed operation; selecting a duration is not mandatory.
- Preserve honest status language: when device feedback is unavailable, say that the command was sent rather than claiming the physical device reached a state.
- The Devices-home `+` action opens a dedicated Add Device flow with nearby discovery, `智能灯光｜控制器` filtering, QR/model/Bluetooth manual entry points, and a pairing-preparation sheet. Keep it shared for homeowners and temporarily authorized installers rather than creating a separate installer experience.
- Bottom navigation tabs switch content immediately without a push transition. Preserve push/pop transitions for secondary flows such as device details, scene editors, automation editors, and Add Device.
- Root-tab headers are contextual: Devices shows the selectable yard name plus notification and add-device actions; Scenes and Automation use fixed, non-selectable titles with only their contextual create action; Me uses a fixed title with no notification or add action. Do not repeat the global notification action across every tab or show dropdown carets on fixed module titles.
- Root-tab spacing respects runtime safe areas exactly once: header content starts below the status-bar region, while the fixed bottom navigation sits above the runtime-owned home-indicator/navigation safe area and must not add that safe-area padding again. Switching root tabs must dismiss the simulated keyboard before changing content.
- Scene creation is a complete draft flow: keyboard-aware naming with an explicit Done/dismiss action, device selection, per-device action configuration, generated summary, validation, test, and save back to the scene list. Any step that moves beyond text entry must dismiss the simulated keyboard first.
- Schedule creation follows the same complete-flow standard: keyboard-aware naming, fixed-time/sunrise/sunset trigger selection, repeat or custom weekdays, one target device and its action, generated summary, validation, test, save/update back to the Automation list, and a persistent enabled state. Time labels use the current yard timezone.
- Linkage creation is a complete editable rule flow: keyboard-aware naming, one or two OR triggers, an optional time constraint, one or two sequential actions, natural-language summary, validation, test, save/update back to the Automation list, and persistent enabled state. Rule cards use a stable three-column alignment for the clause badge, icon/copy, and trailing control.
- A 12-channel dry-contact controller is managed as one physical device under `我的 → 设备管理`, while configured channels appear as user-facing logical devices on the Devices home. The controller flow must expose all 12 channels, per-channel naming/type/area/mode/pulse/polarity/home-visibility/sensitive-action/automation/timeout settings, and direct channel association links from logical device details.
- Yard workspace state is shared by both visual directions and isolated by `activeYardId`: switching a yard resets to the Devices root but preserves each yard's light, controller channels, scenes, schedules, linkages, areas, members, and role permissions. Creating a yard starts an owner workspace with no configured devices; joining by invitation creates a member workspace after previewing inviter, role, location, and expiry.
- Yard management is available from the yard switcher and `我的`: owners can edit profile and areas, inspect members, and configure temporary installer authorization by controller/channel scope and duration; members get read-only management and installers cannot enter after their membership expiry.
- Lighting groups are persistent virtual devices scoped to one yard. A light remains independently controllable, may belong to multiple groups, and has one physical area; a group may be assigned to one area or marked `跨区域`. Group controls expose only the intersection of member capabilities, derive `全部开启｜部分开启｜全部关闭` from live member state, report online/success counts honestly, and can be selected as a target by scenes, schedules, and linkages. Dry-contact channels never join lighting groups; mixed device behavior belongs in scenes and automations.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.
