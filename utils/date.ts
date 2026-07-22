export function todayDate(now = new Date()) {
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return `${shanghai.getUTCFullYear()}-${String(shanghai.getUTCMonth() + 1).padStart(2, '0')}-${String(shanghai.getUTCDate()).padStart(2, '0')}`
}
