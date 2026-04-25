# Macabi Madrijim (frontend)

SPA en **React 19**, **TypeScript**, **Vite** y **Tailwind CSS v4**, migrada desde el mockup Next.js en la carpeta `mockup/` del monorepo. El backend Go no vive aquí.

**Desarrollo:** `npm install` y `npm run dev`.

**API (`VITE_API_URL`):** en desarrollo (`npm run dev`), Vite carga [`.env.development`](.env.development) (alineado al `PORT` del backend local, por defecto en repo `http://localhost:8081`) y podés **sobrescribir sin tocar el repo** con `.env.development.local` o `.env.local` (los `*.local` están en [`.gitignore`](.gitignore)). Para `npm run build` (modo production), Vite no usa `.env.development`: definí la variable en CI, en `.env.production` o en `.env`. Detalle en [`.env.example`](.env.example). La validación está en [`src/config/env.ts`](src/config/env.ts); el HTTP en [`src/lib/api/apiClient.ts`](src/lib/api/apiClient.ts) y auth en [`src/lib/api/auth.ts`](src/lib/api/auth.ts).

**Producción (SPA):** rutas como `/app/micros` deben resolver al mismo `index.html` (fallback en nginx, Netlify `_redirects`, S3+CloudFront error document, etc.); de lo contrario un refresh en una ruta profunda devuelve 404.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
