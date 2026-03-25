# CardShot

3D card shot generator with real lighting and materials. React + TypeScript + Vite frontend using react-three-fiber for 3D rendering.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 6
- **3D:** Three.js via @react-three/fiber + @react-three/drei + @react-spring/three
- **Styling:** Tailwind CSS 3 (dark theme, custom colors in `tailwind.config.js`)
- **Linting:** ESLint 9 (flat config) + typescript-eslint + react-hooks + react-refresh

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Type-check + build for production
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Project Structure

```
src/
  main.tsx              # Entry point
  App.tsx               # Root layout (sidebar + viewport)
  index.css             # Tailwind imports
  components/
    Sidebar.tsx         # Left panel — controls & settings
    Viewport.tsx        # 3D viewport area
```

## Conventions

- Functional components with `React.FC` typing
- Tailwind for all styling (no CSS modules)
- Dark UI theme — custom colors under `app.*` in Tailwind config
- Components are default-exported, one per file
