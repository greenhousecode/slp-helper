
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
      testUrl: /www\.example\.com/,
    },

    // Data layer example
    id: () => window.dataLayer.filter(entry => entry.sku).pop().sku,

    // Will return the 3rd URL path segment, e.g. "http://www.example.com/test/foo/bar/"
    // (Omit this field to return "none")
    category: () => window.slp.getUrlPathSegment(2), // "bar"

    // Use function expressions to actively watch for value updates
    title: () => document.querySelector('h1').textContent,

    // Omit the "clickUrl" field to return the current URL without query parameters or hash

    // No existence checks needed, SLP Helper will re-attempt silently until a non-empty value is returned
    imageUrl: () => document.querySelector('img').src,

    // Example item availability check
    available: () => !!document.querySelector('.in-stock'),

    // Constants
    advertiserId,
    dynamicInputId,
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
    // Do something with 'result' here, before dispatching it through lemonpi.push
    window.lemonpi.push(result);
  };

  window.slp.scrape({
    config: {
      testUrl: /www\.example\.com\/\w+\/\w+\/\w+/,

      // Empty fields throw errors by default, these will be ignored
      optionalFields: ['logoUrl'],

      // Keep watching for value updates, and scrape every time there are changes
      watchChanges: true,

      // Not recommended, use "lemonpi_debug" somewhere in the query string or hash instead
      debug: true,
    },

    // Omit the 'id' field if you want to auto-generate a unique hash based on all values below

    // Will return a URL query parameter, e.g. "http://www.example.com/?productCategory=foo"
    category: () => window.slp.getUrlQueryParameter('productCategory'), // "foo"

    // All values will be .trim()-med by default
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
  }, callback); // Optional: calls a function with the result object, instead of pushing to LemonPI
}());
```

## Configuration (`config`)

You can configure the way the SLP Helper will behave through the `config` object.

* **`testUrl`** (`RegEx`)
Pass a regular expression to test agains `location.href`. The SLP Helper won't scrape on fail.

* **`optionalFields`** (`Array`)
Pass an array of field names (strings) that may scrape empty or undefined. (Doesn't apply to required fields, see below)

* **`watchChanges`** (`Boolean`, default: `false`)
Set to true to expect multiple value changes (multiple scrapes) throughout a single page visit. User input and/or asynchronous calls are the most common causes. (Will force to `true` when `longestViewed` is set)

* **`longestViewed`** (`Boolean`, default: `false`)
Set to true to simulate a non-existing LemonPI business rule "Longest viewed by user". This functionality is achieved by scraping every second a user is active on the page. This only works when used in conjunction with the "Most viewed by user" business rule in LemonPI Manage.

* **`interval`** (`Integer`, default: `500`)
The amount of milliseconds of delay between value checks.

* **`debug`** (`Boolean`, default: `false`)
Set to true to enforce console debugging. Not recommended, put *lemonpi_debug* somewhere in the query string to achieve the same.

## Methods

* **`window.slp.getUrl()`**
Will return the current URL without query parameters and hash, and accepts optional configuration.

```javascript
// Example
window.slp.getUrl({
  allowedParameters: ['foo', 'bar'],
  customParameters: { baz: 'qux' },
  hash: true,
});
```

See examples above for usage.

* **`window.slp.getUrlPathSegment()`**
Use this method to get all URL path segments (array), or a certain URL path segment (string). See
examples above for usage.

* **`window.slp.getUrlQueryParameter()`**
This method will let you grab all URL query parameters (object), or a certain URL query parameter
(string). See examples above for usage.

* **`window.slp.generateHash()`**
Will return a unique string ([-0-9]) based on the first argument input (may be string, number, array, boolean, or object).

* **`window.slp.getBackgroundImageUrl()`**
Returns the computed background image URL of a supplied element, or element selector.

* **`window.slp.scrape()`**
Will perform `window.lemonpi.push()` when the output is considered valid.

## LemonPI field defaults and value types

### Required

* **`title`** (`String`)
* **`imageUrl`** (`String`)
* **`advertiserId`** (`Integer`)
* **`dynamicInputId`** (`Integer`)

### Required, but with default values

* **`id`** (`String`, default: `"91374653451044"` [unique hash based on all field values])
* **`category`** (`String`, default: `"none"`)
* **`clickUrl`** (`String`, default: `"https://..."` [current URL without parameters])
* **`available`** (`Boolean`, default: `true`)
* **`type`** (`String`, default: `"propSeen"`, other values: `"propInBasket"`, `"propPurchased"`)

### Optional

* **`description`** (`String`)
* **`logoUrl`** (`String`)
* **`expiresOn`** (`String`)
* **`priceNormal`** (`String`)
* **`priceDiscount`** (`String`)
* **`stickerText`** (`String`)
* **`custom1`** (`String`)
* **`custom2`** (`String`)
* **`custom3`** (`String`)
* **`custom4`** (`String`)
