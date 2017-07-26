window.lemonpi = window.lemonpi || [];

(function () {
  let result;
  let errors;
  const fields = ['type', 'advertiserId', 'dynamicInputId', 'id', 'available', 'category', 'title',
    'clickUrl', 'imageUrl', 'expiresOn', 'description', 'priceNormal', 'priceDiscount', 'logoUrl',
    'stickerText', 'custom1', 'custom2', 'custom3', 'custom4'];

  // const log = (type, message) => {
  //   if (/lemonpi_debug/.test(location.href)) {
  //     console[type](message);
  //   }
  // };

  const pathArray = location.pathname
    .split('/')
    .filter(dir => dir)
    .map(dir => decodeURI(dir));

  const queryObject = location.search
    .replace(/^\?/, '')
    .split('&')
    .filter(parameter => parameter)
    .reduce((queries, parameter) =>
      Object.assign(queries, { [parameter.split('=')[0]]: parameter.split('=')[1] }), {});

  const text = (selector) => {
    const element = document.querySelector(selector);
    return (element && element.textContent && element.textContent.trim())
      ? element.textContent.trim()
      : undefined;
  };

  const testUrl = regex => regex.test(`${location.protocol}//${location.host}${location.pathname}`);

  const testGlobalVariable = (variable) => {
    try {
      if (typeof eval(variable) !== 'undefined') {
        return true;
      }
    } catch (e) {} // eslint-disable-line no-empty

    return false;
  };

  const handleTest = (test) => {
    if (test.url) {
      if (!testUrl(test.url)) {
        errors.push('The URL doesn\'t match the requirements');
      }
    }

    if (test.variables && test.variables.length) {
      test.variables.forEach((variable) => {
        if (!testGlobalVariable(variable)) {
          errors.push(`The variable "${variable}" doesn't exist`);
        }
      });
    }
  };

  const handleObject = (obj) => {
    switch (obj.type) {
      case 'text':
        return text(obj.selector);

      case 'pathArray':
        return pathArray[obj.index];

      case 'queryObject':
        return queryObject[obj.key];

      case 'url': {
        let url = `${location.protocol}//${location.host}${location.pathname}`;

        if (obj.queryParameters && obj.queryParameters.length) {
          url += obj.queryParameters.reduce((newUrl, parameter, index) => {
            return `${newUrl}${(index > 0 ? '&' : '?')}${parameter}=${queryObject[parameter]}`;
          });
        }

        if (obj.customQueryParameters) {
          const parameters = Object.keys(obj.customQueryParameters);

          parameters.forEach((parameter, index) => {
            url += `${url}${(index > 0 ? '&' : '?')}${parameter}=${queryObject[parameter]}`;
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

  const handleField = (key, value) => {
    let newValue = value;

    if (typeof value === 'object') {
      newValue = handleObject(value);
    }

    switch (typeof newValue) {
      case 'boolean':
        if (key === 'available') {
          result.available = value;
        }
        break;

      case 'number':
        if (['advertiserId', 'dynamicInputId'].includes(key)) {
          result[key] = value;
        }
        break;

      case 'string':
        break;

      default:
        break;
    }
  };

  const push = (obj) => {
    result = {};
    errors = [];

    for (const key of Object.keys(obj)) {
      if (key === 'test') {
        handleTest(obj.test);
      } else if (fields.includes(key)) {
        handleField(key, obj[key]);
      }
    }

    if (errors.length === 0) {
      // window.lemonpi.push(result);
      return result;
    }

    return null;
  };

  window.SLP = {
    pathArray,
    queryObject,
    text,
    push,
  };
}());
