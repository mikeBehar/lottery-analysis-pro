/**
 * Secure DOM manipulation helpers to replace innerHTML usage
 * Provides safe alternatives to innerHTML that prevent XSS attacks
 */

/**
 * Safely create element with text content
 * @param {string} tag - HTML tag name
 * @param {string} textContent - Text content (will be escaped)
 * @param {Object} attributes - Element attributes
 * @param {string|Array} className - CSS class name(s)
 * @returns {HTMLElement}
 */
export function createElement(tag, textContent = '', attributes = {}, className = '') {
  const element = document.createElement(tag);
  
  if (textContent) {
    element.textContent = textContent;
  }
  
  if (className) {
    if (Array.isArray(className)) {
      element.classList.add(...className);
    } else {
      element.className = className;
    }
  }
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key.startsWith('data-') || ['id', 'role', 'aria-label', 'title'].includes(key)) {
      element.setAttribute(key, value);
    }
  });
  
  return element;
}

/**
 * Safely clear and populate container with new content
 * @param {HTMLElement} container - Container element
 * @param {HTMLElement|HTMLElement[]} content - Content to add
 */
export function setContent(container, content) {
  // Clear existing content
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  // Add new content
  if (Array.isArray(content)) {
    content.forEach(element => {
      if (element instanceof HTMLElement) {
        container.appendChild(element);
      }
    });
  } else if (content instanceof HTMLElement) {
    container.appendChild(content);
  }
}

/**
 * Create number display element with proper styling
 * @param {number} number - Number to display
 * @param {string} type - Number type for styling ('high-confidence', 'energy-based', etc.)
 * @returns {HTMLElement}
 */
export function createNumberElement(number, type = 'number') {
  const span = createElement('span', number.toString(), {}, `number ${type}`);
  return span;
}

/**
 * Create grid of number elements
 * @param {Array} numbers - Array of numbers
 * @param {string} type - Number type for styling
 * @returns {HTMLElement}
 */
export function createNumberGrid(numbers, type = 'number') {
  const grid = createElement('div', '', {}, 'number-grid');
  
  if (!numbers || numbers.length === 0) {
    const noData = createElement('span', 'No data available', {}, 'no-data');
    grid.appendChild(noData);
    return grid;
  }
  
  numbers.forEach(num => {
    const numberElement = createNumberElement(num, type);
    grid.appendChild(numberElement);
  });
  
  return grid;
}

/**
 * Create list element with items
 * @param {Array} items - Array of items (strings or objects with text/value)
 * @param {string} listType - 'ul' or 'ol'
 * @returns {HTMLElement}
 */
export function createList(items, listType = 'ul') {
  const list = createElement(listType);
  
  items.forEach(item => {
    const li = createElement('li');
    if (typeof item === 'string') {
      li.textContent = item;
    } else if (item.text) {
      li.textContent = item.text;
    }
    list.appendChild(li);
  });
  
  return list;
}

/**
 * Create section with title and content
 * @param {string} title - Section title
 * @param {HTMLElement|HTMLElement[]} content - Section content
 * @param {string} className - Additional CSS class
 * @returns {HTMLElement}
 */
export function createSection(title, content, className = '') {
  const section = createElement('div', '', {}, `section ${className}`);
  const titleElement = createElement('h3', title);
  
  section.appendChild(titleElement);
  
  if (Array.isArray(content)) {
    content.forEach(element => {
      if (element instanceof HTMLElement) {
        section.appendChild(element);
      }
    });
  } else if (content instanceof HTMLElement) {
    section.appendChild(content);
  }
  
  return section;
}

/**
 * Create metric card for displaying statistics
 * @param {string} title - Metric title
 * @param {string} value - Metric value
 * @param {string} description - Description text
 * @returns {HTMLElement}
 */
export function createMetricCard(title, value, description = '') {
  const card = createElement('div', '', {}, 'metric-card');
  
  const titleEl = createElement('h4', title);
  const valueEl = createElement('div', value, {}, 'metric-value');
  
  card.appendChild(titleEl);
  card.appendChild(valueEl);
  
  if (description) {
    const descEl = createElement('p', description);
    card.appendChild(descEl);
  }
  
  return card;
}

/**
 * Escape HTML to prevent XSS (for cases where innerHTML is absolutely necessary)
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}