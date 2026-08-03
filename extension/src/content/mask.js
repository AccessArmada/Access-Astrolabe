/**
 * mask.js
 *
 * Unified mask management for both Vision Mask (full screen dim/blur)
 * and Peek Mode (spotlight readout).
 */

let maskElement = null;
let isVisionMaskEnabled = false;
let isPeekEnabled = false;

let maskOpacity = 0.7;

export function toggleMask(enabled) {
  isVisionMaskEnabled = enabled;
  updateMaskDisplay();
}

export function togglePeekMask(enabled) {
  isPeekEnabled = enabled;
  updateMaskDisplay();
}

export function updateMaskOpacity(opacity) {
  maskOpacity = opacity;
  if (maskElement) {
    maskElement.style.backgroundColor = `rgba(0, 0, 0, ${maskOpacity})`;
  }
}

function updateMaskDisplay() {
  const needsElement = isVisionMaskEnabled || isPeekEnabled;

  if (needsElement) {
    if (!maskElement) {
      maskElement = document.createElement('div');
      maskElement.id = 'sri-universal-mask';
      Object.assign(maskElement.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: `rgba(0, 0, 0, ${maskOpacity})`,
        pointerEvents: 'none',
        zIndex: '2147483645',
        transition: 'opacity 0.3s ease, -webkit-mask-image 0.15s ease-out, mask-image 0.15s ease-out',
        display: 'block'
      });
      document.documentElement.appendChild(maskElement);
    }

    // Apply styles based on mode
    if (isVisionMaskEnabled) {
      maskElement.style.backdropFilter = 'blur(10px)';
      maskElement.style.webkitBackdropFilter = 'blur(10px)';
    } else {
      maskElement.style.backdropFilter = 'none';
      maskElement.style.webkitBackdropFilter = 'none';
    }

    if (!isPeekEnabled) {
      maskElement.style.webkitMaskImage = 'none';
      maskElement.style.maskImage = 'none';
    }
  } else {
    removeMask();
  }
}

function removeMask() {
  if (maskElement && maskElement.parentNode) {
    maskElement.parentNode.removeChild(maskElement);
  }
  maskElement = null;
}

/**
 * Updates the spotlight variables for Peek mode.
 * Uses mask-image to create the transparent cutout.
 */
export function updatePeekMaskVars({ focusX, focusY, focusSize, blurRadius } = {}) {
  if (!maskElement || !isPeekEnabled) return;

  if (focusX && focusY && focusSize) {
    const blur = blurRadius || '64px';
    // Use a radial gradient for the mask.
    // Transparent in the center, transitioning to black (opaque mask).
    const maskValue = `radial-gradient(circle ${focusSize} at ${focusX} ${focusY}, transparent 0%, transparent 80%, black 100%)`;

    maskElement.style.webkitMaskImage = maskValue;
    maskElement.style.maskImage = maskValue;
  }
}

/**
 * Sets the mask to fully dark (no spotlight)
 */
export function setPeekMaskFullDark(fullDark) {
  if (!maskElement || !isPeekEnabled) return;

  if (fullDark) {
    maskElement.style.webkitMaskImage = 'none';
    maskElement.style.maskImage = 'none';
  }
}
