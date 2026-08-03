let highlightBox = null;

export function updateHighlighter(element) {
  if (!element) {
    if (highlightBox && highlightBox.parentNode) {
      highlightBox.parentNode.removeChild(highlightBox);
    }
    highlightBox = null;
    return;
  }

  if (!highlightBox) {
    highlightBox = document.createElement('div');
    highlightBox.id = 'sri-highlighter';
    Object.assign(highlightBox.style, {
      position: 'absolute',
      border: '4px solid #ff00ff', // High contrast magenta
      boxShadow: '0 0 0 2px #000, 0 0 8px rgba(255,0,255,0.8)',
      pointerEvents: 'none',
      zIndex: '2147483647', // Maximum z-index, above the mask
      transition: 'all 0.15s ease-out',
      borderRadius: '2px' // slight rounding
    });
    // Append to documentElement or body. Document.documentElement is safer if body isn't fully ready but body is usually better for absolute positioning.
    document.body.appendChild(highlightBox);
  }

  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  Object.assign(highlightBox.style, {
    top: `${rect.top + scrollY - 4}px`, // Offset by border width
    left: `${rect.left + scrollX - 4}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });
}
