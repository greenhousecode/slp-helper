/*! @bluemango/slp-helper - v1.0.0 - 2017-08-01 */

window.lemonpi = window.lemonpi || [];

(function () {
  const fieldTypes = {
    booleans: ['available'],
    numbers: ['advertiserId', 'dynamicInputId'],
    strings: ['category', 'clickUrl', 'custom1', 'custom2', 'custom3', 'custom4', 'description',
      'expiresOn', 'id', 'imageUrl', 'logoUrl', 'priceDiscount', 'priceNormal', 'stickerText',
      'title', 'type'],
    required: ['advertiserId', 'available', 'category', 'clickUrl', 'dynamicInputId', 'imageUrl',
      'title', 'type'],
  };
  const fieldNames = fieldTypes.booleans
    .concat(fieldTypes.numbers, fieldTypes.strings);
  const config = {
    debug: /lemonpi_debug/.test(window.top.location.href),
    optionalFields: [],
    scrapeOnce: false,
    testUrl: /./,
    timeout: 500,
  };
  let result;
  let errors;
  let errorFieldNames = [];
  let lastScrapedHash;

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  const hashObject = (obj) => {
    const string = JSON.stringify(obj);
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

  // In debug mode, log errors to the console
  const logError = (message) => {
    console.log(
      `%cSLP%c ${message}`,
      'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444',
      'color: red'
    );
  };

  // Returns URL path segments, e.g. "example.com/foo/bar" > ['foo', 'bar']
  const getUrlPathSegment = (index) => {
    const urlPath = window.top.location.pathname
      .split('/')
      .filter(segment => segment)
      .map(segment => decodeURI(segment));

    if (typeof index === 'number') {
      return urlPath[index];
    }

    return urlPath;
  };

  // Returns query parameters, e.g. "example.com/?foo=bar" > { foo: 'bar' }
  const getUrlQueryParameter = (key) => {
    const parameters = window.top.location.search
      .replace(/^\?/, '')
      .split('&')
      .filter(parameter => parameter)
      .reduce((queries, parameter) =>
        Object.assign(queries, {
          [decodeURI(parameter.split('=')[0])]: decodeURI(parameter.split('=')[1]),
        }), {});

    if (typeof key === 'string') {
      return parameters[key];
    }

    return parameters;
  };

  // Merges and tests configuration
  const handleConfig = (userConfig) => {
    Object.assign(config, userConfig);

    if (config.testUrl && config.testUrl.test && !config.testUrl.test(window.top.location.href)) {
      errors.push(`The URL doesn't meet the requirements of '${config.testUrl.toString()}'`);
    }
  };

  // Evals, wraps and returns the callback result in a try-catch
  const handleFunction = (fieldName, func) => {
    let funcResult;

    try {
      funcResult = func();
    } catch (e) {
      if (!errorFieldNames.includes(fieldName)) {
        errors.push(`Something went wrong in the '${fieldName}' function: ${e.message}`);
        errorFieldNames.push(fieldName);
      }
    }

    return funcResult;
  };

  // Returns the current URL with optional query string parameters and / or hash
  const getUrl = (urlConfig) => {
    let url =
      `${window.top.location.protocol}//${window.top.location.host}${window.top.location.pathname}`;

    if (urlConfig) {
      if (urlConfig.allowedParameters && urlConfig.allowedParameters.length) {
        url += urlConfig.allowedParameters.reduce((newUrl, parameter, index) => {
          const separator = index === 0 ? '?' : '&';
          const key = encodeURI(parameter);
          const value = encodeURI(getUrlQueryParameter(parameter));
          return `${newUrl}${separator}${key}=${value}`;
        });
      }

      if (urlConfig.customParameters) {
        const parameters = Object.keys(urlConfig.customParameters);
        parameters.forEach((parameter, index) => {
          const separator = !urlConfig.allowedParameters.length && index === 0 ? '?' : '&';
          const key = encodeURI(parameter);
          const value = encodeURI(urlConfig.customParameters[parameter]);
          url += `${url}${separator}${key}=${value}`;
        });
      }

      if (urlConfig.hash) {
        url += window.top.location.hash;
      }
    }

    return url;
  };

  // Checks, sanitizes and returns allowed values for allowed fields
  const getValue = (fieldName, fieldValue) => {
    let value = fieldValue;

    if (typeof value === 'function') {
      value = handleFunction(fieldName, value);
    }

    switch (typeof value) {
      case 'boolean':
        if (!fieldTypes.booleans.includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' doesn't expect a boolean value`);
          errorFieldNames.push(fieldName);
        }
        break;

      case 'number':
        if (!fieldTypes.numbers.includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' doesn't expect a number value`);
          errorFieldNames.push(fieldName);
        }
        break;

      case 'string':
        value = value.trim();

        if (!fieldTypes.strings.includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' doesn't expect a string value`);
          errorFieldNames.push(fieldName);
        }
        break;

      default:
        if (!errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' can't be of type ${typeof value}`);
          errorFieldNames.push(fieldName);
        }
        break;
    }

    return value;
  };

  // Main scrape action
  const scrape = (input, cb) => {
    result = {};
    errors = [];
    errorFieldNames = [];

    // Test if the DOM is reachable
    if (window.top.location.host !== window.self.location.host) {
      errors.push('The Smart LemonPI Pixel is placed in an unfriendly iframe');
    }

    if (input.config) {
      handleConfig(input.config);
    }

    if (!errors.length) {
      // Add result values for valid fields
      Object.keys(input).forEach((fieldName) => {
        if (fieldNames.includes(fieldName)) {
          result[fieldName] = getValue(fieldName, input[fieldName]);
        }
      });
    }

    // Remove empty fields
    Object.keys(result).forEach((fieldName) => {
      if (result[fieldName] === undefined || result[fieldName] === '') {
        delete result[fieldName];

        if (!config.optionalFields.includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' is empty`);
          errorFieldNames.push(fieldName);
        }
      }
    });

    if (!errors.length) {
      if (['propInBasket', 'propPurchased'].includes(result.type)) {
        fieldTypes.required = ['id', 'advertiserId', 'dynamicInputId'];
      }

      // Check for missing required fields
      fieldTypes.required.forEach((fieldName) => {
        if (!Object.keys(result).includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' is required and missing`);
          errorFieldNames.push(fieldName);
        }
      });
    }

    const resultHash = hashObject(result);

    // Only perform actions when there's new data to be scraped
    if (resultHash !== lastScrapedHash) {
      lastScrapedHash = resultHash;

      if (!errors.length) {
        if (cb) {
          // Execute an optional callback function instead of pushing to LemonPI
          cb(result);
        } else {
          window.lemonpi.push(result);
        }

        if (config.scrapeOnce) {
          // Stop watching
          return;
        }
      } else if (config.debug) {
        errors.forEach(logError);
      }
    }

    // Monitor any changes by calling itself again
    setTimeout(() => {
      scrape(input);
    }, config.timeout);
  };

  window.slp = {
    getUrl,
    getUrlPathSegment,
    getUrlQueryParameter,
    scrape,
  };
}());
