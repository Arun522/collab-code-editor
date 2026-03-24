const TOTAL_COLORS = 12;
const colors = [];

for (let i = 0; i < TOTAL_COLORS; i++) {
  const hue = Math.round((360 / TOTAL_COLORS) * i);
  colors.push(`hsl(${hue}, 80%, 60%)`);
}

let colorIndex = 0;

export function getNextCursorColor() {
  const color = colors[colorIndex % colors.length];
  colorIndex++;
  return color;
}

export { colors as cursorColors };
