# Required Dependencies

Install these packages to use the landing design system components:

```bash
npm install framer-motion lucide-react tailwind-merge clsx class-variance-authority tailwindcss-animate
```

| Package | Version | Purpose |
|---|---|---|
| `framer-motion` | ^11.0.0 | All scroll and entrance animations |
| `lucide-react` | ^0.462.0 | Icons used throughout components |
| `tailwind-merge` | ^2.6.0 | Merge Tailwind class conflicts |
| `clsx` | ^2.1.1 | Conditional class composition |
| `class-variance-authority` | ^0.7.1 | Component variant patterns |
| `tailwindcss-animate` | ^1.0.7 | Animation utilities (accordion, fade-in-up) |

Also add `tailwindcss-animate` to your `tailwind.config` plugins array:

```ts
plugins: [require("tailwindcss-animate")]
```
