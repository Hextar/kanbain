import { useContext } from "react";
import { TimerangeContext } from "./TimerangeProvider";

export default function useTimerange() {
  const context = useContext(TimerangeContext);
  if (!context) {
    throw new Error("useTimerange must be used within a TimerangeProvider");
  }
  return context;
}