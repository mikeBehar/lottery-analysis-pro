/**
 * Non-blocking notification system to replace alert()
 * Creates toast-style notifications with auto-dismiss
 */

let notificationContainer = null;

/**
 * Initialize notification container
 */
function initNotifications() {
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
}

/**
 * Show notification with auto-dismiss
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type: 'error', 'success', 'warning', 'info'
 * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 */
export function showNotification(title, message, type = 'info', duration = 5000) {
  initNotifications();

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-title">${escapeHtml(title)}</div>
      <div class="notification-message">${escapeHtml(message)}</div>
    </div>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;

  // Add close functionality
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    removeNotification(notification);
  });

  // Add to container with slide-in animation
  notificationContainer.appendChild(notification);
  setTimeout(() => notification.classList.add('notification-show'), 10);

  // Auto-dismiss if duration > 0
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }

  return notification;
}

/**
 * Remove notification with slide-out animation
 */
function removeNotification(notification) {
  notification.classList.add('notification-hide');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/**
 * Show error notification
 */
export function showError(title, message) {
  return showNotification(title, message, 'error', 8000);
}

/**
 * Show success notification
 */
export function showSuccess(title, message) {
  return showNotification(title, message, 'success', 4000);
}

/**
 * Show warning notification
 */
export function showWarning(title, message) {
  return showNotification(title, message, 'warning', 6000);
}

/**
 * Show info notification
 */
export function showInfo(title, message) {
  return showNotification(title, message, 'info', 5000);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  if (notificationContainer) {
    const notifications = notificationContainer.querySelectorAll('.notification');
    notifications.forEach(removeNotification);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-initialize when module loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initNotifications);
}