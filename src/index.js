/*! @bluemango/slp-helper - v1.0.0 - 2017-08-01 */

window.lemonpi = window.lemonpi || [];

(function () {
  let result;
  let errors;
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

  const testGlobalVariable = (variableString) => {
    try {
      if (typeof eval(`window.${variableString}`) !== 'undefined') {
        return true;
      }
    } catch (e) {} // eslint-disable-line no-empty

    return false;
  };

  // Returns an array of URL path values, e.g. "example.com/foo/bar" > ['foo', 'bar']
  const urlPath = location.pathname
    .split('/')
    .filter(dir => dir)
    .map(dir => decodeURI(dir));

  // Returns an object of query parameters, e.g. "example.com/?foo=bar" > { foo: 'bar' }
  const urlQuery = location.search
    .replace(/^\?/, '')
    .split('&')
    .filter(parameter => parameter)
    .reduce((queries, parameter) =>
      Object.assign(queries, {
        [decodeURI(parameter.split('=')[0])]: decodeURI(parameter.split('=')[1]),
      }), {});

  const text = (selector, optional) => {
    const required = optional !== undefined ? !optional : true;
    const element = window.top.document.querySelector(selector);
    const textContent = (element && element.textContent && element.textContent.trim())
      ? element.textContent.trim()
      : undefined;

    if (!textContent && required) {
      errors.push(`The element "${selector}" is missing or empty`);
    }

    return textContent;
  };

  const handleTest = (test) => {
    if (test.url && test.url.test) {
      if (!test.url.test(location.href)) {
        errors.push('The URL doesn\'t match the requirements');
      }
    }
  };

  const handleObject = (obj) => {
    switch (obj.type) {
      case 'urlPath':
        return urlPath[obj.index];

      case 'urlQuery':
        return urlQuery[obj.key];

      case 'image': {
        const element = window.top.document.querySelector(obj.selector);
        return (element && element.src)
          ? element.src
          : undefined;
      }

      case 'backgroundImage': {
        const element = window.top.document.querySelector(obj.selector);

        if (element) {
          return window.getComputedStyle(element).getPropertyValue('background-image')
            .replace(/url\(['"]?|['"]?\)/g, '');
        }

        return undefined;
      }

      case 'text': {
        const string = text(obj.selector);

        if (!string && !obj.optional) {
          errors.push(`The element "${obj.selector}" doesn't contain text`);
        }

        return string;
      }

      case 'url': {
        let url = `${location.protocol}//${location.host}${location.pathname}`;

        if (obj.queryParameters && obj.queryParameters.length) {
          url += obj.queryParameters.reduce((newUrl, parameter, index) => {
            const key = encodeURI(parameter);
            const value = encodeURI(urlQuery[parameter]);
            return `${newUrl}${(index > 0 ? '&' : '?')}${key}=${value}`;
          });
        }

        if (obj.customQueryParameters) {
          const parameters = Object.keys(obj.customQueryParameters);

          parameters.forEach((parameter, index) => {
            url += `${url}${(index > 0 ? '&' : '?')}${parameter}=${urlQuery[parameter]}`;
            // TODO
          });
        }

        if (obj.hash) {
          url += location.hash;
        }

        return url;
      }

      default:
        return undefined;
    }
  };

  const handleValue = (key, value) => {
    let newValue = value;

    if (typeof newValue === 'function') {
      newValue = newValue();
    } else if (typeof newValue === 'object') {
      newValue = handleObject(newValue);
    }

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

  const push = (obj) => {
    result = {};
    errors = [];

    // Make sure all the test object prerequisites are met
    if (obj.test) {
      handleTest(obj.test);
    }

    if (!errors.length) {
      // Add result values for valid fields
      Object.keys(obj).forEach((key) => {
        if (fields.includes(key)) {
          handleValue(key, obj[key]);
        }
      });
    }

    // Remove empty fields
    Object.keys(result).forEach((field) => {
      if (result[field] === undefined || result[field] === '') {
        delete result[field];

        // Check for required fields
        if (fieldProperties.required.contains(field)) {
          errors.push(`"${field}" is required and can't be empty`);
        }
      }
    });

    // No errors found; return and push the result object to LemonPI
    if (!errors.length) {
      // TODO: uncomment
      // window.lemonpi.push(result);
      console.log(result);
      return result;
    }

    // If there are errors and "lemonpi_debug" is found in the URL, log them to the console
    if (/lemonpi_debug/.test(location.href)) {
      errors.forEach((error) => {
        console.error(error);
      });
    }

    return false;
  };

  window.slp = {
    urlPath,
    urlQuery,
    text,
    push,
  };
}());
