"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import {
  applyPrefsToDocument,
  persistPrefs,
  subscribeSystemTheme,
  type PrefsState,
} from "./persist";
import { makeStore } from "./store";

export default function StoreProvider({
  children,
  initialPrefs,
}: {
  children: ReactNode;
  initialPrefs: PrefsState;
}) {
  const [store] = useState(() => makeStore(initialPrefs));

  useEffect(() => {
    applyPrefsToDocument(store.getState().prefs);
    persistPrefs(store.getState().prefs);
    const unsubStore = store.subscribe(() => {
      const prefs = store.getState().prefs;
      persistPrefs(prefs);
      applyPrefsToDocument(prefs);
    });
    const unsubSystem = subscribeSystemTheme(() => {
      applyPrefsToDocument(store.getState().prefs);
    });
    return () => {
      unsubStore();
      unsubSystem();
    };
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
