(function () {
  'use strict';

  const RELAY_EVENT = '__astrolabe_ariaNotify';

  function makeInterceptor(originalFn, source) {
    return function ariaNotify(message, options) {
      const result = originalFn.call(this, message, options);

      document.dispatchEvent(new CustomEvent(RELAY_EVENT, {
        detail: {
          message,
          priority: options?.priority ?? 'normal',
          source,
          timestamp: Date.now()
        }
      }));

      return result;
    };
  }

  if (typeof Element.prototype.ariaNotify === 'function') {
    Element.prototype.ariaNotify = makeInterceptor(
      Element.prototype.ariaNotify,
      'element'
    );
  }

  if (typeof Document.prototype.ariaNotify === 'function') {
    Document.prototype.ariaNotify = makeInterceptor(
      Document.prototype.ariaNotify,
      'document'
    );
  }
})();
