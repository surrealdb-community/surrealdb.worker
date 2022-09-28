import {
  ALL_PREFIX,
  DataRequest,
  lockUntilDeath,
  MAIN_BC,
  Return,
  StartRequest,
  WorkerContent,
} from "./shared.js";
import { nanoid } from "nanoid";
import { newId } from "./utils/id.js";
import { Live } from "./deps.js";

export class LiveWrapper<T = any> {
  constructor(
    private id: string,
    private name: string,
    private bc: BroadcastChannel,
    private args: any[],
  ) {}

  start() {
    this.bc.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: this.id,
          method: "live",
          vars: this.args,
          name: this.name,
        },
      }),
    );
  }

  // TODO: implement when live querys are enabled
}

export type WrapWorkerContent<C extends WorkerContent> = {
  query: {
    [K in keyof C["query"]]: (
      ...args: Parameters<C["query"][K]>
    ) => ReturnType<C["query"][K]>;
  };
  live: {
    [K in keyof C["live"]]: (
      ...args: Parameters<C["live"][K]>
    ) => ReturnType<C["live"][K]> extends Live<infer X> ? LiveWrapper<X>
      : never;
  };
};

export const proxyHandler: ProxyHandler<any> = {
  apply() {
    return null;
  },
  construct() {
    return {};
  },

  defineProperty() {
    return false;
  },

  deleteProperty() {
    return false;
  },
  getOwnPropertyDescriptor() {
    return undefined;
  },
  getPrototypeOf() {
    return null;
  },

  has() {
    return true;
  },

  isExtensible() {
    return false;
  },

  ownKeys() {
    return [];
  },

  preventExtensions() {
    return true;
  },

  set() {
    return false;
  },

  setPrototypeOf() {
    return false;
  },
};

export function setupClient<C extends WorkerContent>(
  name = "default",
): WrapWorkerContent<C> {
  const mainBC = new BroadcastChannel(MAIN_BC + name);

  const id = nanoid();

  const reqId = newId();

  lockUntilDeath(ALL_PREFIX + name + "@" + id);

  mainBC.addEventListener("message", (
    ev: MessageEvent<{
      type: "hello";
    }>,
  ) => {
    if (ev.data.type === "hello") {
      // restate client
      mainBC.dispatchEvent(
        new MessageEvent<StartRequest>("message", {
          data: {
            id,
            type: "start",
          },
        }),
      );

      // restart live
      for (const id in liveMap) {
        liveMap.get(id)!.start();
      }
    }
  });

  const bc = new BroadcastChannel(ALL_PREFIX + name + "@" + id);

  const promiseMap = new Map<
    string,
    [(res: any) => void, (err: any) => void]
  >();
  const liveMap = new Map<string, LiveWrapper>();

  bc.addEventListener("message", (ev: MessageEvent<Return>) => {
    const data = ev.data;

    if (data.type === "return") {
      const [res, rej] = promiseMap.get(data.id) ?? [() => {}, () => {}];
      if (data.err) {
        rej(data.err);
      }
      res(data.res);
    }
  });

  const liveActive = new Map<string, Map<string, LiveWrapper>>();

  return {
    query: new Proxy({} as any, {
      ...proxyHandler,
      get(_, p: string) {
        return (...args: Parameters<C["query"][keyof C["query"]]>) => {
          const id = reqId();

          bc.dispatchEvent(
            new MessageEvent<QueryRequest<C>>("message", {
              data: {
                id,
                method: "query",
                vars: args,
                name: p,
              },
            }),
          );

          return new Promise((res, rej) => {
            promiseMap.set(id, [res, rej]);
          });
        };
      },
    }),
    live: new Proxy({} as any, {
      ...proxyHandler,
      get(_, p: string) {
        return (...args: Parameters<C["live"][keyof C["live"]]>) => {
          if (!liveActive.has(p)) liveActive.set(p, new Map());
          const m = liveActive.get(p)!;
          const json = JSON.stringify(args);

          if (m.has(json)) {
            return m.get(json);
          }

          const id = "L" + reqId();
          const l = new LiveWrapper(id, p, bc, args);
          liveMap.set(id, l);
          m.set(json, l);
          return l;
        };
      },
    }),
  };
}

type QueryRequest<C extends WorkerContent> = DataRequest<C, "query">;

function cache<T = any>() {
  const map = new Map<string, T>();

  return (name: string, fnObj: () => T) => {
    if (!map.has(name)) {
      map.set(name, fnObj());
    }

    return map.get(name)!;
  };
}

export function contentWrapper(
  query: (
    fn: (...args: unknown[]) => Promise<unknown>,
  ) => (...args: unknown[]) => any,
  live: (
    fn: (...args: unknown[]) => LiveWrapper<unknown>,
  ) => (...args: unknown[]) => any,
): <C extends WorkerContent>(c: WrapWorkerContent<C>) => any {
  return <C extends WorkerContent>(c: WrapWorkerContent<C>) => {
    const liveCache = cache();
    const queryCache = cache();

    return {
      query: new Proxy({} as any, {
        ...proxyHandler,
        get(_, p: string) {
          return queryCache(p, () => query(c.query[p]));
        },
      }),
      live: new Proxy({} as any, {
        ...proxyHandler,
        get(_, p: string) {
          return liveCache(p, () => live(c.live[p]));
        },
      }),
    };
  };
}
