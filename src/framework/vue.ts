import { contentWrapper, WrapWorkerContent } from "../client.js";
import { WorkerContent } from "../shared.js";
import { Ref, ref, ShallowRef, shallowRef } from "vue";
import { Live } from "../deps.js";

export type VueReturn<T = any> = {
  loading: Ref<boolean>;
  error: Ref<any>;
  result: ShallowRef<T | null>;
};

export type VueWrapWorkerContent<C extends WorkerContent> = {
  query: {
    [K in keyof C["query"]]: (
      ...args: Parameters<C["query"][K]>
    ) => VueReturn<Awaited<ReturnType<C["query"][K]>>>;
  };
  live: {
    [K in keyof C["live"]]: (
      ...args: Parameters<C["live"][K]>
    ) => Awaited<ReturnType<C["live"][K]>> extends Live<infer X> ? VueReturn<X>
      : never;
  };
};

function emptyReturn(): VueReturn<any> {
  return {
    loading: ref(true),
    error: ref(null),
    result: shallowRef(null),
  };
}

export const vue: <C extends WorkerContent>(
  c: WrapWorkerContent<C>,
) => VueWrapWorkerContent<C> = contentWrapper(
  (fn) => {
    return (...args) => {
      const promise = fn(...args);

      const ret = emptyReturn();

      promise.then((res) => ret.result.value = res).catch((err) =>
        ret.error.value = err
      ).finally(() => ret.loading.value = false);

      return ret;
    };
  },
  (fn) => {
    return (...args) => {
      const live = fn(...args);
      const ret = emptyReturn();

      // TODO use live handler

      return ret;
    };
  },
);
