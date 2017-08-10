# SLP Helper

This library gives you shortcuts to develop Smart LemonPI Pixels. It also acts as an active value
watcher, so you don't need to build in existence checks, or wrap timeouts and intervals.

## Basic example (ES6)

```javascript
// Recommended: wrap an IIFE around your code to isolate it from the target website
(function () {
  const advertiserId = 0;
  const dynamicInputId = 0;
  
  window.slp.scrape({
    // Optional (but recommended) configuration
    config: {
      // Whitelist specific URLs using RegEx
      testUrl: /www\.example\.com\/\w+\/\w+\/\w+/,
    },
    
    // Data layer example
    id: () => window.dataLayer.filter(entry => entry.sku).pop().sku,
    
    // Will return the 3rd URL path segment, e.g. "http://www.example.com/test/foo/bar/" -> "bar"
    category: () => window.slp.getUrlPathSegment(2),
    
    // Use function expressions to actively watch for value updates
    title: () => document.querySelector('h1').textContent,
    
    // Gets the current URL without query parameters or hash
    clickUrl: window.slp.getUrl,
    
    // No checks needed, SLP Helper will re-attempt silently until a non-empty value is returned
    imageUrl: () => document.querySelector('img').src,
    
    // Example item availability check
    available: () => !!document.querySelector('.in-stock'),
    
    // Constants
    advertiserId,
    dynamicInputId,
    type: 'propSeen',
  });
}());
```

## Advanced example (ES6)

```javascript
(function () {
  const advertiserId = 0;
  const dynamicInputId = 0;
  
  // Optional custom callback
  const callback = (result) => {
    // Do something with 'result' here before it's pushed to LemonPI
    
    window.lemonpi.push(result);
  };
  
  window.slp.scrape({
    config: {
      testUrl: /www\.example\.com\/\w+\/\w+\/\w+/,
    
      // Empty fields throw errors by default, these will be ignored
      optionalFields: ['logoUrl'],
    
      // Stops watching for value updates
      scrapeOnce: true,
    
      // The amount of milliseconds of delay between value checks
      timeout: 1000,
    
      // Not recommended, use "lemonpi_debug" somewhere in the query string or hash instead
      debug: true,
    },
    
    // Omit the 'id' field if you want to auto-generate a unique hash based on all values below
    
    // Will return a query parameter, e.g. "http://www.example.com/?productCategory=foo" -> "foo"
    category: () => window.slp.getUrlQueryParameter('productCategory'),
    
    title: () => document.querySelector('h1').textContent,
    
    // Advanced usage of window.slp.getUrl()
    clickUrl: () => window.slp.getUrl({
      // Allow specified URL paramters to be added to the returned URL
      allowedParameters: ['productColor', 'productCategory'],
      
      // Add custom parameters to the URL
      customParameters: {
        foo: 'bar',
      },
      
      // Allow the hash to be added to the returned URL
      hash: true,
    }),
    
    imageUrl: () => document.querySelector('img').src,
    
    // Defined as optional above, will continue to scrape without its existence
    logoUrl: () => document.querySelector('img.logo').src,
    
    // Constants
    advertiserId,
    dynamicInputId,
    type: 'propSeen',
  }, callback); // Optional: calls a function with the result object, instead of pushing to LemonPI
}());
```

## All methods

### `window.slp.getUrl()`

Will return the current URL without query parameters and hash, and accepts optional configuration:

```javascript
// Defaults:
window.slp.getUrl({
  allowedParameters: [],
  customParameters: {},
  hash: false,
});
```

See examples above for usage.

### `window.slp.getUrlPathSegment()`

Use this method to get all URL path segments (array), or a certain URL path segment (string). See
examples above for usage.

### `window.slp.getUrlQueryParameter()`

This method will let you grab all URL query parameters (object), or a certain URL query parameter
(string). See examples above for usage.

### `window.slp.scrape()`

Will perform `window.lemonpi.push()` when the output is considered valid. Structure:

```javascript
window.slp.scrape({
  config: {
    // Default configuration
    debug: /lemonpi_debug/.test(window.top.location.href),
    optionalFields: [],
    scrapeOnce: false,
    testUrl: /./,
    timeout: 500,
  },
  
  // LemonPI fields
  id: '',
  title: '',
  clickUrl: '',
  imageUrl: '',
  category: '',
  description: '',
  logoUrl: '',
  available: true,
  expiresOn: '',
  priceNormal: '',
  priceDiscount: '',
  stickerText: '',
  custom1: '',
  custom2: '',
  custom3: '',
  custom4: '',
  type: '',
  advertiserId: 0,
  dynamicInputId: 0,
}, callback);
```

See examples above for usage.