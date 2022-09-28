import { strartWorkerWithFn } from "../dist/worker.setup";

export default () => strartWorkerWithFn({
  sharedWorker: () => {
    return new SharedWorker(new URL("%PATH%", import.meta.url), {
      name: "%NAME%",
    });
  },
  worker: () => {
    return new Worker(new URL("%PATH%", import.meta.url), { name: "%NAME%" });
  },
}, "%NAME%");
;
