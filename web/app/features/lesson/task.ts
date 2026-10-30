// A class's task, as the lesson page names it (decision D35).
import type { Task } from "../content/types";

/** "White belt, stripes 1 and 2", "Drill: unsafe" or "Set up the course". */
export function taskTitle(task: Task): string {
  switch (task.kind) {
    case "stripes": {
      const belt = task.belt.charAt(0).toUpperCase() + task.belt.slice(1);
      const numbers = task.stripes.map((stripe) => stripe.number);
      const word = numbers.length === 1 ? "stripe" : "stripes";
      return `${belt} belt, ${word} ${list(numbers)}`;
    }
    case "drill":
      return `Drill: ${task.name}`;
    case "setup":
      return "Set up the course";
  }
}

/** 1 → "1"; 1, 2 → "1 and 2"; 1, 2, 3 → "1, 2 and 3". */
function list(numbers: number[]): string {
  if (numbers.length < 2) return numbers.join("");
  return `${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}
