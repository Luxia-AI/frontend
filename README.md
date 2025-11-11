# Luxia Research Project - Frontend

A modern, high-performance React frontend built with Next.js, featuring Luxia brand colors, system-aware dark mode, and automated code quality tools.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: 20 LTS)
- npm 10+

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

## 📋 Available Scripts

| Script                 | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start development server with hot reload |
| `npm run build`        | Build optimized production bundle        |
| `npm start`            | Start production server                  |
| `npm run lint`         | Check code with ESLint                   |
| `npm run lint:fix`     | Auto-fix ESLint issues                   |
| `npm run format`       | Format code with Prettier                |
| `npm run format:check` | Check formatting without changes         |

## 🎨 Theme & Branding

### Luxia Brand Colors

- **Primary (Blue)**: `#0096FF` — Used for primary buttons, links, and highlights
- **Secondary (Green)**: `#00C9A7` — Used for accents, success states, and emphasis
- **Dark**: `#0F172A` — Dark theme background
- **Light**: `#FFFFFF` — Light theme background

### Dark Mode

Dark mode is **automatically enabled** based on your system preferences:

- **Windows**: Settings → Personalization → Colors
- **macOS**: System Preferences → General → Appearance
- **Browser**: DevTools → Rendering → prefers-color-scheme

No manual theme toggle needed—the app respects `@media (prefers-color-scheme: dark)`.

## 🛠️ Tech Stack & Versions

### Core Framework

| Tool           | Version | Purpose                      |
| -------------- | ------- | ---------------------------- |
| **Next.js**    | 16.0.1  | React framework with SSR/SSG |
| **React**      | 19.2.0  | UI library                   |
| **React DOM**  | 19.2.0  | DOM rendering                |
| **TypeScript** | ^5      | Type-safe JavaScript         |

### Styling & UI

| Tool                         | Version  | Purpose                       |
| ---------------------------- | -------- | ----------------------------- |
| **Tailwind CSS**             | ^4       | Utility-first CSS framework   |
| **@tailwindcss/postcss**     | ^4       | Tailwind CSS core             |
| **Radix UI**                 | ^1.2.4   | Accessible UI components      |
| **Lucide React**             | ^0.553.0 | Icon library                  |
| **Tailwind Merge**           | ^3.4.0   | Merge Tailwind class names    |
| **Class Variance Authority** | ^0.7.1   | Component variant styling     |
| **clsx**                     | ^2.1.1   | Conditional className utility |
| **tw-animate-css**           | ^1.4.0   | Animation utilities           |

### Development Tools

| Tool                            | Version | Purpose                        |
| ------------------------------- | ------- | ------------------------------ |
| **ESLint**                      | ^9      | Code linting & quality         |
| **eslint-config-next**          | 16.0.1  | Next.js ESLint rules           |
| **Prettier**                    | ^3.6.2  | Code formatter                 |
| **Husky**                       | ^9.1.7  | Git hooks manager              |
| **lint-staged**                 | ^16.2.6 | Run linters on staged files    |
| **Babel Plugin React Compiler** | ^1.0.0  | React compilation optimization |

### Type Definitions

| Package          | Version |
| ---------------- | ------- |
| @types/node      | ^20     |
| @types/react     | ^19     |
| @types/react-dom | ^19     |

## 🔧 Code Quality & Automation

### Husky + lint-staged (Pre-commit Hooks)

**Husky** automatically runs code quality checks before every commit, powered by **lint-staged**.

#### How It Works

1. Stage your changes: `git add .`
2. Commit: `git commit -m "your message"`
3. Pre-commit hook runs automatically:
    - ✅ ESLint checks JavaScript/TypeScript files
    - ✅ Auto-fixes linting issues
    - ✅ Prettier formats code
    - ✅ Checks JSON, Markdown, CSS formatting

If errors are found, the commit is blocked and you'll see error messages. Fix them and try again.

#### Configuration Files

- `.husky/pre-commit` — Pre-commit hook script
- `.prettierrc.json` — Prettier configuration
- `.prettierignore` — Files to skip formatting
- `eslint.config.mjs` — ESLint configuration

#### Example Workflow

```bash
# Edit your files
git add .

# Commit (this will auto-lint and format)
git commit -m "feat: add new component"

# If issues are found:
# ❌ Commit fails → Fix the issues → Try again
# ✅ All pass → Commit succeeds
```

## 📂 Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── globals.css         # Global styles with Luxia colors
│   ├── layout.tsx          # Root layout with dark mode support
│   └── page.tsx            # Home page
├── components/
│   └── ui/                 # Reusable UI components
│       └── button.tsx      # Button component (from shadcn)
├── lib/
│   └── utils.ts            # Utility functions
├── public/                 # Static assets
├── .husky/                 # Git hooks
│   └── pre-commit          # Pre-commit hook
├── .prettierrc.json        # Prettier config
├── .prettierignore         # Prettier ignore rules
├── eslint.config.mjs       # ESLint config
├── next.config.ts          # Next.js config
├── tailwind.config.ts      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── postcss.config.mjs      # PostCSS config
└── package.json            # Dependencies & scripts
```

## 🌿 Git Workflow & Branch Naming Conventions

### Branch Naming Format

Follow this naming convention for consistency and clarity:

```
<type>/<feature-or-issue-number>-<short-description>
```

#### Types

| Type       | Purpose                               | Example                        |
| ---------- | ------------------------------------- | ------------------------------ |
| `feat`     | New feature                           | `feat/auth-login`              |
| `fix`      | Bug fix                               | `fix/123-button-styling`       |
| `refactor` | Code refactor (no feature/bug change) | `refactor/component-structure` |
| `docs`     | Documentation updates                 | `docs/api-endpoint-guide`      |
| `style`    | Code style changes (formatting, etc.) | `style/css-cleanup`            |
| `test`     | Test additions/updates                | `test/unit-tests`              |
| `chore`    | Maintenance & tooling                 | `chore/dependency-update`      |
| `perf`     | Performance improvements              | `perf/image-optimization`      |

#### Rules

- Use **lowercase** letters and numbers only
- Separate words with **hyphens** `-`
- Keep descriptions **short & descriptive** (3-5 words)
- Include **issue number** if available (e.g., `fix/123-header-bug`)
- **No spaces or underscores** in branch names
- **Max length**: 50 characters (recommended)

#### Valid Examples

```
feat/user-authentication
feat/404-dark-mode-toggle
fix/42-navbar-overflow
fix/responsive-mobile-menu
refactor/global-styles
docs/setup-instructions
chore/update-dependencies
perf/optimize-images
style/eslint-fixes
test/component-unit-tests
```

#### Invalid Examples (Don't use)

```
Feature/user_auth          ❌ Capital letters & underscore
fix bug in button           ❌ Spaces instead of hyphens
dark-mode-toggle-button    ❌ Too long, no type prefix
update                      ❌ No type, too vague
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Examples

```
feat(auth): add login page

- Implement OAuth integration
- Add session management

Closes #123
```

```
fix(ui): resolve button overflow on mobile

Fix button text wrapping in small viewports by adjusting padding.

Fixes #456
```

## 🚦 Before Making a Pull Request

1. **Create a branch** following the naming convention:

    ```bash
    git checkout -b feat/my-feature
    ```

2. **Make your changes** — Husky will auto-format and lint on commit

3. **Verify locally:**

    ```bash
    npm run lint       # Check for errors
    npm run format     # Format code
    npm run build      # Verify production build
    ```

4. **Push and create PR** with a clear description

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Husky Documentation](https://typicode.github.io/husky)
- [ESLint Documentation](https://eslint.org/docs)
- [Prettier Documentation](https://prettier.io/docs)

## 💡 Tips & Best Practices

- **Always run** `npm run lint:fix` before committing if you want to auto-fix issues
- **Check formatting** with `npm run format:check` before pushing
- **Use TypeScript** — Strict typing prevents bugs early
- **Component-driven** — Keep components small and reusable
- **Tailwind first** — Use utility classes before custom CSS
- **Commit often** — Small, focused commits are easier to review
- **Write descriptive** branch names and commit messages

## 🐛 Troubleshooting

### Husky hook fails on commit

```bash
# Manually run the pre-commit hook to see errors
npx lint-staged

# Or auto-fix issues
npm run lint:fix && npm run format
```

### Prettier conflicts with ESLint

- Run: `npm run format` first, then `npm run lint:fix`
- Config files are already integrated to prevent conflicts

### Next.js build fails

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Dependencies installation issues

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 License

Private project for Luxia Research.

---

**Questions or suggestions?** Open an issue or contact the team!
