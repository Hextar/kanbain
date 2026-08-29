import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "../api/settings";
import { settingsKeys } from "../api/settingsKeys";

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.all, settings);
    },
  });
}
