import { lockUntilDeath } from "./shared"

export async function strartWorker(uri: URL, name = 'default') {
  if(SharedWorker) {
    new SharedWorker(uri, {name})
    return
  }

  let r = () => {}
  const p = new Promise<void>((res) => {r = res})

  await lockUntilDeath('@surrealdb@workergen@' + name)

  navigator.locks.request('@surreldb@worker@' + name, async () => {
    const w = new Worker(uri, {name})

    w.addEventListener('message', () => r())

    await p
  })
}