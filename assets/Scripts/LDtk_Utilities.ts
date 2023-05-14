export function transformEntityPositionToCocosPosition({ x, y, width, height, }, { xOffset, yOffset, }) {
  const xTranslated = x - xOffset;
  const yTranslated = y - yOffset;
  // invert y axis
  const yInverted = flipYPosition(yTranslated, height);
  // simulate anchor point at center
  return { x: xTranslated - (width / 2), y: yInverted + height };
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