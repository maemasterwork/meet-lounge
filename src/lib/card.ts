/** 16-digit card number as "1234 5678 9012 3456". Anything else is returned unchanged. */
export const fmtCard = (c?: string): string => (c && /^[0-9]{16}$/.test(c) ? c.replace(/(\d{4})(?=\d)/g, '$1 ') : c ?? '')
