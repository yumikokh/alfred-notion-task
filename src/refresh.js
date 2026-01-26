import { rmSync, existsSync } from "fs";
import { join } from "path";

const cacheDir = join(
  process.env.HOME,
  "Library/Caches/com.runningwithcrayons.Alfred/Workflow Data/com.ymkokh.notion-task"
);

try {
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true });
  }
  process.stdout.write("Cache cleared");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
