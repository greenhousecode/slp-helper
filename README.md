# SLP Helper

This library gives you shortcuts to develop Smart LemonPI Pixels. It also acts as an active value
watcher, so you don't need to build in existence checks or wrap timeouts and intervals.

## Methods

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

See examples below for usage.

### `window.slp.getUrlPathSegment()`

Use this method to get all URL path segments (array), or a certain URL path segment (string). See
examples below for usage.

### `window.slp.getUrlQueryParameter()`

This method will let you grab all URL query parameters (object), or a certain URL query parameter
(string). See examples below for usage.

### `window.slp.scrape()`

Will perform `window.lemonpi.push()` when the output is considered valid. Structure:

```javascript
window.slp.scrape({
  config: {
    // Defaults:
    debug: /lemonpi_debug/.test(window.top.location.href),
    optionalFields: [],
    scrapeOnce: false,
    testUrl: /./,
    timeout: 500,
  },
  
  id: '',
  title: '',
  clickUrl: '',
  imageUrl: '',
  category: '',
  description: '',
  logoUrl: '',
  available: false,
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

## Basic example (ES6)

```javascript
// Recommended: wrap an IFFE around your code to isolate it from the target website
(function(){
  const advertiserId = 0;
  const dynamicInputId = 0;
  
  window.slp.scrape({
    // Optional (but recommended) configuration
    config: {
      // Whitelist specific URLs using RegEx
      urlCheck: /www\.example\.com\/\w+\/\w+\/\w+/,
    },
    
    // A custom 'id' field is only necessary if you plan to use propInBasket or propPurchased
    
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
(function(){
  const advertiserId = 0;
  const dynamicInputId = 0;
  
  window.slp.scrape({
    config: {
      urlCheck: /www\.example\.com\/\w+\/\w+\/\w+/,
    
      // Non-empty field values are required by default, this will whitelist allowed empty fields
      optionalFields: ['logoUrl', 'custom1'],
    
      // The amount of milliseconds of delay between value checks
      timeout: 500,
    
      // Set to true if you know values won't change without a page refresh
      scrapeOnce: false,
    
      // Not recommended, use "lemonpi_debug" somewhere in the query string or hash instead
      debug: true,
    },
    
    // Data layer example
    id: () => window.dataLayer.filter(v => v.sku).pop().sku,
    
    // Will return a query parameter, e.g. "http://www.example.com/?productCategory=foo" -> "foo"
    category: () => window.slp.getUrlQueryParameter('productCategory'),
    
    //
    title:,
    
    // Advanced usage of window.slp.getUrl
    clickUrl: () => window.slp.getUrl({
      // Allow specified URL paramters to be added to the returned URL
      allowedParameters: ['productColor', 'productCategory'],
      
      // Add custom parameters to the URL
      customParameters: {
        expandDetails: 'yes',
      },
      
      // Allow the hash to be added to the returned URL
      hash: true,
    }),
    
    imageUrl:,
    logoUrl:,
    
    // Constants
    advertiserId,
    dynamicInputId,
    type: 'propSeen',
  });
}());
```