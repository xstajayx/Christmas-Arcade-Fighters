export async function requestGameFullscreen(
  element: HTMLElement,
): Promise<boolean> {
  if (typeof element.requestFullscreen !== "function") return false;
  try {
    await element.requestFullscreen();
    return document.fullscreenElement === element;
  } catch {
    return false;
  }
}
