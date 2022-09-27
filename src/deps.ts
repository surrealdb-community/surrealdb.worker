export * from 'surrealdb.js'
export { default as Surreal } from 'surrealdb.js'
export * from 'nanoid'

// TODO import it from surreal.js
export class Live<T = unknown> {
  kill() {}
}
