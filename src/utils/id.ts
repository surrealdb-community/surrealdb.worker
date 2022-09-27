export function newId() {
  let id = 0

  return () => {
    id = (id + 1) % Number.MAX_SAFE_INTEGER
    return id.toString()
  }
}