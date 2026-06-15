import fs from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vite";

const dataDir = path.resolve("data");
const tasksFile = path.join(dataDir, "tasks.json");
const backupFile = path.join(dataDir, "tasks.backup.json");
const tempFile = path.join(dataDir, "tasks.tmp.json");

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    chunks.push(chunk);
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body is too large");
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function taskStorageMiddleware(request, response, next) {
  if (request.url !== "/api/tasks") return next();

  if (request.method === "GET") {
    fs.readFile(tasksFile, "utf8")
      .then((content) => {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(content);
      })
      .catch((error) => {
        response.statusCode = error.code === "ENOENT" ? 404 : 500;
        response.end();
      });
    return;
  }

  if (request.method === "PUT") {
    readRequestBody(request)
      .then(async (tasks) => {
        if (!Array.isArray(tasks)) throw new Error("Tasks must be an array");
        await fs.mkdir(dataDir, { recursive: true });
        try {
          await fs.copyFile(tasksFile, backupFile);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        await fs.writeFile(tempFile, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
        await fs.rename(tempFile, tasksFile);
        response.statusCode = 204;
        response.end();
      })
      .catch((error) => {
        console.error("Failed to save tasks:", error.message);
        response.statusCode = 400;
        response.end();
      });
    return;
  }

  response.statusCode = 405;
  response.end();
}

const taskStoragePlugin = {
  name: "task-file-storage",
  configureServer(server) {
    server.middlewares.use(taskStorageMiddleware);
  },
  configurePreviewServer(server) {
    server.middlewares.use(taskStorageMiddleware);
  },
};

export default defineConfig({
  plugins: [taskStoragePlugin],
});
