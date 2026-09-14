import { configureStore } from "@reduxjs/toolkit";
import { defaultPrefs, type PrefsState } from "./persist";
import { prefsSlice } from "./prefsSlice";

export function makeStore(prefs: PrefsState = defaultPrefs) {
  return configureStore({
    reducer: {
      prefs: prefsSlice.reducer,
    },
    preloadedState: { prefs },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
