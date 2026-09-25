// Unmount React trees between tests (Vitest runs without globals, so Testing
// Library can't register this on its own).
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
