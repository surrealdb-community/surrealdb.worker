import { lockUntilDeath, resolvablePromise } from "./shared.js";

/**
 * This is run by all tabs / workers that want access to the client
 *
 * The lock `"@surrealdb@workergen@" + name` is used so that only 1
 *
 * @param uri URL to worker file
 * @param name name of Worker (use this if you want multiple instances!)
 */
export function startWorker(uri: URL | string, name = "default") {
  return strartWorkerWithFn({
    sharedWorker: () => new SharedWorker(uri, { name }),
    worker: () => new Worker(uri, { name }),
  });
}

/**
 * DONT USE IT UNLESS YOU KNOW WHAT YOU ARE DOING!
 * THIS IS MOSTLY USED INTERNALY FOR THE VITE PLUGIN!
 */
export async function strartWorkerWithFn(worker: {
  sharedWorker: () => SharedWorker;
  worker: () => Worker;
}, name = "default") {
  // When we have SharedWorker this is simple!
  if (SharedWorker) {
    worker.sharedWorker();
    return;
  }

  // Only 1 Tab / Client is allowed to enter the following codepath
  // Only if that tab is closed / killed the lock is released
  // so a new client can take over
  await lockUntilDeath("@surrealdb@workergen@" + name);

  // Run this inifinite as we might have multiple worker kills
  while (true) {
    const { resolve: resolveMessageRecieved, promise: messageRecieved } =
      resolvablePromise();

    // This lock is granted if no worker is running (anymore)
    // Then we create a new worker and wait till it is alive
    // and has taken over the lock
    // Then we loop
    navigator.locks.request("@surrealdb@main@" + name, () => {
      const w = worker.worker();

      w.addEventListener("message", () => resolveMessageRecieved());
    });

    // Worker is running and has locked!
    await messageRecieved;
  }
}
