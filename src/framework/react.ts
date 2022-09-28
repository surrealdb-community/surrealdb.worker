import { contentWrapper, WrapWorkerContent } from "../client.js";
import { WorkerContent } from "../shared.js";
import { Signal, signal } from "@preact/signals-core";
import { Live } from "../deps.js";

export type ReactReturn<T = any> = {
  loading: Signal<boolean>;
  error: Signal<any>;
  result: Signal<T | null>;
};

export type ReactWrapWorkerContent<C extends WorkerContent> = {
  query: {
    [K in keyof C["query"]]: (
      ...args: Parameters<C["query"][K]>
    ) => ReactReturn<Awaited<ReturnType<C["query"][K]>>>;
  };
  live: {
    [K in keyof C["live"]]: (
      ...args: Parameters<C["live"][K]>
    ) => Awaited<ReturnType<C["live"][K]>> extends Live<infer X>
      ? ReactReturn<X>
      : never;
  };
};

function emptyReturn(): ReactReturn<any> {
  return {
    loading: signal(true),
    error: signal(null),
    result: signal(null),
  };
}

export const react: <C extends WorkerContent>(
  c: WrapWorkerContent<C>,
) => ReactWrapWorkerContent<C> = contentWrapper(
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
