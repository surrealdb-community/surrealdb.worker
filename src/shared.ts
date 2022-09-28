import type * as SDB from "surrealdb.js";
import { Live } from "./deps.js";


export const MAIN_BC = "@surrealdb@main@";
export const ALL_PREFIX = "@surrealdb@";

export interface KillRequest<CONTENT extends WorkerContent> {
  method: 'kill';
  id: string;
}
export type DataRequest<
  CONTENT extends WorkerContent,
  METHOD extends "query" | "live" = 'query' | 'live',
  NAME extends keyof CONTENT[METHOD] = keyof CONTENT[METHOD]
> = {
  id: string;
  method: METHOD;
  name: NAME;
  vars: Parameters<CONTENT[METHOD][NAME]>;
};

export interface StartRequest {
  type: "start";
  id: string;
}

export type Return = {
  type: 'return';
  id: string;
  err: any;
  res: any;
};

export type fn<T> = (con: SDB.default, ...args: unknown[]) => T;
export type WorkerContent = {
  startup: (con: SDB.default) => Promise<void>;
  query: Record<string, fn<Promise<unknown>>>;
  live: Record<string, fn<Live | Promise<Live>>>;
};

export function lockUntilDeath(name: string) {
  return new Promise<void>((res) => {
    navigator.locks.request(name, async () => {
      res()
      await new Promise(() => {})
    })
  })
}

export function resolvablePromise() {
  let r = () => {};
  const p = new Promise<void>((res) => {
    r = res;
  });

  return {
    promise: p,
    resolve: r,
  };
}

export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
