# Lessons Learned

## Browser & Environment Fixes
- **Sandboxed Iframe Global Fetch Writes**: In certain sandboxed iframe environments (such as some preview widgets/environments), the browser restricts direct reassignment to `window.fetch` or `globalThis.fetch` because they are configured as read-only getters.
- When libraries like `formdata-polyfill` (used in older `node-fetch` releases or deep dependencies) attempt to polyfill or monkeypatch `global.fetch = function (...)` where `global` resolves to the browser's `window` object, the browser throws an `Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter`.
- **Solution**: We can intercept and handle reassignments by defining a custom property descriptor with a getter and setter on both `window` and `globalThis` at the very top of `index.html` (inside the `<head>`) before any modules or libraries are executed:
  ```html
  <script>
    (function() {
      try {
        const originalFetch = window.fetch || (typeof globalThis !== 'undefined' && globalThis.fetch);
        if (originalFetch) {
          let currentFetch = originalFetch;
          const descriptor = {
            get() {
              return currentFetch;
            },
            set(val) {
              currentFetch = val;
            },
            configurable: true,
            enumerable: true
          };
          if (typeof window !== 'undefined') {
            Object.defineProperty(window, 'fetch', descriptor);
          }
          if (typeof globalThis !== 'undefined') {
            Object.defineProperty(globalThis, 'fetch', descriptor);
          }
        }
      } catch (e) {
        console.warn("Failed to patch fetch getter/setter:", e);
      }
    })();
  </script>
  ```
  This creates a configurable and writable `fetch` descriptor that routes any assignment to a local variable `currentFetch` rather than throwing, successfully preserving standard application behavior.
