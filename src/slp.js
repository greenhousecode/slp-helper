window.lemonpi = window.lemonpi || [];

(function () {
  const consoleStyling = 'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444';
  const fieldTypes = {
    booleans: ['available'],
    numbers: [
      'advertiserId',
      'dynamicInputId',
    ],
    strings: [
      'category',
      'clickUrl',
      'custom1',
      'custom2',
      'custom3',
      'custom4',
      'description',
      'expiresOn',
      'id',
      'imageUrl',
      'logoUrl',
      'priceDiscount',
      'priceNormal',
      'stickerText',
      'title',
      'type',
    ],
    required: [
      'advertiserId',
      'available',
      'category',
      'dynamicInputId',
      'imageUrl',
      'title',
      'type',
    ],
  };
  const fieldNames = fieldTypes.booleans.concat(fieldTypes.numbers, fieldTypes.strings);
  const config = {
    debug: /lemonpi_debug/.test(window.location.href),
    optionalFields: [],
    timeout: 500,
  };
  let result;
  let errors;
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
  const logError = (subject, message) => {
    console.log(`%cSLP%c ${subject}%c ${message}`, consoleStyling, 'color: red; font-weight: bold', 'color: red');
  };

  // Returns an URL path segment
  const getUrlPathSegment = index => window.location.pathname
    .split('/')
    .filter(segment => segment)
    .map(segment => decodeURI(segment))[index];

  // Returns a query parameter
  const getUrlQueryParameter = key => window.location.search
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
      if (!errors[fieldName] && !config.optionalFields.includes(fieldName)) {
        errors[fieldName] = e.message;
      }
    }

    return funcResult;
  };

  // Returns the current URL with optional query string parameters and / or hash
  const getUrl = (urlConfig) => {
    let url =
      `${window.location.protocol}//${window.location.host}${window.location.pathname}`;

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
        url += window.location.hash;
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
        if (!errors[fieldName] && !fieldTypes.booleans.includes(fieldName)) {
          errors[fieldName] = "doesn't expect a boolean value";
        }

        break;

      case 'number':
        if (!errors[fieldName] && !fieldTypes.numbers.includes(fieldName)) {
          errors[fieldName] = "doesn't expect a number value";
        }

        break;

      case 'string':
        value = value.trim();

        if (!errors[fieldName] && !fieldTypes.strings.includes(fieldName)) {
          errors[fieldName] = "doesn't expect a string value";
        }

        // Enforce specific values or formatting for certain fields
        switch (fieldName) {
          case 'category':
          case 'id': {
            const accentedChars = 'àáâãäåòóôõöőøèéêëçðìíîïùúûüűñšÿýž';
            const replacedChars = 'aaaaaaoooooooeeeecdiiiiuuuuunsyyz';

            value = value
              .toLowerCase()
              .replace(/[^\da-z]/g, (char) => {
                const accentIndex = accentedChars.indexOf(char);
                return replacedChars[accentIndex] || ' ';
              })
              .trim()
              .replace(/\s+/, '-');

            break;
          }

          case 'clickUrl':
          case 'imageUrl':
          case 'logoUrl':
            if (!errors[fieldName] && !/^https?:\/\//.test(value)) {
              errors[fieldName] = 'should be a URL and begin with \'http://\' or \'https://\'';
            }

            break;

          case 'expiresOn':
            if (!errors[fieldName] && new Date(value).toString() === 'Invalid Date') {
              errors[fieldName] = 'should be an ISO 8601 formatted datetime string';
            }

            break;

          case 'type':
            if (!errors[fieldName] && !['propInBasket', 'propPurchased', 'propSeen'].includes(value)) {
              errors[fieldName] = "should be 'propSeen', 'propInBasket', or 'propPurchased'";
            }

            break;

          default:
            break;
        }

        break;

      case 'undefined':
        if (!config.optionalFields.includes(fieldName) && !errors[fieldName]) {
          errors[fieldName] = 'is undefined';
        }

        break;

      default:
        if (!errors[fieldName]) {
          errors[fieldName] = `can't be of type ${typeof value}`;
        }

        break;
    }

    return value;
  };

  // Main scrape action
  const scrape = (input, callback) => {
    result = {};
    errors = {};

    // Merge and test configuration
    if (input.config) {
      Object.assign(config, input.config);

      if (config.testUrl && config.testUrl.test && !config.testUrl.test(window.location.href)) {
        if (config.debug) {
          logError('The URL', `doesn't match '${config.testUrl.toString()}'`);
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

    // Remove empty fields (required for fields like logoUrl)
    Object.keys(result).forEach((fieldName) => {
      if (result[fieldName] === undefined || result[fieldName] === '') {
        delete result[fieldName];

        if (!errors[fieldName] && !config.optionalFields.includes(fieldName)) {
          errors[fieldName] = 'is empty';
        }
      }
    });

    // Change required fields for 'propInBasket' and 'propPurchased'
    if (['propInBasket', 'propPurchased'].includes(result.type)) {
      fieldTypes.required = ['id', 'advertiserId', 'dynamicInputId'];
    }

    // Check for missing required fields
    fieldTypes.required.forEach((fieldName) => {
      if (!errors[fieldName] && !Object.keys(result).includes(fieldName)) {
        errors[fieldName] = 'is required and missing';
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

      // If the 'clickUrl' field is omitted, use the current URL without query parameters or hash
      if (!result.clickUrl) {
        result.clickUrl = getUrl();
      }

      if (config.debug) {
        // Show errors, if any
        Object.keys(errors).forEach((key) => {
          logError(key, errors[key]);
        });

        if (!callback) {
          // Show the result object
          console.log('%cSLP', consoleStyling, 'Result:', result);
        }
      }

      if (!Object.keys(errors).length) {
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

  // Disable overwriting when the SLP is loaded multiple times
  window.slp = window.slp || {
    getUrlQueryParameter,
    getUrlPathSegment,
    generateHash,
    getUrl,
    scrape,
  };
}());
