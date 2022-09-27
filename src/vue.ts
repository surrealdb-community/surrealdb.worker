import { WrapWorkerContent, proxyHandler } from "./client.js";
import { WorkerContent } from "./shared.js"
import { Ref, ShallowRef, ref, shallowRef } from "vue";
import { Live } from "./deps.js";

export type VueQuery<T = any> = {
  loading: Ref<boolean>
  error: Ref<any>
  result: ShallowRef<T | null>
}

export type VueWrapWorkerContent<C extends WorkerContent> = {
  query: {
    [K in keyof C['query']]: (...args: Parameters<C['query'][K]>) => VueQuery<Awaited<ReturnType<C['query'][K]>>>
  },
  live: {
    [K in keyof C['live']]: (...args: Parameters<C['live'][K]>) => Awaited<ReturnType<C['live'][K]>> extends Live<infer X> ? VueQuery<X> : never  }
}

function emptyReturn(): VueQuery<any> {
  return {
    loading: ref(true),
    error: ref(null),
    result: shallowRef(null)
  }
}

export function vue<C extends WorkerContent>(c: WrapWorkerContent<C>) {
  return {
    query: new Proxy({} as any, {
      ...proxyHandler,
      get(_, p: string) {
        return (...args: Parameters<C["query"][string]>) => {
          const promise = c.query[p](...args)

          const ret = emptyReturn()

          promise.then(res => ret.result.value = res).catch(err => ret.error.value = err).finally(() => ret.loading.value = false)

          return ret
        }
      }
    }),
    live: new Proxy({} as any, {
      ...proxyHandler,
      get(_, p: string) {
        return (...args: Parameters<C["live"][string]>) => {
          const live = c.live[p](...args)
          const ret = emptyReturn()

          // TODO use live handler

          return ret
        }
      }
    })
  }
}