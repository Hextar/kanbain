import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  defaultPrefs,
  type Density,
  type Locale,
  type PrefsState,
  type ThemePref,
} from "./persist";

export const prefsSlice = createSlice({
  name: "prefs",
  initialState: defaultPrefs,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePref>) {
      state.theme = action.payload;
    },
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
    setDensity(state, action: PayloadAction<Density>) {
      state.density = action.payload;
    },
  },
});

export const { setTheme, setLocale, setDensity } = prefsSlice.actions;

export const selectPrefs = (state: { prefs: PrefsState }) => state.prefs;
export const selectTheme = (state: { prefs: PrefsState }) => state.prefs.theme;
export const selectLocale = (state: { prefs: PrefsState }) => state.prefs.locale;
export const selectDensity = (state: { prefs: PrefsState }) =>
  state.prefs.density;
