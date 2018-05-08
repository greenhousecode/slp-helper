window.lemonpi = window.lemonpi || [];

(function () {
  const consoleStyling = 'padding:1px 6px 0;border-radius:2px;background:#fbde00;color:#444';
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
  const defaultConfig = {
    debug: /lemonpi_debug/.test(window.location.href),
    optionalFields: [],
    interval: 500,
  };

  // Create a unique hash based on any argument(s) input
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

  // Cross-browser background image URL retrieval
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
    console.log(`%cSLP%c ${subject}%c ${message}`, consoleStyling, 'color:red;font-weight:bold', 'color:red');
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

  const SLPHelper = function (input, callback) {
    this.config = Object.assign({}, defaultConfig);
    this.input = input;
    this.callback = callback;
    this.result = {};
    this.errors = [];
    this.pointerCoords = [];
    this.lastScrapedHash = '';
    this.interactedStateHash = '';

    // Returns wether or not the user has interacted (srolled or moved mouse) since the last time
    // this function was called
    this.getUserInteracted = () => {
      const scrollCoords = document.body.getBoundingClientRect();
      const newInteractedStateHash = generateHash(scrollCoords, this.pointerCoords);

      if (this.interactedStateHash !== newInteractedStateHash) {
        this.interactedStateHash = newInteractedStateHash;
        return true;
      }

      return false;
    };

    // Evaluates and returns the callback result within a try-catch
    this.handleFunction = (fieldName, func) => {
      let funcResult;

      try {
        funcResult = func();
      } catch (e) {
        if (!this.errors[fieldName] && !this.config.optionalFields.includes(fieldName)) {
          this.errors[fieldName] = e.message;
        }
      }

      return funcResult;
    };

    // Checks, sanitizes and returns allowed values for allowed fields
    this.getValue = (fieldName, fieldValue) => {
      let value = fieldValue;

      if (typeof value === 'function') {
        value = this.handleFunction(fieldName, value);
      }

      switch (typeof value) {
        case 'boolean':
          if (!this.errors[fieldName] && !fieldTypes.booleans.includes(fieldName)) {
            this.errors[fieldName] = "doesn't expect a boolean value";
          }

          break;

        case 'number':
          if (!this.errors[fieldName] && !fieldTypes.numbers.includes(fieldName)) {
            this.errors[fieldName] = "doesn't expect a number value";
          }

          break;

        case 'string':
          // Clear (multiple) whitespaces, tab characters, newline returns, etc.
          value = value.replace(/\s+/g, ' ').trim();

          if (!this.errors[fieldName] && !fieldTypes.strings.includes(fieldName)) {
            this.errors[fieldName] = "doesn't expect a string value";
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
              if (!this.errors[fieldName] && !/^https?:\/\//.test(value)) {
                this.errors[fieldName] = "should be a URL and start with 'http://' or 'https://'";
              }

              break;

            case 'expiresOn':
              if (!this.errors[fieldName] && new Date(value).toString() === 'Invalid Date') {
                this.errors[fieldName] = 'should be an ISO 8601 formatted datetime string';
              }

              break;

            case 'type':
              if (!this.errors[fieldName] && !['propInBasket', 'propPurchased', 'propSeen'].includes(value)) {
                this.errors[fieldName] = "should be 'propSeen', 'propInBasket', or 'propPurchased'";
              }

              break;

            default:
              break;
          }

          break;

        case 'undefined':
          if (!this.config.optionalFields.includes(fieldName) && !this.errors[fieldName]) {
            this.errors[fieldName] = 'is undefined';
          }

          break;

        default:
          if (!this.errors[fieldName]) {
            this.errors[fieldName] = `can't be of type ${typeof value}`;
          }

          break;
      }

      return value;
    };

    // Main scrape action
    this.scrape = () => {
      // Wipe any previous state
      this.result = {};
      this.errors = {};

      // Add result values for valid fields
      Object.keys(this.input).forEach((fieldName) => {
        if (fieldNames.includes(fieldName)) {
          this.result[fieldName] = this.getValue(fieldName, this.input[fieldName]);
        }
      });

      // Remove empty fields (required for fields like logoUrl)
      Object.keys(this.result).forEach((fieldName) => {
        if (this.result[fieldName] === undefined || this.result[fieldName] === '') {
          delete this.result[fieldName];

          if (!this.errors[fieldName] && !this.config.optionalFields.includes(fieldName)) {
            this.errors[fieldName] = 'is empty';
          }
        }
      });

      // Change required fields for 'propInBasket' and 'propPurchased'
      if (['propInBasket', 'propPurchased'].includes(this.result.type)) {
        fieldTypes.required = ['id', 'advertiserId', 'dynamicInputId'];
      }

      // Check for missing required fields
      fieldTypes.required.forEach((fieldName) => {
        if (!this.errors[fieldName] && !Object.keys(this.result).includes(fieldName)) {
          this.errors[fieldName] = 'is required and missing';
        }
      });

      const hashedResult = generateHash(this.result);

      // Only perform action when there's new data to be scraped, or longestViewed is used
      if (hashedResult !== this.lastScrapedHash
        || (this.config.longestViewed && this.getUserInteracted())) {
        this.lastScrapedHash = hashedResult;

        // Use the propSeen type as default
        if (!this.result.type) {
          this.result.type = 'propSeen';
        }

        if (this.result.type === 'propSeen') {
          // If the 'id' field is omitted, use a generated hash based on the whole result object
          if (!this.result.id) {
            this.result.id = hashedResult;
          }

          // Since category is a required field, but often not used, return a default "none" value
          if (!this.result.category) {
            this.result.category = 'none';
          }

          // Since available is a required field, but often not used, return a default "none" value
          if (typeof this.result.available === 'undefined') {
            this.result.available = true;
          }

          // If 'clickUrl' field is omitted, use the current URL without query parameters or hash
          if (!this.result.clickUrl) {
            this.result.clickUrl = getUrl();
          }
        }

        if (this.config.debug) {
          // Show errors, if any
          Object.keys(this.errors).forEach((key) => {
            logError(key, this.errors[key]);
          });
        }

        if (!Object.keys(this.errors).length) {
          if (this.config.debug) {
            console.log('%cSLP%c Scrape successful:', consoleStyling, 'color:green', this.result);
          }

          if (this.callback) {
            // Execute an optional callback function, instead of pushing straight to LemonPI
            this.callback(this.result);
          } else {
            window.lemonpi.push(this.result);
          }

          if (!this.config.watchChanges && !this.config.longestViewed) {
            // Stop watching after one successful scrape
            return;
          }
        } else if (this.config.debug) {
          console.log('%cSLP%c Scrape unsuccessful:', consoleStyling, 'color:red', this.result);
        }
      }

      // Monitor any changes by calling itself again
      setTimeout(() => {
        this.scrape();
      }, this.config.interval);
    };

    // Handle initial configuration
    if (this.input.config) {
      if (this.input.config.longestViewed) {
        // Use a longer default interval time when longestViewed is active
        this.config.interval = 5000;

        // Store cursor position to determine user interaction
        document.addEventListener('mousemove', (event) => {
          this.pointerCoords = [event.pageX, event.pageY];
        });
      }

      // Overwrite and extend default config with user config
      Object.assign(this.config, this.input.config);

      // Test the URL for admittance
      if (this.config.testUrl
        && this.config.testUrl.test
        && !this.config.testUrl.test(window.location.href)) {
        if (this.config.debug) {
          logError('The URL', `doesn't match '${this.config.testUrl.toString()}'`);
        }

        return;
      }
    }

    // Init
    this.scrape();
  };

  // Disable overwriting when the SLP is loaded multiple times
  window.slp = window.slp || {
    getBackgroundImageUrl,
    getUrlQueryParameter,
    getUrlPathSegment,
    generateHash,
    getUrl,
    scrape: (...args) => new SLPHelper(...args),
  };
}());
