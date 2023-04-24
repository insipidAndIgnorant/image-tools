export async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, time);
  })
}

export async function sleep_while(condtion_func, deadline = 10000) {
  let start = Date.now();
  for (; true;) {
    let now = Date.now();
    let condition = await condtion_func(start, now);
    if (condition == false || now - start > deadline) break;

    let next_sleep_time = 300;
    if (typeof condition === 'number') {
      next_sleep_time = condition;
    }
    await sleep(next_sleep_time);
  }
}