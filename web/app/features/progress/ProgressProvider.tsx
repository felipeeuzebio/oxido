// The student's progress, for every page. Once the page runs, it picks the
// storage (features/storage/pick.ts) and loads the progress; pre-rendered
// pages show none until then. Each change saves through the storage, and the
// progress is read again after it.
import { createContext, type ReactNode, use, useEffect, useRef, useState } from "react";
import { pickStorage } from "../storage/pick";
import {
  type CourseStorage,
  type QuizUpdate,
  StorageError,
  type VideoUpdate,
} from "../storage/storage";
import { NO_PROGRESS, type Progress } from "./progress";

type Target = CourseStorage["target"];

export type ProgressState =
  | { status: "loading" }
  | { status: "ready"; target: Target }
  | { status: "failed"; target: Target | null; error: StorageError };

export interface ProgressContextValue {
  state: ProgressState;
  /** The last progress that loaded: none before it does, or if it never could. */
  progress: Progress;
  saveVideo(classId: string, update: VideoUpdate): Promise<void>;
  saveQuiz(quizId: string, update: QuizUpdate): Promise<void>;
  /** The website's mark for a task done by hand; oxido's tasks are done by their tests. */
  markTask(classId: string, marked: boolean): Promise<void>;
}

const nothing = async () => {};

// Without a provider (a page rendered on its own), there's no progress and
// nothing is saved.
const ProgressContext = createContext<ProgressContextValue>({
  state: { status: "loading" },
  progress: NO_PROGRESS,
  saveVideo: nothing,
  saveQuiz: nothing,
  markTask: nothing,
});

export const useProgress = () => use(ProgressContext);

export function ProgressProvider({
  children,
  pick = pickStorage,
}: {
  children: ReactNode;
  pick?: () => Promise<CourseStorage>;
}) {
  const [state, setState] = useState<ProgressState>({ status: "loading" });
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS);
  const storage = useRef<CourseStorage | null>(null);

  useEffect(() => {
    let gone = false;
    const load = async () => {
      try {
        const picked = await pick();
        storage.current = picked;
        const loaded = await picked.progress();
        if (gone) return;
        setProgress(loaded);
        setState({ status: "ready", target: picked.target });
      } catch (error) {
        if (gone) return;
        setState({
          status: "failed",
          target: storage.current?.target ?? null,
          error: asStorageError(error),
        });
      }
    };
    load();
    return () => {
      gone = true;
    };
  }, [pick]);

  const change = async (save: (picked: CourseStorage) => Promise<void>) => {
    const picked = storage.current;
    if (!picked) return;
    try {
      await save(picked);
      setProgress(await picked.progress());
      setState({ status: "ready", target: picked.target });
    } catch (error) {
      setState({ status: "failed", target: picked.target, error: asStorageError(error) });
    }
  };

  const value: ProgressContextValue = {
    state,
    progress,
    saveVideo: (classId, update) => change((picked) => picked.saveVideo(classId, update)),
    saveQuiz: (quizId, update) => change((picked) => picked.saveQuiz(quizId, update)),
    markTask: (classId, marked) =>
      change(async (picked) => {
        if (picked.target === "website") await picked.markTask(classId, marked);
      }),
  };

  return <ProgressContext value={value}>{children}</ProgressContext>;
}

function asStorageError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new StorageError(0, message);
}
