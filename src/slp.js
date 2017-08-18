window.lemonpi = window.lemonpi || [];

(function () {
  const consoleStyling = 'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444';
  const fieldTypes = {
    booleans: ['available'],
    numbers: ['advertiserId', 'dynamicInputId'],
    strings: ['category', 'clickUrl', 'custom1', 'custom2', 'custom3', 'custom4', 'description',
      'expiresOn', 'id', 'imageUrl', 'logoUrl', 'priceDiscount', 'priceNormal', 'stickerText',
      'title', 'type'],
    required: ['advertiserId', 'available', 'category', 'clickUrl', 'dynamicInputId', 'imageUrl',
      'title', 'type'],
  };
  const fieldNames = fieldTypes.booleans.concat(fieldTypes.numbers, fieldTypes.strings);
  const config = {
    debug: /lemonpi_debug/.test(window.top.location.href),
    optionalFields: [],
    timeout: 500,
  };
  let result;
  let errors;
  let errorFieldNames = [];
  let lastScrapedHash;

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  const generateHash = (input) => {
    const string = JSON.stringify(input);
    let hash = 0;
    let chr;

    for (let i = 0; i < string.length; i += 1) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr; // eslint-disable-line no-bitwise
      hash |= 0; // eslint-disable-line no-bitwise
    }

    return hash.toString();
  };

  // In debug mode, log errors to the console
  const logError = (message) => {
    console.log(`%cSLP%c ${message}`, consoleStyling, 'color: red');
  };

  // Returns an URL path segment
  const getUrlPathSegment = index => window.top.location.pathname
    .split('/')
    .filter(segment => segment)
    .map(segment => decodeURI(segment))[index];

  // Returns a query parameter
  const getUrlQueryParameter = key => window.top.location.search
    .replace(/^\?/, '')
    .split('&')
    .filter(parameter => parameter)
    .reduce((parameters, parameter) =>
      Object.assign(parameters, {
        [decodeURI(parameter.split('=')[0])]: decodeURI(parameter.split('=')[1]),
      }), {})[key];

  // Evaluates and returns the callback result within a try-catch
  const handleFunction = (fieldName, func) => {
    let funcResult;

    try {
      funcResult = func();
    } catch (e) {
      if (!errorFieldNames.includes(fieldName)) {
        errors.push(`'${fieldName}': ${e.message}`);
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
      let paramAdded = false;

      if (urlConfig.allowedParameters && urlConfig.allowedParameters.length) {
        urlConfig.allowedParameters.forEach((parameter) => {
          const separator = paramAdded ? '&' : '?';
          const key = encodeURI(parameter);
          const value = getUrlQueryParameter(parameter);

          if (value !== undefined) {
            url += `${separator}${key}=${encodeURI(value)}`;
            paramAdded = true;
          }
        });
      }

      if (urlConfig.customParameters) {
        const parameters = Object.keys(urlConfig.customParameters);
        parameters.forEach((parameter) => {
          const separator = paramAdded ? '&' : '?';
          const key = encodeURI(parameter);
          const value = encodeURI(urlConfig.customParameters[parameter]);
          url += `${separator}${key}=${value}`;
          paramAdded = true;
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

        // Enforce specific values or formatting for certain fields
        if (['category', 'id'].includes(fieldName) && /[^\da-z-]/.test(value)
            && /^-+$/.test(value) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' only allows lowercase letters, numbers and dashes`);
          errorFieldNames.push(fieldName);
        } else if (['clickUrl', 'imageUrl', 'logoUrl'].includes(fieldName)
            && !/^https?:\/\//.test(value) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' should be an URL and start with 'http://' or 'https://'`);
          errorFieldNames.push(fieldName);
        } else if (fieldName === 'expiresOn' && new Date(value).toString() === 'Invalid Date'
            && !errorFieldNames.includes(fieldName)) {
          errors.push("'expiresOn' should be an ISO 8601 formatted datetime string");
          errorFieldNames.push(fieldName);
        } else if (fieldName === 'type' && !errorFieldNames.includes(fieldName)
            && !['propInBasket', 'propPurchased', 'propSeen'].includes(value)) {
          errors.push("'type' should be 'propSeen', 'propInBasket', or 'propPurchased'");
          errorFieldNames.push(fieldName);
        }

        break;

      case 'undefined':
        if (!config.optionalFields.includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' is undefined`);
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
  const scrape = (input, callback) => {
    result = {};
    errors = [];
    errorFieldNames = [];

    // Test if the DOM is reachable
    if (window.top.location.host !== window.self.location.host) {
      if (config.debug) {
        logError('The Smart LemonPI Pixel is placed in an unfriendly iframe');
      }

      return;
    }

    // Merge and test configuration
    if (input.config) {
      Object.assign(config, input.config);

      if (config.testUrl && config.testUrl.test && !config.testUrl.test(window.top.location.href)) {
        if (config.debug) {
          logError(`The URL doesn't match '${config.testUrl.toString()}'`);
        }

        return;
      }
    }

    // Add result values for valid fields
    Object.keys(input).forEach((fieldName) => {
      if (fieldNames.includes(fieldName)) {
        result[fieldName] = getValue(fieldName, input[fieldName]);
      }
    });

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

    const hashedResult = generateHash(result);

    // Only perform actions when there's new data to be scraped
    if (hashedResult !== lastScrapedHash) {
      lastScrapedHash = hashedResult;

      // If the 'id' field is omitted, use a generated hash based on the whole result object
      if (!result.id) {
        result.id = hashedResult;
      }

      if (config.debug) {
        // Show errors, if any
        errors.forEach(logError);

        if (!callback) {
          // Show the result object
          console.log('%cSLP', consoleStyling, 'Result:', result);
        }
      }

      if (!errors.length) {
        if (callback) {
          // Execute an optional callback function instead of pushing straight to LemonPI
          callback(result);
        } else {
          window.lemonpi.push(result);
        }

        if (!config.watchChanges) {
          // Stop watching after one successful scrape
          return;
        }
      }
    }

    // Monitor any changes by calling itself again
    setTimeout(() => {
      scrape(input);
    }, config.timeout);
  };

  window.slp = {
    getUrlQueryParameter,
    getUrlPathSegment,
    generateHash,
    getUrl,
    scrape,
  };
}());
