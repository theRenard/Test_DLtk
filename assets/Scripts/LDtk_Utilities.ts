export function transformEntityPositionToCocosPosition({ x, y, width, height, }, { xOffset, yOffset, }) {
  const xAdapted = x - xOffset;
  const yAdapted = y - yOffset;
  // invert y axis
  const yInverted = flipYPosition(yAdapted, height);
  // simulate anchor point at center
  return { x: xAdapted, y: yInverted + height };
}

export function flipYPosition(y, height) {
  return (y + height) * -1;
}

export function transformToCenter({ x, y , width, height }) {
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
}