import { lockUntilDeath, resolvablePromise, sleep } from "./shared.js";

/**
 * This is run by all tabs / workers that want access to the client
 * 
 * The lock `"@surrealdb@workergen@" + name` is used so that only 1 
 * 
 * @param uri URL to worker file
 * @param name name of Worker (use this if you want multiple instances!)
 */
export async function strartWorker(uri: URL, name = "default") {
  // When we have SharedWorker this is simple!
  if (SharedWorker) {
    new SharedWorker(uri, { name });
    return;
  }

  // Only 1 Tab / Client is allowed to enter the following codepath
  // Only if that tab is closed / killed the lock is released
  // so a new client can take over
  await lockUntilDeath("@surrealdb@workergen@" + name);

  // Run this inifinite as we might have multiple worker kills
  while (true) {
    const { resolve: resolveMessageRecieved, promise: messageRecieved } = resolvablePromise();

    // This lock is granted if no worker is running (anymore)
    // Then we create a new worker and wait till it is alive
    // Then we sleep for 20s to make sure the worker is setup correctly
    // Then we loop
    navigator.locks.request("@surreldb@worker@" + name, async () => {
      const w = new Worker(uri, { name });
  
      w.addEventListener("message", () => resolveMessageRecieved());
  
      await messageRecieved;
    });

    await messageRecieved;
    await sleep(20 * 1000)
  }
}
