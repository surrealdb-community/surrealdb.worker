import type * as SDB from 'surrealdb.js'
// TODO: Replace with real implementation
export type Live<T = any> = ReturnType<SDB.default['sync']>