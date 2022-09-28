import { Live } from "./deps.js";
import * as SDB from "surrealdb.js";
import { WorkerContent, fn, Return, MAIN_BC, ALL_PREFIX, StartRequest, DataRequest, KillRequest, lockUntilDeath } from "./shared.js";

export async function setupWorker<CONTENT extends WorkerContent>(c: CONTENT, name = "default") {
  await lockUntilDeath('@surreldb@worker@' + name)
  self.postMessage('LOCKED')
  
  let client: SDB.default;
  let mainBC: BroadcastChannel;

  const liveClients = new Map<string, Map<string, LiveWraper>>()
  const clients = new Set<BroadcastChannel>();

  class LiveWraper {
    private live: Live | null = null
    constructor(private ref: [string, string]) {}
  
    setup(live: Live) {
      this.live = live
      // TODO: setup broadcast
    }
  
    bcs = new Map<BroadcastChannel, string>()
  
    addHandler(bc: BroadcastChannel, id: string) {
      this.bcs.set(bc, id)
      // TODO: send current data
    }
  
    removeHandler(bc: BroadcastChannel) {
      this.bcs.delete(bc)
  
      if(this.bcs.size === 0) {
        liveClients.get(this.ref[0])!.delete(this.ref[1])
      }
    }
  
    kill() {
      if(this.live) {
        return this.live.kill()
      }
    }
  }

  function wrapQueryFn(fn: fn<Promise<any>>) {
    return async (bc: BroadcastChannel, id: string, ...args: unknown[]) => {
      try {
        const fnRet = await fn(client, ...args)
      
        bc.dispatchEvent(new MessageEvent<Return>('message', {
          data: {
            type: 'return',
            id,
            res: fnRet,
            err: null
          }
        }))
      } catch (ex) {
        bc.dispatchEvent(new MessageEvent<Return>('message', {
          data: {
            type: 'return',
            id: id,
            res: null,
            err: ex
          }
        }))
      }
    }
  }

  function wrapLiveFn(fn: fn<Live | Promise<Live>>, name: string) {
    liveClients.set(name, new Map())

    return async (bc: BroadcastChannel, id: string, ...args: unknown[]) => {
      const map = liveClients.get(name)!
      const json = JSON.stringify(args)

      if(!map.has(json)) {
        const w = new LiveWraper([name, json])
        map.set(json, w)

        const live = await fn(client, ...args)

        w.setup(live)
      }
      const wrapper = map.get(json)!

      wrapper.addHandler(bc, id)

      return wrapper
    }
  }

  const cc = {
    query: Object.fromEntries(
      Object.keys(c).map(key => [key, wrapQueryFn(c.query[key])])
    ),
    live: Object.fromEntries(
      Object.keys(c).map(key => [key, wrapLiveFn(c.live[key], key)])
    ),
  }

  return function init(url: string, token?: string) {
    client = new SDB.default(url, token);
    mainBC = new BroadcastChannel(MAIN_BC + name);
    const prefix = ALL_PREFIX + name + "@";

    c.startup(client)

    mainBC.addEventListener("message", (ev: MessageEvent<StartRequest | {
      type: 'hello'
    } | {type: 'kill'}>) => {
      const data = ev.data;

      if(data.type === 'kill') {
        self.close()
      }

      if (data.type === "start") {
        const bc = new BroadcastChannel(prefix + data.id);
        const wraperMap = new Map<string, LiveWraper>()
        clients.add(bc);
        // Setup bc
        bc.addEventListener(
          "message",
          async (ev: MessageEvent<DataRequest<CONTENT> | KillRequest<CONTENT>>) => {
            const data = ev.data;
            
            if(data.method === 'query') {
              cc.query[data.name as string]?.(bc, data.id, ...data.vars)
            }

            if(data.method === 'live') {
              const wraper = await cc.live[data.name as string]?.(bc, data.id, ...data.vars)
              wraperMap.set(data.id, wraper)
            }

            if(data.method === 'kill') {
              wraperMap.get(data.id)?.removeHandler(bc)
            }
          },
        );

        navigator.locks.request(ALL_PREFIX + name + '@' + data.id, () => {
          wraperMap.forEach(live => live.removeHandler(bc))

          setTimeout(() => {
            bc.close()
          }, 60 * 1000);
        })
      }
    });

    mainBC.dispatchEvent(new MessageEvent('message', {
      data: {
        type: 'hello'
      }
    }))
  }
}
