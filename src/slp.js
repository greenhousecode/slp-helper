window.lemonpi = window.lemonpi || [];

(function () {
  const consoleStyling = 'padding:1px 6px 0;border-radius:2px;background:#fbde00;color:#444;';
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
      'dynamicInputId',
      'imageUrl',
      'title',
    ],
  };
  const fieldNames = fieldTypes.booleans.concat(fieldTypes.numbers, fieldTypes.strings);
  const config = {
    debug: /lemonpi_debug/.test(window.location.href),
    optionalFields: [],
    interval: 500,
  };
  let result;
  let errors;
  let pointerCoords;
  let lastScrapedHash;
  let interactedStateHash;

  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  const generateHash = (...args) => {
    const string = JSON.stringify(args);
    let hash = 0;
    let chr;

    for (let i = 0; i < string.length; i += 1) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr; // eslint-disable-line no-bitwise
      hash |= 0; // eslint-disable-line no-bitwise
    }

    return hash.toString();
  };

  // Returns wether or not the user has interacted (srolled or moved mouse) since the last time this
  // function was called
  const getUserInteracted = () => {
    const scrollCoords = document.body.getBoundingClientRect();
    const newInteractedStateHash = generateHash(scrollCoords, pointerCoords);

    if (interactedStateHash !== newInteractedStateHash) {
      interactedStateHash = newInteractedStateHash;
      return true;
    }

    return false;
  };

  const getBackgroundImageUrl = (elementOrSelector) => {
    let element = elementOrSelector;

    if (typeof elementOrSelector === 'string') {
      element = document.querySelector(elementOrSelector);
    }

    if (!element) {
      return undefined;
    }

    const backgroundImage = window.getComputedStyle(element)
      .getPropertyValue('background-image')
      .replace(/url\(['"]?|['"]?\)/g, '');

    return backgroundImage === 'none' ? undefined : backgroundImage;
  };

  // In debug mode, log errors to the console
  const logError = (subject, message) => {
    console.log(`%cSLP%c ${subject}%c ${message}`, consoleStyling, 'color:red;font-weight:bold;', 'color:red;');
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
        // Clear (multiple) whitespaces, tab characters, newline returns, etc.
        value = value.replace(/\s+/g, ' ').trim();

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
              .replace(/\s+/g, '-');

            break;
          }

          case 'clickUrl':
          case 'imageUrl':
          case 'logoUrl':
            if (!errors[fieldName] && !/^https?:\/\//.test(value)) {
              errors[fieldName] = "should be a URL and start with 'http://' or 'https://'";
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
      // Use a longer default interval time when longestViewed is active
      if (input.config.longestViewed) {
        config.interval = 5000;
      }

      Object.assign(config, input.config);

      if (config.testUrl && config.testUrl.test && !config.testUrl.test(window.location.href)) {
        if (config.debug) {
          logError('The URL', `doesn't match '${config.testUrl.toString()}'`);
        }

        return;
      }

      // Store the cursor position to determine user interaction
      if (config.longestViewed) {
        document.addEventListener('mousemove', (event) => {
          pointerCoords = [event.pageX, event.pageY];
        });
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

    // Only perform actions when there's new data to be scraped, or longestViewed is used
    if (hashedResult !== lastScrapedHash || (config.longestViewed && getUserInteracted())) {
      lastScrapedHash = hashedResult;

      // Use the propSeen type as default
      if (!result.type) {
        result.type = 'propSeen';
      }

      if (result.type === 'propSeen') {
        // If the 'id' field is omitted, use a generated hash based on the whole result object
        if (!result.id) {
          result.id = hashedResult;
        }

        // Since category is a required field, but often not used, return a default "none" value
        if (!result.category) {
          result.category = 'none';
        }

        // Since available is a required field, but often not used, return a default "none" value
        if (typeof result.available === 'undefined') {
          result.available = true;
        }

        // If the 'clickUrl' field is omitted, use the current URL without query parameters or hash
        if (!result.clickUrl) {
          result.clickUrl = getUrl();
        }
      }

      if (config.debug) {
        // Show errors, if any
        Object.keys(errors).forEach((key) => {
          logError(key, errors[key]);
        });
      }

      if (!Object.keys(errors).length) {
        if (config.debug) {
          console.log('%cSLP%c Scrape successful:', consoleStyling, 'color:green;', result);
        }

        if (callback) {
          // Execute an optional callback function instead of pushing straight to LemonPI
          callback(result);
        } else {
          window.lemonpi.push(result);
        }

        if (!config.watchChanges && !config.longestViewed) {
          // Stop watching after one successful scrape
          return;
        }
      } else if (config.debug) {
        console.log('%cSLP%c Scrape unsuccessful:', consoleStyling, 'color:red;', result);
      }
    }

    // Monitor any changes by calling itself again
    setTimeout(() => {
      scrape(input);
    }, config.interval);
  };

  // Disable overwriting when the SLP is loaded multiple times
  window.slp = window.slp || {
    getBackgroundImageUrl,
    getUrlQueryParameter,
    getUrlPathSegment,
    generateHash,
    getUrl,
    scrape,
  };
}());
