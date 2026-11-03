import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/alert";
import { useProgress } from "./ProgressProvider";

/**
 * Says when the progress can't load or a change can't be saved, with what the
 * storage said: oxido's own message (open its launch link) or the browser's.
 */
export function ProgressAlert() {
  const { state } = useProgress();
  if (state.status !== "failed") return null;
  return (
    <Alert variant="warning">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Your progress isn't being saved</AlertTitle>
      <AlertDescription>{sentence(state.error.message)}</AlertDescription>
    </Alert>
  );
}

/** oxido's messages are lower case with no period, for its API; here they're sentences. */
function sentence(message: string): string {
  const text = message.trim();
  const capital = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capital) ? capital : `${capital}.`;
}
