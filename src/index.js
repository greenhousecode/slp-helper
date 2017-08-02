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
    optionalFields: [],
    scrapeOnce: false,
    testUrl: /./,
    timeout: 500,
    debug: /lemonpi_debug/.test(location.href),
  };
  let result;
  let errors;
  let errorFieldNames = [];
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

  // Merges and tests configuration
  const handleConfig = (userConfig) => {
    Object.assign(config, userConfig);

    if (config.testUrl && config.testUrl.test && !config.testUrl.test(location.href)) {
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

  // Parses and returns shorthand objects
  const handleObject = (obj) => {
    let objResult;

    switch (obj.type) {
      case 'url': {
        let url = `${location.protocol}//${location.host}${location.pathname}`;

        if (obj.allowedParameters && obj.allowedParameters.length) {
          url += obj.allowedParameters.reduce((newUrl, parameter, index) => {
            const separator = index === 0 ? '?' : '&';
            const key = encodeURI(parameter);
            const value = encodeURI(getUrlQuery(parameter));
            return `${newUrl}${separator}${key}=${value}`;
          });
        }

        if (obj.customParameters) {
          const parameters = Object.keys(obj.customParameters);
          parameters.forEach((parameter, index) => {
            const separator = !obj.allowedParameters.length && index === 0 ? '?' : '&';
            const key = encodeURI(parameter);
            const value = encodeURI(obj.customParameters[parameter]);
            url += `${url}${separator}${key}=${value}`;
          });
        }

        if (obj.hash) {
          url += location.hash;
        }

        objResult = url;
        break;
      }

      default:
        break;
    }

    return objResult;
  };

  // Checks, sanitizes and returns allowed values for allowed fields
  const getValue = (fieldName, fieldValue) => {
    let value = fieldValue;

    if (typeof value === 'function') {
      value = handleFunction(fieldName, value);
    } else if (typeof value === 'object' && value !== null && value.type) {
      value = handleObject(value);
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

    // Generate a unique ID based the result values
    if (!result.id) {
      result.id = hashString(JSON.stringify(result));
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
      // Check for missing required fields
      fieldTypes.required.forEach((fieldName) => {
        if (!Object.keys(result).includes(fieldName) && !errorFieldNames.includes(fieldName)) {
          errors.push(`'${fieldName}' is required and missing`);
          errorFieldNames.push(fieldName);
        }
      });
    }

    // Only perform actions when there's new data to be scraped
    if (result.id !== lastScrapedId) {
      lastScrapedId = result.id;

      // No errors found; push the result object to LemonPI
      if (!errors.length) {
        // window.lemonpi.push(result);
        console.log(result);

        // Execute callback with the result object
        if (cb) {
          cb(result);
        }

        if (config.debug) {
          console.log(
            '%cSLP%c Push successful!',
            'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444',
            'color: green'
          );
        }

        if (config.scrapeOnce) {
          return;
        }
      } else if (config.debug) {
        errors.forEach((error) => {
          console.log(
            `%cSLP%c ${error}`,
            'padding: 1px 6px 0; border-radius: 2px; background: #fbde00; color: #444',
            'color: red'
          );
        });
      }
    }

    // Monitor any changes by calling itself again
    setTimeout(() => {
      scrape(input);
    }, config.timeout);
  };

  window.slp = {
    getUrlPath,
    getUrlQuery,
    getText,
    scrape,
  };
}());
