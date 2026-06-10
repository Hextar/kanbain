# react-habit-tracker

A React 19 habit tracker built with Vite and TypeScript. Track daily habits across a weekly view, persist progress in `localStorage`, and explore React performance patterns such as split context (state vs actions).

**Repository:** https://github.com/Hextar/react-habit-tracker

## Features

- Add and remove habits
- Mark completion per day with week navigation
- Streak count for consecutive completed days
- Habits persisted in browser `localStorage`
- Split `HabitStateContext` / `HabitActionsContext` to reduce unnecessary re-renders

## Tech stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- [date-fns](https://date-fns.org/) for date handling
- [usehooks-ts](https://usehooks-ts.com/) for `useLocalStorage`
- React Compiler enabled via Babel plugin

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the port shown in the terminal).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project structure

```
src/
  Habit/
    context/       # HabitProvider, TimerangeProvider, hooks
    helpers/       # streak, storage, completion map utilities
    HabitForm.tsx
    HabitHeader.tsx
    HabitList.tsx
    HabitListItem.tsx
  uiKit/           # Button, Input, RadioButton
```
