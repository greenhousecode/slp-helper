/*! @bluemango/slp-helper - v1.0.0 - 2017-08-01 */

window.lemonpi = window.lemonpi || [];

(function () {
  const fieldProperties = {
    booleans: ['available'],
    numbers: ['advertiserId', 'dynamicInputId'],
    strings: ['category', 'clickUrl', 'custom1', 'custom2', 'custom3', 'custom4', 'description',
      'expiresOn', 'id', 'imageUrl', 'logoUrl', 'priceDiscount', 'priceNormal', 'stickerText',
      'title', 'type'],
    required: ['advertiserId', 'available', 'category', 'clickUrl', 'dynamicInputId', 'imageUrl',
      'title', 'type'],
  };
  const fields = fieldProperties.booleans.concat(fieldProperties.numbers, fieldProperties.strings);
  let result;
  let errors;
  let lastScrapedId;

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  const hashString = (string) => {
    let hash = 0;
    let chr;
    if (string.length === 0) return hash;
    for (let i = 0; i < string.length; i += 1) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr; // eslint-disable-line no-bitwise
      hash |= 0; // eslint-disable-line no-bitwise
    }
    return hash.toString();
  };

  // Returns URL path values, e.g. "example.com/foo/bar" > ['foo', 'bar']
  const getUrlPath = (index) => {
    const urlPath = location.pathname
      .split('/')
      .filter(dir => dir)
      .map(dir => decodeURI(dir));

    if (typeof index === 'number') {
      return urlPath[index];
    }

    return urlPath;
  };

  // Returns query parameters, e.g. "example.com/?foo=bar" > { foo: 'bar' }
  const getUrlQuery = (key) => {
    const parameters = location.search
      .replace(/^\?/, '')
      .split('&')
      .filter(v => v)
      .reduce((queries, parameter) =>
        Object.assign(queries, {
          [decodeURI(parameter.split('=')[0])]: decodeURI(parameter.split('=')[1]),
        }), {});

    if (typeof key === 'string') {
      return parameters[key];
    }

    return parameters;
  };

  // Returns trimmed text content from an element selector
  const getText = (selector) => {
    const element = window.top.document.querySelector(selector);
    return (element && element.textContent && element.textContent.trim())
      ? element.textContent.trim()
      : undefined;
  };

  const handleConfig = (config) => {
    if (config.testUrl && config.testUrl.test && !config.testUrl.test(location.href)) {
      errors.push(`The URL doesn't meet the requirements of "${config.testUrl.toString()}"`);
    }
  };

  // Evals, wraps and returns the callback result in a try-catch
  const handleFunction = (func) => {
    let funcResult;

    try {
      funcResult = func();
    } catch (e) {} // eslint-disable-line no-empty

    return funcResult;
  };

  // const handleObject = (obj) => {
  //   switch (obj.type) {
  //     case 'urlPath':
  //       return urlPath[obj.index];
  //
  //     case 'urlQuery':
  //       return urlQuery[obj.key];
  //
  //     case 'image': {
  //       const element = window.top.document.querySelector(obj.selector);
  //       return (element && element.src)
  //         ? element.src
  //         : undefined;
  //     }
  //
  //     case 'backgroundImage': {
  //       const element = window.top.document.querySelector(obj.selector);
  //
  //       if (element) {
  //         return window.getComputedStyle(element).getPropertyValue('background-image')
  //           .replace(/url\(['"]?|['"]?\)/g, '');
  //       }
  //
  //       return undefined;
  //     }
  //
  //     case 'text': {
  //       const string = text(obj.selector);
  //
  //       if (!string && !obj.optional) {
  //         errors.push(`The element "${obj.selector}" doesn't contain text`);
  //       }
  //
  //       return string;
  //     }
  //
  //     case 'url': {
  //       let url = `${location.protocol}//${location.host}${location.pathname}`;
  //
  //       if (obj.queryParameters && obj.queryParameters.length) {
  //         url += obj.queryParameters.reduce((newUrl, parameter, index) => {
  //           const key = encodeURI(parameter);
  //           const value = encodeURI(urlQuery[parameter]);
  //           return `${newUrl}${(index > 0 ? '&' : '?')}${key}=${value}`;
  //         });
  //       }
  //
  //       if (obj.customQueryParameters) {
  //         const parameters = Object.keys(obj.customQueryParameters);
  //
  //         parameters.forEach((parameter, index) => {
  //           url += `${url}${(index > 0 ? '&' : '?')}${parameter}=${urlQuery[parameter]}`;
  //           // TODO
  //         });
  //       }
  //
  //       if (obj.hash) {
  //         url += location.hash;
  //       }
  //
  //       return url;
  //     }
  //
  //     default:
  //       return undefined;
  //   }
  // };

  const handleValue = (key, value) => {
    let newValue = value;

    if (typeof newValue === 'function') {
      newValue = handleFunction(newValue);
    }// else if (typeof newValue === 'object') {
    //   newValue = handleObject(newValue);
    // }

    switch (typeof newValue) {
      case 'boolean':
        if (!fieldProperties.booleans.includes(key)) {
          errors.push(`"${key}" doesn't allow boolean values`);
        }
        break;

      case 'number':
        if (!fieldProperties.numbers.includes(key)) {
          errors.push(`"${key}" doesn't allow number values`);
        }
        break;

      case 'string':
        newValue = newValue.trim();

        if (!fieldProperties.strings.includes(key)) {
          errors.push(`"${key}" doesn't allow string values`);
        }
        break;

      default:
        break;
    }

    result[key] = newValue;
  };

  const scrape = (obj) => {
    result = {};
    errors = [];

    // Make sure all the config prerequisites are met
    if (obj.config) {
      handleConfig(obj.config);
    }

    if (!errors.length) {
      // Add result values for valid fields
      Object.keys(obj).forEach((key) => {
        if (fields.includes(key)) {
          handleValue(key, obj[key]);
        }
      });
    }

    // Generate a unique ID based the result values
    if (!result.id) {
      result.id = hashString(JSON.stringify(result));
    }

    // Remove empty fields
    Object.keys(result).forEach((field) => {
      if ([undefined, ''].contains(result[field])) {
        delete result[field];

        // Check for required fields
        if (fieldProperties.required.contains(field)) {
          errors.push(`"${field}" is required and can't be empty`);
        }
      }
    });

    // No errors found; return and push the result object to LemonPI
    if (!errors.length && result.id !== lastScrapedId) {
      lastScrapedId = result.id;
      // TODO: uncomment
      // window.lemonpi.push(result);
      console.log(result); // Debug
      return result;
    }

    // If there are errors and "lemonpi_debug" is found in the URL, log them to the console
    if (/lemonpi_debug/.test(location.href)) {
      errors.forEach((error) => {
        console.log(
          `%cSLP%c ${error}`,
          'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444',
          'color: red'
        );
      });
    }

    return false;
  };

  window.slp = {
    getUrlPath,
    getUrlQuery,
    getText,
    scrape,
  };
}());
