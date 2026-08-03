/**
 * patch.js
 * 
 * Robust monkey-patch for getComputedStyle to prevent crashes in external libraries 
 * (like dom-accessibility-api) when elements are detached or the document context is lost.
 * 
 * This must be imported at the very top of the entry point to ensure it runs before 
 * other dependencies are initialized.
 */
(function() {
  const originalGetComputedStyle = window.getComputedStyle;
  
  // Ensure we don't patch twice
  if (window.__sri_patched__) return;
  window.__sri_patched__ = true;

  window.getComputedStyle = function(el, pseudo) {
    try {
      if (!el) return null;
      const style = originalGetComputedStyle(el, pseudo);
      if (style) return style;
    } catch (e) {
      // Fall through to dummy
    }

    // Return a dummy style declaration if the real one is null or failed.
    // This allows calls like style.getPropertyValue('content') or style.display to work.
    return {
      getPropertyValue: () => "",
      display: "none",
      visibility: "hidden",
      content: "",
      opacity: "0",
      // Add a simple index-based accessor just in case
      0: "",
      length: 0
    };
  };
})();
